import '@tanstack/react-start/server-only'
import { createHash } from 'node:crypto'
import BigNumber from 'bignumber.js'
import { and, eq } from 'drizzle-orm'
import { db } from '../../db/client'
import {
  financialGoals,
  financialProfiles,
  goalCompletionWithdrawals,
} from '../../db/schema'
import { calculateSavingsPlacesWorkspace } from '../savings-places/savings-places'
import { lockOwnedSavingsPlaces } from '../savings-places/savings-places.repository.server'
import {
  buildGoalCompletionProposal,
  serializeGoalCompletionState,
  type GoalCompletionDraft,
  type GoalCompletionProposal,
  type GoalCompletionPreviewResult,
  type GoalCompletionState,
} from './goal-completion'
import {
  getGoalLifecycleStateWithExecutor,
  persistGoalAllocationPlan,
} from './goals.repository.server'

export class StaleGoalCompletionPreviewError extends Error {
  // fallow-ignore-next-line unused-class-member -- public contract member asserted by tests
  readonly code = 'STALE_GOAL_COMPLETION_PREVIEW'

  constructor(readonly refreshedPreview: GoalCompletionPreviewResult) {
    super('Tu Plan cambió mientras revisabas el impacto.')
  }
}

export class GoalCompletionStateInvalidError extends Error {
  // fallow-ignore-next-line unused-class-member -- public contract member asserted by tests
  readonly code = 'INVALID_GOAL_COMPLETION_STATE'

  constructor() {
    super('No se puede completar el objetivo con el estado actual.')
  }
}

async function loadCompletionSources(executor: any, userId: string) {
  return Promise.all([
    executor.query.savingsPlaces.findMany({
      where: (table: any, { eq }: any) => eq(table.userId, userId),
    }),
    executor.query.savingContributions.findMany({
      where: (table: any, { eq }: any) => eq(table.userId, userId),
    }),
    executor.query.savingsPlaceTransfers.findMany({
      where: (table: any, { eq }: any) => eq(table.userId, userId),
    }),
  ])
}

function normalizeCompletionWithdrawals(
  rows: any[],
  places: any[],
  goals: GoalCompletionState['source']['goals'],
) {
  const placeMap = new Map(places.map((place) => [place.id, place.name]))
  const goalMap = new Map(goals.map((goal) => [goal.id, goal.name]))
  return rows
    .filter((withdrawal) => placeMap.has(withdrawal.placeId) && goalMap.has(withdrawal.goalId))
    .map((withdrawal) => ({
      id: withdrawal.id,
      goalId: withdrawal.goalId,
      placeId: withdrawal.placeId,
      placeName: placeMap.get(withdrawal.placeId)!,
      amount: withdrawal.amount,
      currency: withdrawal.currency,
      createdAt: withdrawal.createdAt instanceof Date
        ? withdrawal.createdAt.toISOString()
        : String(withdrawal.createdAt),
    }))
}

function mapCompletionTransfers(transfers: any[], places: any[]) {
  const placeMap = new Map(places.map((place) => [place.id, place.name]))
  return transfers.map((transfer) => ({
    ...transfer,
    fromPlaceName: placeMap.get(transfer.fromPlaceId) ?? '',
    toPlaceName: placeMap.get(transfer.toPlaceId) ?? '',
  }))
}

function mapPositiveCompletionPlaces(workspace: any, goal: GoalCompletionState['source']['goals'][number]) {
  const currency = goal.currency as 'ARS' | 'USD'
  return workspace.places
    .filter((place: any) =>
      place.balances[currency] !== undefined && new BigNumber(place.balances[currency]).isGreaterThan(0),
    )
    .map((place: any) => ({
      id: place.id,
      name: place.name,
      balance: { amount: place.balances[currency], currency },
  }))
}

async function loadCompletionWithdrawals(
  executor: any,
  placeIds: string[],
  goalIds: string[],
) {
  if (placeIds.length === 0 || goalIds.length === 0) return []
  return executor.query.goalCompletionWithdrawals.findMany({
    where: (table: any, { and, inArray }: any) =>
      and(inArray(table.placeId, placeIds), inArray(table.goalId, goalIds)),
  })
}

async function getGoalCompletionStateWithExecutor(
  executor: any,
  userId: string,
  currentMonth: string,
  goalId: string,
): Promise<GoalCompletionState | null> {
  const lifecycleState = await getGoalLifecycleStateWithExecutor(executor, userId, currentMonth)
  if (!lifecycleState) return null
  const goal = lifecycleState.source.goals.find((candidate) => candidate.id === goalId)
  if (!goal) throw new Error('Objetivo no encontrado.')

  const [places, contributions, transfers] = await loadCompletionSources(executor, userId)
  const goalIds = lifecycleState.source.goals.map((candidate) => candidate.id)
  const placeIds = places.map((place: any) => place.id)
  const completionRows = await loadCompletionWithdrawals(executor, placeIds, goalIds)
  const completionWithdrawals = normalizeCompletionWithdrawals(
    completionRows,
    places,
    lifecycleState.source.goals,
  )
  const savingsWorkspace = calculateSavingsPlacesWorkspace({
    places,
    contributions,
    transfers: mapCompletionTransfers(transfers, places),
    completionWithdrawals: completionWithdrawals.map((withdrawal) => ({
      ...withdrawal,
      goalName: lifecycleState.source.goals.find((candidate) => candidate.id === withdrawal.goalId)!.name,
    })),
  })
  return {
    ...lifecycleState,
    source: { ...lifecycleState.source, completionWithdrawals },
    savingsPlaces: mapPositiveCompletionPlaces(savingsWorkspace, goal),
  }
}

export async function getGoalCompletionState(
  userId: string,
  currentMonth: string,
  goalId: string,
): Promise<GoalCompletionState | null> {
  return getGoalCompletionStateWithExecutor(db, userId, currentMonth, goalId)
}

export function createGoalCompletionPreviewToken(
  state: GoalCompletionState,
  currentMonth: string,
  draft: GoalCompletionDraft,
): string {
  return createHash('sha256')
    .update(serializeGoalCompletionState(state, currentMonth, draft))
    .digest('hex')
}

async function lockCompletionTargets(tx: any, userId: string, goalId: string) {
  const [profile] = await tx
    .select({
      userId: financialProfiles.userId,
      plannedMonthlyContribution: financialProfiles.plannedMonthlyContribution,
    })
    .from(financialProfiles)
    .where(eq(financialProfiles.userId, userId))
    .for('update')
  if (!profile) throw new Error('Financial profile not found.')

  const [goal] = await tx
    .select()
    .from(financialGoals)
    .where(and(eq(financialGoals.id, goalId), eq(financialGoals.userId, userId)))
    .for('update')
  if (!goal) throw new Error('Objetivo no encontrado.')
  return profile
}

function getSelectedCompletionPlaceIds(draft: GoalCompletionDraft): string[] {
  return [...new Set(draft.withdrawals.map((withdrawal) => withdrawal.placeId))].sort()
}

function getCurrentCompletionProposal(
  state: GoalCompletionState,
  currentMonth: string,
  draft: GoalCompletionDraft,
  previewToken: string,
): GoalCompletionProposal {
  const currentToken = createGoalCompletionPreviewToken(state, currentMonth, draft)
  if (currentToken === previewToken) return buildGoalCompletionProposal({ state, currentMonth, draft })

  try {
    const proposal = buildGoalCompletionProposal({ state, currentMonth, draft })
    throw new StaleGoalCompletionPreviewError({ proposal, previewToken: currentToken })
  } catch (error) {
    if (error instanceof StaleGoalCompletionPreviewError) throw error
    throw new GoalCompletionStateInvalidError()
  }
}

async function insertCompletionWithdrawals(
  tx: any,
  proposal: GoalCompletionProposal,
  completedAt: Date,
): Promise<void> {
  await tx.insert(goalCompletionWithdrawals).values(
    proposal.withdrawals
      .filter(({ amount }) => new BigNumber(amount.amount).isGreaterThan(0))
      .map(({ placeId, amount }) => ({
        goalId: proposal.goalId,
        placeId,
        amount: amount.amount,
        currency: amount.currency,
        createdAt: completedAt,
      })),
  )
}

async function markGoalCompleted(tx: any, userId: string, goalId: string, completedAt: Date): Promise<void> {
  const updatedGoals = await tx
    .update(financialGoals)
    .set({ status: 'completed', completedAt })
    .where(
      and(
        eq(financialGoals.id, goalId),
        eq(financialGoals.userId, userId),
        eq(financialGoals.status, 'active'),
      ),
    )
    .returning({ id: financialGoals.id })
  if (Array.isArray(updatedGoals) && updatedGoals.length === 0) {
    throw new Error('Objetivo no encontrado.')
  }
}

async function confirmGoalCompletionTransaction(
  tx: any,
  userId: string,
  currentMonth: string,
  draft: GoalCompletionDraft,
  previewToken: string,
): Promise<{ completedAt: string }> {
  const lockedProfile = await lockCompletionTargets(tx, userId, draft.goalId)
  await lockOwnedSavingsPlaces(tx, userId, getSelectedCompletionPlaceIds(draft))
  const state = await getGoalCompletionStateWithExecutor(tx, userId, currentMonth, draft.goalId)
  if (!state) throw new Error('Financial profile not found.')
  const proposal = getCurrentCompletionProposal(state, currentMonth, draft, previewToken)
  const completedAt = new Date()
  await insertCompletionWithdrawals(tx, proposal, completedAt)
  await markGoalCompleted(tx, userId, proposal.goalId, completedAt)
  await persistGoalAllocationPlan({
    tx,
    userId,
    allocation: proposal.persistedAllocation,
    plannedMonthlyContribution: lockedProfile.plannedMonthlyContribution ?? null,
    pauseMonthlyCommitment: proposal.pauseMonthlyCommitment,
  })
  return { completedAt: completedAt.toISOString() }
}

export async function confirmGoalCompletionInRepository(input: {
  userId: string
  currentMonth: string
  draft: GoalCompletionDraft
  previewToken: string
}): Promise<{ completedAt: string }> {
  return db.transaction((tx) => confirmGoalCompletionTransaction(
    tx,
    input.userId,
    input.currentMonth,
    input.draft,
    input.previewToken,
  ))
}

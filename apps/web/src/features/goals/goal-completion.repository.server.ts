import '@tanstack/react-start/server-only'
import { createHash } from 'node:crypto'
import BigNumber from 'bignumber.js'
import { and, eq } from 'drizzle-orm'
import { db } from '../../db/client'
import {
  allocationPlanEntries,
  financialGoals,
  financialProfiles,
  goalCompletionWithdrawals,
  savingsPlaces,
} from '../../db/schema'
import { calculateSavingsPlacesWorkspace } from '../savings-places/savings-places'
import {
  buildGoalCompletionProposal,
  serializeGoalCompletionState,
  type GoalCompletionDraft,
  type GoalCompletionPreviewResult,
  type GoalCompletionState,
} from './goal-completion'
import {
  getGoalLifecycleStateWithExecutor,
  replacePendingAllocationSnapshot,
} from './goals.repository.server'

export class StaleGoalCompletionPreviewError extends Error {
  readonly code = 'STALE_GOAL_COMPLETION_PREVIEW'

  constructor(readonly refreshedPreview: GoalCompletionPreviewResult) {
    super('Tu Plan cambió mientras revisabas el impacto.')
  }
}

export class GoalCompletionStateInvalidError extends Error {
  readonly code = 'INVALID_GOAL_COMPLETION_STATE'

  constructor() {
    super('No se puede completar el objetivo con el estado actual.')
  }
}

export async function getGoalCompletionStateWithExecutor(
  executor: any,
  userId: string,
  currentMonth: string,
  goalId: string,
): Promise<GoalCompletionState | null> {
  const lifecycleState = await getGoalLifecycleStateWithExecutor(executor, userId, currentMonth)
  if (!lifecycleState) return null

  const goal = lifecycleState.source.goals.find((candidate) => candidate.id === goalId)
  if (!goal) throw new Error('Objetivo no encontrado.')

  const [places, contributions, transfers] = await Promise.all([
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

  const placeIds = places.map((place: any) => place.id)
  const goalIds = lifecycleState.source.goals.map((candidate) => candidate.id)
  const completionRows =
    placeIds.length > 0 && goalIds.length > 0
      ? await executor.query.goalCompletionWithdrawals.findMany({
          where: (table: any, { and, inArray }: any) =>
            and(inArray(table.placeId, placeIds), inArray(table.goalId, goalIds)),
        })
      : []

  const placeMap = new Map(places.map((place: any) => [place.id, place.name]))
  const goalMap = new Map(lifecycleState.source.goals.map((candidate) => [candidate.id, candidate.name]))
  const normalizedCompletionWithdrawals = completionRows
    .filter((withdrawal: any) => placeMap.has(withdrawal.placeId) && goalMap.has(withdrawal.goalId))
    .map((withdrawal: any) => ({
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

  const savingsWorkspace = calculateSavingsPlacesWorkspace({
    places,
    contributions,
    transfers: transfers.map((transfer: any) => ({
      ...transfer,
      fromPlaceName: placeMap.get(transfer.fromPlaceId) ?? '',
      toPlaceName: placeMap.get(transfer.toPlaceId) ?? '',
    })),
    completionWithdrawals: normalizedCompletionWithdrawals.map((withdrawal: any) => ({
      ...withdrawal,
      goalName: goalMap.get(withdrawal.goalId)!,
      placeName: withdrawal.placeName,
    })),
  })

  return {
    ...lifecycleState,
    source: { ...lifecycleState.source, completionWithdrawals: normalizedCompletionWithdrawals },
    savingsPlaces: savingsWorkspace.places
      .filter(
        (place) =>
          place.balances[goal.currency as 'ARS' | 'USD'] !== undefined &&
          new BigNumber(place.balances[goal.currency as 'ARS' | 'USD']).isGreaterThan(0),
      )
      .map((place) => ({
        id: place.id,
        name: place.name,
        balance: {
          amount: place.balances[goal.currency as 'ARS' | 'USD'],
          currency: goal.currency as 'ARS' | 'USD',
        },
      })),
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

export async function confirmGoalCompletionInRepository(input: {
  userId: string
  currentMonth: string
  draft: GoalCompletionDraft
  previewToken: string
}): Promise<{ completedAt: string }> {
  const { userId, currentMonth, draft, previewToken } = input

  return db.transaction(async (tx) => {
    const lockedProfile = await tx
      .select({
        userId: financialProfiles.userId,
        plannedMonthlyContribution: financialProfiles.plannedMonthlyContribution,
      })
      .from(financialProfiles)
      .where(eq(financialProfiles.userId, userId))
      .for('update')

    if (!lockedProfile.length) throw new Error('Financial profile not found.')

    const [lockedGoal] = await tx
      .select()
      .from(financialGoals)
      .where(
        and(
          eq(financialGoals.id, draft.goalId),
          eq(financialGoals.userId, userId),
        ),
      )
      .for('update')
    if (!lockedGoal) throw new Error('Objetivo no encontrado.')

    const selectedPlaceIds = [...new Set(draft.withdrawals.map((withdrawal) => withdrawal.placeId))].sort()
    for (const placeId of selectedPlaceIds) {
      const [place] = await tx
        .select()
        .from(savingsPlaces)
        .where(and(eq(savingsPlaces.id, placeId), eq(savingsPlaces.userId, userId)))
        .for('update')
      if (!place) throw new Error('Lugar de ahorro no encontrado.')
    }

    const state = await getGoalCompletionStateWithExecutor(tx, userId, currentMonth, draft.goalId)
    if (!state) throw new Error('Financial profile not found.')

    const currentToken = createGoalCompletionPreviewToken(state, currentMonth, draft)
    if (currentToken !== previewToken) {
      let proposal
      try {
        proposal = buildGoalCompletionProposal({ state, currentMonth, draft })
      } catch {
        throw new GoalCompletionStateInvalidError()
      }
      throw new StaleGoalCompletionPreviewError({ proposal, previewToken: currentToken })
    }

    const proposal = buildGoalCompletionProposal({ state, currentMonth, draft })

    const completedAt = new Date()
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

    const updatedGoals = await tx
      .update(financialGoals)
      .set({ status: 'completed', completedAt })
      .where(
        and(
          eq(financialGoals.id, proposal.goalId),
          eq(financialGoals.userId, userId),
          eq(financialGoals.status, 'active'),
        ),
      )
      .returning({ id: financialGoals.id })
    if (Array.isArray(updatedGoals) && updatedGoals.length === 0) {
      throw new Error('Objetivo no encontrado.')
    }

    if (proposal.pauseMonthlyCommitment) {
      await tx
        .update(financialProfiles)
        .set({ plannedMonthlyContribution: null })
        .where(eq(financialProfiles.userId, userId))
    }

    const snapshotId = await replacePendingAllocationSnapshot(
      tx,
      userId,
      proposal.persistedAllocation,
      proposal.pauseMonthlyCommitment
        ? null
        : (lockedProfile[0]?.plannedMonthlyContribution ?? null),
    )
    await tx.delete(allocationPlanEntries).where(eq(allocationPlanEntries.snapshotId, snapshotId))
    if (proposal.persistedAllocation.entries.length > 0) {
      await tx.insert(allocationPlanEntries).values(
        proposal.persistedAllocation.entries.map(({ goalId, percentage }) => ({
          snapshotId,
          goalId,
          percentage,
        })),
      )
    }
    return { completedAt: completedAt.toISOString() }
  })
}

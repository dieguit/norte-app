import { createHash } from 'node:crypto'
import BigNumber from 'bignumber.js'
import { and, eq, gt, inArray } from 'drizzle-orm'
import type { Database } from '../database/database.types'
import { mapRowsToGoalsWorkspaceSource } from './goals.source'
import { buildGoalCreationProposal, PENDING_GOAL_ID, serializeGoalCreationState, serializeGoalEditState, type GoalCreationProposal, type GoalCreationState } from './goal-creation'
import { buildGoalLifecycleProposal, serializeGoalLifecycleState, type GoalLifecycleProposal, type GoalLifecycleState } from './goal-lifecycle'
import type { GoalLifecycle } from './goal-lifecycle.schema'
import { parseGoalCreationSubmission, type GoalCreationDraft } from '@repo/shared-types'
import { allocationPlanEntries, allocationPlanSnapshots, financialGoals, financialProfiles, goalCompletionWithdrawals, goalInvestmentPositions, savingContributions, savingsPlaceTransfers, savingsPlaces } from '../profile/profile.schema'
import { buildAllocationChangeProposal, serializeAllocationChangeState, type AllocationChangeState } from './allocation-change'
import type { AllocationChangeDraft } from './allocation-change.schema'
import { buildGoalCompletionProposal, serializeGoalCompletionState, type GoalCompletionDraft, type GoalCompletionPreviewResult, type GoalCompletionProposal, type GoalCompletionState } from './goal-completion'
import { calculateSavingsBalances } from '../finances/savings-projection'
import { lockOwnedSavingsPlaces } from '../savings-places/savings-places.data'
import { lockFinancialProfile } from '../profile/financial-profile.lock'

type Executor = any
type CreationInput = { userId: string; currentMonth: string; draft: GoalCreationDraft; previewToken: string }
type EditInput = CreationInput & { goalId: string }
type AllocationChangeInput = { userId: string; currentMonth: string; draft: AllocationChangeDraft; previewToken: string }
type GoalLifecycleDraft = { allocations?: Array<{ goalId: string; percentage: string }> }
type GoalLifecycleInput = { userId: string; goalId: string; lifecycle: GoalLifecycle; currentMonth: string; draft?: GoalLifecycleDraft; previewToken: string }

export class StaleGoalCreationPreviewError extends Error {
  constructor(readonly refreshedPreview: { proposal: GoalCreationProposal; previewToken: string }) {
    super('Tu Plan cambió mientras revisabas el impacto.')
  }
}

export class StaleGoalEditPreviewError extends Error {
  constructor(readonly refreshedPreview: { proposal: GoalCreationProposal; previewToken: string }) {
    super('Tu Plan cambió mientras revisabas el impacto.')
  }
}

export class StaleAllocationChangePreviewError extends Error {
  constructor(readonly refreshedPreview: { proposal: ReturnType<typeof buildAllocationChangeProposal>; previewToken: string }) {
    super('Tu Plan cambió mientras revisabas el impacto.')
  }
}

export class StaleGoalLifecyclePreviewError extends Error {
  constructor(readonly refreshedPreview: { proposal: GoalLifecycleProposal; previewToken: string }) {
    super('Tu Plan cambió mientras revisabas el impacto.')
  }
}

function nextMonth(month: string): string {
  const date = new Date(`${month.slice(0, 7)}-01T00:00:00Z`)
  date.setUTCMonth(date.getUTCMonth() + 1)
  return date.toISOString().slice(0, 7)
}

function winningSnapshot(snapshots: any[], month: string) {
  const eligible = snapshots.filter((row) => row.effectiveMonth.slice(0, 7) <= month).sort((a, b) => b.effectiveMonth.localeCompare(a.effectiveMonth))
  return eligible[0] ? [eligible[0]] : [...snapshots].sort((a, b) => a.effectiveMonth.localeCompare(b.effectiveMonth)).slice(0, 1)
}

export async function getGoalPlanStateWithExecutor(executor: Executor, userId: string, currentMonth: string, includeAllOwnedGoals: boolean): Promise<GoalCreationState | null> {
  const profile = await executor.query.financialProfiles.findFirst({ where: (table: any, { eq }: any) => eq(table.userId, userId) })
  if (!profile) return null
  const [allGoals, incomes, expenses, snapshots] = await Promise.all([
    executor.query.financialGoals.findMany({ where: (table: any, { eq }: any) => eq(table.userId, userId) }),
    executor.query.incomes.findMany({ where: (table: any, { eq }: any) => eq(table.userId, userId) }),
    executor.query.expenses.findMany({ where: (table: any, { eq }: any) => eq(table.userId, userId) }),
    executor.query.allocationPlanSnapshots.findMany({ where: (table: any, { eq }: any) => eq(table.userId, userId) }),
  ])
  const goalIds = allGoals.map((goal: any) => goal.id)
  const [savingsPositions, investmentPositions] = goalIds.length ? await Promise.all([
    executor.query.goalSavingsPositions.findMany({ where: (table: any, { inArray }: any) => inArray(table.goalId, goalIds) }),
    executor.query.goalInvestmentPositions.findMany({ where: (table: any, { inArray }: any) => inArray(table.goalId, goalIds) }),
  ]) : [[], []]
  const currentSnapshots = winningSnapshot(snapshots, currentMonth)
  const pendingSnapshots = snapshots.filter((row: any) => row.effectiveMonth.slice(0, 7) === nextMonth(currentMonth))
  const selected = [...currentSnapshots, ...pendingSnapshots]
  const allocations = selected.length ? await executor.query.allocationPlanEntries.findMany({
    where: (table: any, { inArray }: any) => inArray(table.snapshotId, selected.map((row: any) => row.id)),
  }) : []
  const selectedGoals = includeAllOwnedGoals ? allGoals : allGoals.filter((goal: any) => goal.status === 'active')
  const currentIds = new Set(currentSnapshots.map((row: any) => row.id))
  const pendingIds = new Set(pendingSnapshots.map((row: any) => row.id))
  const source = mapRowsToGoalsWorkspaceSource({
    profile,
    goals: selectedGoals,
    savingsPositions,
    investmentPositions,
    snapshots: currentSnapshots,
    allocations: allocations.filter((row: any) => currentIds.has(row.snapshotId)),
    incomes,
    expenses,
    contributions: [],
    completionWithdrawals: [],
  })
  return {
    source,
    pendingSnapshots: pendingSnapshots.map(({ id, userId: owner, effectiveMonth }: any) => ({ id, userId: owner, effectiveMonth })),
    pendingAllocations: allocations.filter((row: any) => pendingIds.has(row.snapshotId)).map(({ id, snapshotId, goalId, percentage }: any) => ({ id, snapshotId, goalId, percentage })),
  }
}

export function getGoalCreationState(db: Database, userId: string, currentMonth: string) {
  return getGoalPlanStateWithExecutor(db, userId, currentMonth, false)
}

export function getGoalLifecycleState(db: Database, userId: string, currentMonth: string) {
  return getGoalPlanStateWithExecutor(db, userId, currentMonth, true) as Promise<GoalLifecycleState | null>
}

async function getGoalEditStateWithExecutor(executor: Executor, userId: string, currentMonth: string, goalId: string): Promise<GoalCreationState | null> {
  const state = await getGoalPlanStateWithExecutor(executor, userId, currentMonth, true)
  if (!state) return null
  const target = state.source.goals.find((goal: any) => goal.id === goalId)
  if (!target || !['active', 'paused'].includes(target.status)) {
    throw new Error(target?.status === 'completed' ? 'Cannot edit a completed goal.' : 'Goal not found or is not active.')
  }
  return state
}

export function getGoalEditState(db: Database, userId: string, currentMonth: string, goalId: string) {
  return getGoalEditStateWithExecutor(db, userId, currentMonth, goalId)
}

export function createGoalCreationPreviewToken(state: GoalCreationState, currentMonth: string, draft?: GoalCreationDraft): string {
  return createHash('sha256').update(serializeGoalCreationState(state, currentMonth, draft)).digest('hex')
}

export function createGoalEditPreviewToken(state: GoalCreationState, currentMonth: string, goalId: string, draft?: GoalCreationDraft): string {
  return createHash('sha256').update(serializeGoalEditState(state, currentMonth, goalId, draft)).digest('hex')
}

export function createAllocationChangePreviewToken(state: AllocationChangeState, currentMonth: string, draft?: AllocationChangeDraft): string {
  return createHash('sha256').update(serializeAllocationChangeState(state, currentMonth, draft)).digest('hex')
}

async function withLockedFinancialProfile<T>(db: Database, userId: string, callback: (tx: Executor, profile: any) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    const profile = await lockFinancialProfile(tx, userId)
    return callback(tx, profile)
  })
}

async function replacePlan(tx: Executor, userId: string, proposal: { allocation: { effectiveMonth: string; entries: ReadonlyArray<{ goalId: string; percentage: string }> } }, goalId: string, plannedMonthlyContribution: string | null) {
  await tx.delete(allocationPlanSnapshots).where(and(eq(allocationPlanSnapshots.userId, userId), gt(allocationPlanSnapshots.effectiveMonth, proposal.allocation.effectiveMonth)))
  const [existing] = await tx.select({ id: allocationPlanSnapshots.id }).from(allocationPlanSnapshots)
    .where(and(eq(allocationPlanSnapshots.userId, userId), eq(allocationPlanSnapshots.effectiveMonth, proposal.allocation.effectiveMonth))).limit(1)
  const snapshotId = existing?.id ?? (await tx.insert(allocationPlanSnapshots).values({ userId, effectiveMonth: proposal.allocation.effectiveMonth, plannedMonthlyContribution }).returning({ id: allocationPlanSnapshots.id }))[0].id
  if (existing) await tx.update(allocationPlanSnapshots).set({ plannedMonthlyContribution }).where(eq(allocationPlanSnapshots.id, snapshotId))
  await tx.delete(allocationPlanEntries).where(eq(allocationPlanEntries.snapshotId, snapshotId))
  const entries = proposal.allocation.entries.map(({ goalId: id, percentage }) => ({ snapshotId, goalId: id === PENDING_GOAL_ID ? goalId : id, percentage }))
  if (entries.length) await tx.insert(allocationPlanEntries).values(entries)
}

export function createGoalLifecyclePreviewToken(
  lifecycle: GoalLifecycle,
  goalId: string,
  state: GoalLifecycleState,
  currentMonth: string,
  draft?: GoalLifecycleDraft,
): string {
  return createHash('sha256').update(serializeGoalLifecycleState(lifecycle, goalId, state, currentMonth, draft)).digest('hex')
}

export async function confirmGoalLifecycleInRepository(db: Database, input: GoalLifecycleInput): Promise<void> {
  return withLockedFinancialProfile(db, input.userId, async (tx, lockedProfile) => {
    const state = await getGoalPlanStateWithExecutor(tx, input.userId, input.currentMonth, true) as GoalLifecycleState | null
    if (!state) throw new Error('Financial profile not found.')
    const previewToken = createGoalLifecyclePreviewToken(input.lifecycle, input.goalId, state, input.currentMonth, input.draft)
    const proposal = buildGoalLifecycleProposal({
      lifecycle: input.lifecycle,
      goalId: input.goalId,
      state,
      currentMonth: input.currentMonth,
      draft: input.draft,
    })
    if (previewToken !== input.previewToken) throw new StaleGoalLifecyclePreviewError({ proposal, previewToken })

    const plannedMonthlyContribution = lockedProfile.plannedMonthlyContribution ?? state.source.profile?.plannedMonthlyContribution ?? null
    if (proposal.pauseMonthlyCommitment) {
      await tx.update(financialProfiles).set({ plannedMonthlyContribution: null }).where(eq(financialProfiles.userId, input.userId))
    }
    await tx.update(financialGoals).set({ status: proposal.nextStatus })
      .where(and(eq(financialGoals.id, input.goalId), eq(financialGoals.userId, input.userId)))
    await replacePlan(tx, input.userId, { allocation: proposal.persistedAllocation }, input.goalId,
      proposal.pauseMonthlyCommitment ? null : plannedMonthlyContribution)
  })
}

export async function confirmGoalCreationInRepository(db: Database, input: CreationInput): Promise<{ goalId: string }> {
  return withLockedFinancialProfile(db, input.userId, async (tx, lockedProfile) => {
    const state = await getGoalPlanStateWithExecutor(tx, input.userId, input.currentMonth, false)
    if (!state) throw new Error('Financial profile not found.')
    const draft = parseGoalCreationSubmission(input.draft, input.currentMonth)
    const previewToken = createGoalCreationPreviewToken(state, input.currentMonth, draft)
    const proposal = buildGoalCreationProposal({ draft, state, currentMonth: input.currentMonth })
    if (previewToken !== input.previewToken) throw new StaleGoalCreationPreviewError({ proposal, previewToken })
    const [goal] = await tx.insert(financialGoals).values({
      userId: input.userId, name: proposal.normalizedGoal.name, type: proposal.normalizedGoal.type,
      targetAmount: proposal.normalizedGoal.targetAmount?.amount, currency: proposal.normalizedGoal.currency,
      priority: proposal.normalizedGoal.priority, strategy: proposal.normalizedGoal.strategy, status: 'active',
      desiredDate: proposal.normalizedGoal.desiredDate, emergencyFundMonths: proposal.normalizedGoal.emergencyFundMonths,
    }).returning({ id: financialGoals.id })
    if (proposal.investment) await tx.insert(goalInvestmentPositions).values({
      goalId: goal.id, currentValue: '0.00', currency: proposal.normalizedGoal.currency,
      annualReturnRate: proposal.investment.annualReturnRate, availability: proposal.investment.availability,
      availableFrom: proposal.investment.availableFrom,
    })
    await replacePlan(tx, input.userId, proposal, goal.id, lockedProfile.plannedMonthlyContribution ?? state.source.profile?.plannedMonthlyContribution ?? null)
    return { goalId: goal.id }
  })
}

function assertEditableGoalStatus(goal: any): void {
  if (!goal || !['active', 'paused'].includes(goal.status)) {
    throw new Error(goal?.status === 'completed' ? 'Cannot edit a completed goal.' : 'Goal not found or is not active.')
  }
}

function assertImmutableFields(goal: any, draft: ReturnType<typeof parseGoalCreationSubmission>): void {
  if (draft.type !== goal.type || draft.currency !== goal.currency || draft.strategy !== goal.strategy) {
    throw new Error('Cannot modify immutable goal fields (type, currency, strategy).')
  }
}

async function applyGoalEdit(tx: Executor, input: EditInput, proposal: GoalCreationProposal): Promise<void> {
  await tx.update(financialGoals).set({
    name: proposal.normalizedGoal.name,
    targetAmount: proposal.normalizedGoal.targetAmount?.amount,
    desiredDate: proposal.normalizedGoal.desiredDate,
    emergencyFundMonths: proposal.normalizedGoal.emergencyFundMonths,
  }).where(and(eq(financialGoals.id, input.goalId), eq(financialGoals.userId, input.userId)))
  if (proposal.investment) {
    await tx.update(goalInvestmentPositions).set({
      annualReturnRate: proposal.investment.annualReturnRate,
      availability: proposal.investment.availability,
      availableFrom: proposal.investment.availableFrom,
    }).where(eq(goalInvestmentPositions.goalId, input.goalId))
  }
}

export async function confirmGoalEditInRepository(db: Database, input: EditInput): Promise<void> {
  return withLockedFinancialProfile(db, input.userId, async (tx, lockedProfile) => {
    const state = await getGoalEditStateWithExecutor(tx, input.userId, input.currentMonth, input.goalId)
    if (!state) throw new Error('Financial profile not found.')
    const goal = state.source.goals.find((candidate: any) => candidate.id === input.goalId)
    assertEditableGoalStatus(goal)
    const draft = parseGoalCreationSubmission(input.draft, input.currentMonth)
    assertImmutableFields(goal, draft)
    const previewToken = createGoalEditPreviewToken(state, input.currentMonth, input.goalId, draft)
    const proposal = buildGoalCreationProposal({ draft, state, currentMonth: input.currentMonth, subjectGoalId: input.goalId })
    if (previewToken !== input.previewToken) throw new StaleGoalEditPreviewError({ proposal, previewToken })

    await applyGoalEdit(tx, input, proposal)
    await replacePlan(tx, input.userId, proposal, input.goalId,
      lockedProfile.plannedMonthlyContribution ?? state.source.profile?.plannedMonthlyContribution ?? null)
  })
}

export async function confirmAllocationChangeInRepository(db: Database, input: AllocationChangeInput): Promise<void> {
  return withLockedFinancialProfile(db, input.userId, async (tx, lockedProfile) => {
    const state = await getGoalPlanStateWithExecutor(tx, input.userId, input.currentMonth, false) as AllocationChangeState | null
    if (!state) throw new Error('Financial profile not found.')
    const previewToken = createAllocationChangePreviewToken(state, input.currentMonth, input.draft)
    const proposal = buildAllocationChangeProposal({ draft: input.draft, state, currentMonth: input.currentMonth })
    if (previewToken !== input.previewToken) throw new StaleAllocationChangePreviewError({ proposal, previewToken })
    const monthlyContribution = proposal.allocation.monthlyContribution?.amount ?? '0.00'
    await tx.update(financialProfiles).set({
      goalDedicationPercentage: new BigNumber(input.draft.dedicationPercentage).toFixed(2),
      plannedMonthlyContribution: monthlyContribution,
    }).where(eq(financialProfiles.userId, input.userId))
    await replacePlan(tx, input.userId, proposal, '', monthlyContribution)
  })
}

export class StaleGoalCompletionPreviewError extends Error {
  constructor(readonly refreshedPreview: GoalCompletionPreviewResult) {
    super('Tu Plan cambió mientras revisabas el impacto.')
  }
}

export class GoalCompletionStateInvalidError extends Error {
  constructor() {
    super('No se puede completar el objetivo con el estado actual.')
  }
}

function normalizeCompletionWithdrawals(rows: any[], places: any[], goals: GoalCompletionState['source']['goals']) {
  const placeNames = new Map(places.map((place) => [place.id, place.name]))
  const goalIds = new Set(goals.map((goal) => goal.id))
  return rows
    .filter((withdrawal) => placeNames.has(withdrawal.placeId) && goalIds.has(withdrawal.goalId))
    .map((withdrawal) => ({
      id: withdrawal.id,
      goalId: withdrawal.goalId,
      placeId: withdrawal.placeId,
      placeName: placeNames.get(withdrawal.placeId)!,
      amount: withdrawal.amount,
      currency: withdrawal.currency,
      createdAt: withdrawal.createdAt instanceof Date ? withdrawal.createdAt.toISOString() : String(withdrawal.createdAt),
    }))
}

async function getGoalCompletionStateWithExecutor(executor: Executor, userId: string, currentMonth: string, goalId: string): Promise<GoalCompletionState | null> {
  const state = await getGoalPlanStateWithExecutor(executor, userId, currentMonth, true) as GoalCompletionState | null
  if (!state) return null
  const goal = state.source.goals.find((candidate) => candidate.id === goalId)
  if (!goal) throw new Error('Objetivo no encontrado.')

  const [places, contributions, transfers] = await Promise.all([
    executor.query.savingsPlaces.findMany({ where: (table: any, { eq }: any) => eq(table.userId, userId) }),
    executor.query.savingContributions.findMany({ where: (table: any, { eq }: any) => eq(table.userId, userId) }),
    executor.query.savingsPlaceTransfers.findMany({ where: (table: any, { eq }: any) => eq(table.userId, userId) }),
  ])
  const placeIds = places.map((place: any) => place.id)
  const goalIds = state.source.goals.map((candidate) => candidate.id)
  const withdrawalRows = placeIds.length && goalIds.length ? await executor.query.goalCompletionWithdrawals.findMany({
    where: (table: any, { and, inArray }: any) => and(inArray(table.placeId, placeIds), inArray(table.goalId, goalIds)),
  }) : []
  const completionWithdrawals = normalizeCompletionWithdrawals(withdrawalRows, places, state.source.goals)
  const balances = calculateSavingsBalances({ places, contributions, transfers, withdrawals: completionWithdrawals })
  const currency = goal.currency
  const savingsPlacesForGoal = balances
    .filter((place) => new BigNumber(place.balances[currency]).isGreaterThan(0))
    .map((place) => ({ id: place.id, name: place.name, balance: { amount: place.balances[currency], currency } }))

  return { ...state, source: { ...state.source, completionWithdrawals }, savingsPlaces: savingsPlacesForGoal }
}

export function getGoalCompletionState(db: Database, userId: string, currentMonth: string, goalId: string) {
  return getGoalCompletionStateWithExecutor(db, userId, currentMonth, goalId)
}

export function createGoalCompletionPreviewToken(state: GoalCompletionState, currentMonth: string, draft: GoalCompletionDraft): string {
  return createHash('sha256').update(serializeGoalCompletionState(state, currentMonth, draft)).digest('hex')
}

async function lockCompletionTargets(tx: Executor, userId: string, goalId: string) {
  const profile = await lockFinancialProfile(tx, userId)
  const [goal] = await tx.select({ id: financialGoals.id }).from(financialGoals)
    .where(and(eq(financialGoals.id, goalId), eq(financialGoals.userId, userId))).for('update')
  if (!goal) throw new Error('Objetivo no encontrado.')
  return profile
}

function getCurrentCompletionProposal(state: GoalCompletionState, currentMonth: string, draft: GoalCompletionDraft, previewToken: string): GoalCompletionProposal {
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

async function confirmGoalCompletionTransaction(tx: Executor, input: { userId: string; currentMonth: string; draft: GoalCompletionDraft; previewToken: string }): Promise<{ completedAt: string }> {
  const { userId, currentMonth, draft, previewToken } = input
  const lockedProfile = await lockCompletionTargets(tx, userId, draft.goalId)
  await lockOwnedSavingsPlaces(tx, userId, [...new Set(draft.withdrawals.map((withdrawal) => withdrawal.placeId))].sort())
  const state = await getGoalCompletionStateWithExecutor(tx, userId, currentMonth, draft.goalId)
  if (!state) throw new Error('Financial profile not found.')
  const proposal = getCurrentCompletionProposal(state, currentMonth, draft, previewToken)
  const completedAt = new Date()
  const withdrawals = proposal.withdrawals.filter(({ amount }) => new BigNumber(amount.amount).isGreaterThan(0))
  if (withdrawals.length) {
    await tx.insert(goalCompletionWithdrawals).values(withdrawals.map(({ placeId, amount }) => ({
      goalId: proposal.goalId, placeId, amount: amount.amount, currency: amount.currency, createdAt: completedAt,
    })))
  }
  const updatedGoals = await tx.update(financialGoals).set({ status: 'completed', completedAt })
    .where(and(eq(financialGoals.id, proposal.goalId), eq(financialGoals.userId, userId), eq(financialGoals.status, 'active')))
    .returning({ id: financialGoals.id })
  if (updatedGoals.length === 0) throw new Error('Objetivo no encontrado.')
  if (proposal.pauseMonthlyCommitment) {
    await tx.update(financialProfiles).set({ plannedMonthlyContribution: null }).where(eq(financialProfiles.userId, userId))
  }
  await replacePlan(tx, userId, { allocation: proposal.persistedAllocation }, proposal.goalId,
    proposal.pauseMonthlyCommitment ? null : lockedProfile.plannedMonthlyContribution ?? null)
  return { completedAt: completedAt.toISOString() }
}

export function confirmGoalCompletionInRepository(db: Database, input: { userId: string; currentMonth: string; draft: GoalCompletionDraft; previewToken: string }): Promise<{ completedAt: string }> {
  return db.transaction((tx) => confirmGoalCompletionTransaction(tx, input))
}

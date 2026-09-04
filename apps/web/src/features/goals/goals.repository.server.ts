import '@tanstack/react-start/server-only'
import { createHash } from 'node:crypto'
import BigNumber from 'bignumber.js'
import { db } from '../../db/client'
import { withLockedFinancialProfile } from '../../db/with-locked-financial-profile.server'
import { and, eq, gt } from 'drizzle-orm'
import {
  allocationPlanEntries,
  allocationPlanSnapshots,
  financialGoals,
  financialProfiles,
  goalInvestmentPositions,
  type AllocationPlanEntry,
  type AllocationPlanSnapshot,
  type Expense,
  type FinancialGoal,
  type FinancialProfile,
  type GoalInvestmentPosition,
  type GoalSavingsPosition,
  type Income,
} from '../../db/schema'
import type {
  ContributionKind,
  GoalPriority,
  GoalStatus,
  GoalStrategy,
  GoalsWorkspaceSource,
  InvestmentAvailability,
} from './goals'
import type { CurrencyCode } from '../../lib/money'
import { getNextCalendarMonth } from '../financial/financial'
import {
  PENDING_GOAL_ID,
  buildGoalCreationProposal,
  serializeGoalCreationState,
  serializeGoalEditState,
  type GoalCreationAllocation,
  type GoalCreationPreviewResult,
  type GoalCreationProposal,
  type GoalCreationState,
} from './goal-creation'
import type { GoalCreationDraft } from './goal-creation.schema'
import {
  buildAllocationChangeProposal,
  serializeAllocationChangeState,
  type AllocationChangePreviewResult,
  type AllocationChangeState,
} from './allocation-change'
import type { AllocationChangeDraft } from './allocation-change.schema'
import {
  buildGoalLifecycleProposal,
  serializeGoalLifecycleState,
  type GoalLifecyclePreviewResult,
  type GoalLifecycleState,
} from './goal-lifecycle'
import type { GoalLifecycle } from './goal-lifecycle.schema'

export class StaleGoalCreationPreviewError extends Error {
  // fallow-ignore-next-line unused-class-member -- public contract member asserted by tests
  readonly code = 'STALE_GOAL_CREATION_PREVIEW'

  constructor(readonly refreshedPreview: GoalCreationPreviewResult) {
    super('Tu Plan cambió mientras revisabas el impacto.')
  }
}

export class StaleGoalEditPreviewError extends Error {
  readonly code = 'STALE_GOAL_EDIT_PREVIEW'

  constructor(readonly refreshedPreview: GoalCreationPreviewResult) {
    super('Tu Plan cambió mientras revisabas el impacto.')
  }
}

export class StaleAllocationChangePreviewError extends Error {
  readonly code = 'STALE_ALLOCATION_CHANGE_PREVIEW'

  constructor(readonly refreshedPreview: AllocationChangePreviewResult) {
    super('Tu Plan cambió mientras revisabas el impacto.')
  }
}

export class StaleGoalLifecyclePreviewError extends Error {
  readonly code = 'STALE_GOAL_LIFECYCLE_PREVIEW'

  constructor(readonly refreshedPreview: GoalLifecyclePreviewResult) {
    super('Tu Plan cambió mientras revisabas el impacto.')
  }
}

export interface GoalsWorkspaceRows {
  profile: FinancialProfile
  goals: FinancialGoal[]
  savingsPositions: GoalSavingsPosition[]
  investmentPositions: GoalInvestmentPosition[]
  snapshots: AllocationPlanSnapshot[]
  allocations: AllocationPlanEntry[]
  incomes?: Income[]
  expenses?: Expense[]
  contributions?: Array<{
    id: string
    kind: ContributionKind
    userId?: string
    amount: string
    currency: string
    placeId?: string
    placeName?: string
    arsSpent?: string | null
    effectiveRate?: string | null
    createdAt: Date | string
    allocations: Array<{
      goalId: string
      goalName: string
      amount: string
      percentage: string
    }>
  }>
  savingContributions?: Array<{
    id: string
    kind?: ContributionKind
    userId?: string
    amount: string
    currency: string
    placeId?: string
    placeName?: string
    arsSpent?: string | null
    effectiveRate?: string | null
    createdAt: Date | string
    allocations: Array<{
      goalId: string
      goalName: string
      amount: string
      percentage: string
    }>
  }>
  completionWithdrawals?: Array<{
    id: string
    goalId: string
    placeId: string
    placeName: string
    amount: string
    currency: string
    createdAt: Date | string
  }>
}

export function selectWinningSnapshots(
  snapshots: AllocationPlanSnapshot[],
  currentMonth: string,
): AllocationPlanSnapshot[] {
  const currentYM = currentMonth.slice(0, 7)
  const onOrBefore = snapshots.filter(
    (s) => s.effectiveMonth.slice(0, 7) <= currentYM,
  )
  if (onOrBefore.length > 0) {
    onOrBefore.sort((a, b) => b.effectiveMonth.localeCompare(a.effectiveMonth))
    return [onOrBefore[0]]
  }
  const upcoming = [...snapshots]
  upcoming.sort((a, b) => a.effectiveMonth.localeCompare(b.effectiveMonth))
  return upcoming.length > 0 ? [upcoming[0]] : []
}

async function getOwnedGoalPlanBase(
  executor: any,
  userId: string,
  _options?: { lock?: boolean },
) {
  const profile = await executor.query.financialProfiles.findFirst({
    where: (profiles: any, { eq }: any) => eq(profiles.userId, userId),
  })

  if (!profile) {
    return null
  }

  const [goals, incomes, expenses] = await Promise.all([
    executor.query.financialGoals.findMany({
      where: (goalsTable: any, { eq }: any) => eq(goalsTable.userId, userId),
    }),
    executor.query.incomes.findMany({
      where: (table: any, { eq }: any) => eq(table.userId, userId),
    }),
    executor.query.expenses.findMany({
      where: (table: any, { eq }: any) => eq(table.userId, userId),
    }),
  ])

  const { savingsPositions, investmentPositions } = await loadGoalPositions(executor, goals)

  const snapshots = await executor.query.allocationPlanSnapshots.findMany({
    where: (snapshotsTable: any, { eq }: any) => eq(snapshotsTable.userId, userId),
  })

  return {
    profile,
    goals,
    savingsPositions,
    investmentPositions,
    snapshots,
    incomes: incomes ?? [],
    expenses: expenses ?? [],
  }
}

async function loadGoalPositions(executor: any, goals: any[]) {
  const goalIds = goals.map((goal) => goal.id)
  if (goalIds.length === 0) return { savingsPositions: [], investmentPositions: [] }
  const [savingsPositions, investmentPositions] = await Promise.all([
    executor.query.goalSavingsPositions.findMany({
      where: (pos: any, { inArray }: any) => inArray(pos.goalId, goalIds),
    }),
    executor.query.goalInvestmentPositions.findMany({
      where: (pos: any, { inArray }: any) => inArray(pos.goalId, goalIds),
    }),
  ])
  return { savingsPositions, investmentPositions }
}

function selectWorkspaceSnapshots(
  snapshots: AllocationPlanSnapshot[],
  currentMonth: string,
): AllocationPlanSnapshot[] {
  const selected = selectWinningSnapshots(snapshots, currentMonth)
  const nextMonth = getNextCalendarMonth(new Date(`${currentMonth.slice(0, 7)}-01T00:00:00Z`))
  selected.push(...snapshots.filter(
    (snapshot) => snapshot.effectiveMonth.slice(0, 7) === nextMonth &&
      selected.every((candidate) => candidate.id !== snapshot.id),
  ))
  return selected
}

async function loadWorkspacePlanRows(
  executor: any,
  snapshots: AllocationPlanSnapshot[],
  currentMonth: string,
) {
  const selectedSnapshots = selectWorkspaceSnapshots(snapshots, currentMonth)
  const snapshotIds = selectedSnapshots.map((snapshot) => snapshot.id)
  const allocations = snapshotIds.length > 0
    ? await executor.query.allocationPlanEntries.findMany({
        where: (allocsTable: any, { inArray }: any) => inArray(allocsTable.snapshotId, snapshotIds),
      })
    : []
  return { snapshots: selectedSnapshots, allocations }
}

export async function getGoalsProjectionRowsWithExecutor(
  executor: any,
  userId: string,
  currentMonth: string,
): Promise<GoalsWorkspaceRows | null> {
  const base = await getOwnedGoalPlanBase(executor, userId)
  if (!base) return null

  const { snapshots, allocations } = await loadWorkspacePlanRows(
    executor,
    base.snapshots,
    currentMonth,
  )
  return { ...base, snapshots, allocations }
}

async function loadWorkspaceCompletionWithdrawals(
  executor: any,
  goalIds: string[],
  savingsPlaces: any[],
) {
  if (goalIds.length === 0 || savingsPlaces.length === 0) return []
  const placeIds = savingsPlaces.map((place) => place.id)
  const rows = await executor.query.goalCompletionWithdrawals.findMany({
    where: (withdrawalsTable: any, { and, inArray }: any) =>
      and(inArray(withdrawalsTable.placeId, placeIds), inArray(withdrawalsTable.goalId, goalIds)),
  })
  const placeNameMap = new Map(savingsPlaces.map((place) => [place.id, place.name]))
  return rows
    .filter((withdrawal: any) => placeNameMap.has(withdrawal.placeId) && goalIds.includes(withdrawal.goalId))
    .map((withdrawal: any) => ({
      id: withdrawal.id,
      goalId: withdrawal.goalId,
      placeId: withdrawal.placeId,
      placeName: placeNameMap.get(withdrawal.placeId)!,
      amount: withdrawal.amount,
      currency: withdrawal.currency,
      createdAt: withdrawal.createdAt,
    }))
}

function mapContributionAllocations(
  contributionId: string,
  allocations: any[],
  goalNameMap: Map<string, string>,
) {
  return allocations
    .filter((allocation) => allocation.contributionId === contributionId)
    .map((allocation) => ({
      goalId: String(allocation.goalId),
      goalName: String(goalNameMap.get(allocation.goalId) ?? ''),
      amount: String(allocation.amount),
      percentage: String(allocation.percentage),
    }))
}

function mapContribution(
  contribution: any,
  kind: ContributionKind,
  allocations: any[],
  goalNameMap: Map<string, string>,
  placeNameMap: Map<string, string>,
) {
  return {
    id: contribution.id,
    kind,
    userId: contribution.userId,
    amount: contribution.amount,
    currency: contribution.currency,
    ...(kind === 'saving'
      ? {
          placeId: contribution.placeId,
          placeName: placeNameMap.get(contribution.placeId) ?? '',
        }
      : {}),
    arsSpent: contribution.arsSpent,
    effectiveRate: contribution.effectiveRate,
    createdAt: contribution.createdAt,
    allocations: mapContributionAllocations(contribution.id, allocations, goalNameMap),
  }
}

function sortContributions<T extends { createdAt: Date | string }>(contributions: T[]): T[] {
  const getTime = (value: Date | string) => value instanceof Date ? value.getTime() : new Date(value).getTime()
  return contributions.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt))
}

async function loadWorkspaceActivityRows(executor: any, userId: string, goals: any[]) {
  const savingContributions = await executor.query.savingContributions.findMany({
    where: (contribTable: any, { eq }: any) => eq(contribTable.userId, userId),
  })
  const savingIds = savingContributions.map((contribution: any) => contribution.id)
  const savingAllocations = savingIds.length > 0
    ? await executor.query.savingContributionAllocations.findMany({
        where: (allocTable: any, { inArray }: any) => inArray(allocTable.contributionId, savingIds),
      })
    : []
  const savingsPlaces = await executor.query.savingsPlaces.findMany({
    where: (placeTable: any, { eq }: any) => eq(placeTable.userId, userId),
  })
  const goalIds = goals.map((goal) => goal.id)
  const placeNameMap = new Map<string, string>(savingsPlaces.map((place: any) => [place.id, place.name]))
  const completionWithdrawals = await loadWorkspaceCompletionWithdrawals(executor, goalIds, savingsPlaces)
  const investmentContributions = await executor.query.investmentContributions.findMany({
    where: (contribTable: any, { eq }: any) => eq(contribTable.userId, userId),
  })
  const investmentIds = investmentContributions.map((contribution: any) => contribution.id)
  const investmentAllocations = investmentIds.length > 0
    ? await executor.query.investmentContributionAllocations.findMany({
        where: (allocTable: any, { inArray }: any) => inArray(allocTable.contributionId, investmentIds),
      })
    : []
  const goalNameMap = new Map<string, string>(goals.map((goal: any) => [goal.id, goal.name]))
  const contributions = sortContributions([
    ...savingContributions.map((contribution: any) =>
      mapContribution(contribution, 'saving', savingAllocations, goalNameMap, placeNameMap)),
    ...investmentContributions.map((contribution: any) =>
      mapContribution(contribution, 'investment', investmentAllocations, goalNameMap, placeNameMap)),
  ])
  return { contributions, completionWithdrawals }
}

export async function getGoalsWorkspaceRows(
  userId: string,
  currentMonth: string,
): Promise<GoalsWorkspaceRows | null> {
  const projectionRows = await getGoalsProjectionRowsWithExecutor(db, userId, currentMonth)
  if (!projectionRows) return null

  const { contributions, completionWithdrawals } = await loadWorkspaceActivityRows(
    db,
    userId,
    projectionRows.goals,
  )
  return {
    ...projectionRows,
    contributions,
    savingContributions: contributions,
    completionWithdrawals,
  }
}

function mapSnapshot(s: AllocationPlanSnapshot): GoalsWorkspaceSource['snapshots'][number] {
  return {
    id: s.id,
    userId: s.userId,
    effectiveMonth: s.effectiveMonth,
  }
}

function mapAllocation(a: AllocationPlanEntry): GoalsWorkspaceSource['allocations'][number] {
  return {
    id: a.id,
    snapshotId: a.snapshotId,
    goalId: a.goalId,
    percentage: a.percentage,
  }
}

function buildGoalPlanState(
  base: Awaited<ReturnType<typeof getOwnedGoalPlanBase>>,
  goals: any[],
  currentSnapshots: AllocationPlanSnapshot[],
  pendingSnapshots: AllocationPlanSnapshot[],
  allocations: AllocationPlanEntry[],
) {
  const currentSnapshotIds = new Set(currentSnapshots.map((snapshot) => snapshot.id))
  const pendingSnapshotIds = new Set(pendingSnapshots.map((snapshot) => snapshot.id))

  return {
    source: mapRowsToGoalsWorkspaceSource({
      profile: base!.profile,
      goals,
      savingsPositions: base!.savingsPositions,
      investmentPositions: base!.investmentPositions,
      snapshots: currentSnapshots,
      allocations: allocations.filter((allocation) => currentSnapshotIds.has(allocation.snapshotId)),
      incomes: base!.incomes,
      expenses: base!.expenses,
    }),
    pendingSnapshots: pendingSnapshots.map(mapSnapshot),
    pendingAllocations: allocations
      .filter((allocation) => pendingSnapshotIds.has(allocation.snapshotId))
      .map(mapAllocation),
  }
}

type GoalPlanBase = NonNullable<Awaited<ReturnType<typeof getOwnedGoalPlanBase>>>

async function getGoalPlanSnapshotsAndAllocations(
  executor: any,
  base: GoalPlanBase,
  currentMonth: string,
) {
  const nextMonth = `${getNextCalendarMonth(new Date(`${currentMonth.slice(0, 7)}-01T00:00:00Z`))}-01`
  const currentSnapshots = selectWinningSnapshots(base.snapshots, currentMonth)
  const pendingSnapshots = base.snapshots.filter(
    (snapshot: any) => snapshot.effectiveMonth.slice(0, 7) === nextMonth.slice(0, 7),
  )
  const selectedSnapshotIds = Array.from(
    new Set([...currentSnapshots, ...pendingSnapshots].map((snapshot: any) => snapshot.id)),
  )
  const allocations = selectedSnapshotIds.length > 0
    ? await executor.query.allocationPlanEntries.findMany({
        where: (allocsTable: any, { inArray }: any) => inArray(allocsTable.snapshotId, selectedSnapshotIds),
      })
    : []
  return { currentSnapshots, pendingSnapshots, allocations }
}

function validateGoalEditTarget(goals: any[], goalId: string): void {
  const goal = goals.find((candidate) => candidate.id === goalId)
  if (!goal) throw new Error('Goal not found or is not active.')
  if (goal.status === 'completed') throw new Error('Cannot edit a completed goal.')
  if (!isEditableGoalStatus(goal.status)) {
    throw new Error('Goal not found or is not active.')
  }
}

function isEditableGoalStatus(status: string): boolean {
  return status === 'active' || status === 'paused'
}

async function getActiveGoalPlanStateWithExecutor(
  executor: any,
  userId: string,
  currentMonth: string,
): Promise<AllocationChangeState | null> {
  const base = await getOwnedGoalPlanBase(executor, userId)
  if (!base) {
    return null
  }

  const { currentSnapshots, pendingSnapshots, allocations } =
    await getGoalPlanSnapshotsAndAllocations(executor, base, currentMonth)

  return buildGoalPlanState(
    base,
    base.goals.filter((goal: any) => goal.status === 'active'),
    currentSnapshots,
    pendingSnapshots,
    allocations,
  )
}

async function getGoalCreationStateWithExecutor(
  executor: any,
  userId: string,
  currentMonth: string,
): Promise<GoalCreationState | null> {
  return getActiveGoalPlanStateWithExecutor(executor, userId, currentMonth)
}

export async function getGoalCreationState(
  userId: string,
  currentMonth: string,
): Promise<GoalCreationState | null> {
  return getGoalCreationStateWithExecutor(db, userId, currentMonth)
}

async function getGoalEditStateWithExecutor(
  executor: any,
  userId: string,
  currentMonth: string,
  goalId: string,
): Promise<GoalCreationState | null> {
  const base = await getOwnedGoalPlanBase(executor, userId)
  if (!base) {
    return null
  }

  validateGoalEditTarget(base.goals, goalId)

  const { currentSnapshots, pendingSnapshots, allocations } =
    await getGoalPlanSnapshotsAndAllocations(executor, base, currentMonth)

  return buildGoalPlanState(base, base.goals, currentSnapshots, pendingSnapshots, allocations)
}

export async function getGoalEditState(
  userId: string,
  currentMonth: string,
  goalId: string,
): Promise<GoalCreationState | null> {
  return getGoalEditStateWithExecutor(db, userId, currentMonth, goalId)
}

async function getAllocationChangeStateWithExecutor(
  executor: any,
  userId: string,
  currentMonth: string,
): Promise<AllocationChangeState | null> {
  return getActiveGoalPlanStateWithExecutor(executor, userId, currentMonth)
}

export async function getAllocationChangeState(
  userId: string,
  currentMonth: string,
): Promise<AllocationChangeState | null> {
  return getAllocationChangeStateWithExecutor(db, userId, currentMonth)
}

export async function getGoalLifecycleStateWithExecutor(
  executor: any,
  userId: string,
  currentMonth: string,
): Promise<GoalLifecycleState | null> {
  const base = await getOwnedGoalPlanBase(executor, userId)
  if (!base) {
    return null
  }

  const { currentSnapshots, pendingSnapshots, allocations } =
    await getGoalPlanSnapshotsAndAllocations(executor, base, currentMonth)

  return buildGoalPlanState(base, base.goals, currentSnapshots, pendingSnapshots, allocations)
}

export async function getGoalLifecycleState(
  userId: string,
  currentMonth: string,
): Promise<GoalLifecycleState | null> {
  return getGoalLifecycleStateWithExecutor(db, userId, currentMonth)
}

async function replaceCurrentAllocationSnapshot(
  tx: any,
  userId: string,
  allocation: GoalCreationAllocation | { effectiveMonth: string; entries?: ReadonlyArray<any> },
  plannedMonthlyContribution?: string | null,
): Promise<string> {
  await tx
    .delete(allocationPlanSnapshots)
    .where(
      and(
        eq(allocationPlanSnapshots.userId, userId),
        gt(allocationPlanSnapshots.effectiveMonth, allocation.effectiveMonth),
      ),
    )

  const existingSnapshot = await tx.query.allocationPlanSnapshots.findFirst({
    where: (snapshots: any, { and, eq }: any) =>
      and(
        eq(snapshots.userId, userId),
        eq(snapshots.effectiveMonth, allocation.effectiveMonth),
      ),
  })

  if (existingSnapshot) {
    await updateSnapshotContribution(tx, existingSnapshot.id, plannedMonthlyContribution)
    return existingSnapshot.id
  }

  const [insertedSnapshot] = await tx
    .insert(allocationPlanSnapshots)
    .values({
      userId,
      effectiveMonth: allocation.effectiveMonth,
      plannedMonthlyContribution: plannedMonthlyContribution ?? null,
    })
    .returning({ id: allocationPlanSnapshots.id })

  return insertedSnapshot.id
}

async function updateSnapshotContribution(
  tx: any,
  snapshotId: string,
  plannedMonthlyContribution: string | null | undefined,
): Promise<void> {
  if (plannedMonthlyContribution === undefined) return
  await tx
    .update(allocationPlanSnapshots)
    .set({ plannedMonthlyContribution: plannedMonthlyContribution ?? null })
    .where(eq(allocationPlanSnapshots.id, snapshotId))
}

async function replaceAllocationPlanEntries(
  tx: any,
  snapshotId: string,
  entries: ReadonlyArray<{ goalId: string; percentage: string }>,
): Promise<void> {
  await tx.delete(allocationPlanEntries).where(eq(allocationPlanEntries.snapshotId, snapshotId))
  if (entries.length === 0) return
  await tx.insert(allocationPlanEntries).values(
    entries.map(({ goalId, percentage }) => ({ snapshotId, goalId, percentage })),
  )
}

export async function persistGoalAllocationPlan({
  tx,
  userId,
  allocation,
  plannedMonthlyContribution,
  pauseMonthlyCommitment,
}: {
  tx: any
  userId: string
  allocation: { effectiveMonth: string; entries: ReadonlyArray<{ goalId: string; percentage: string }> }
  plannedMonthlyContribution: string | null
  pauseMonthlyCommitment: boolean
}) {
  if (pauseMonthlyCommitment) {
    await tx
      .update(financialProfiles)
      .set({ plannedMonthlyContribution: null })
      .where(eq(financialProfiles.userId, userId))
  }
  const snapshotId = await replaceCurrentAllocationSnapshot(
    tx,
    userId,
    allocation,
    pauseMonthlyCommitment ? null : plannedMonthlyContribution,
  )
  await replaceAllocationPlanEntries(tx, snapshotId, allocation.entries)
}

async function insertGoalFromProposal(
  tx: any,
  userId: string,
  proposal: GoalCreationProposal,
): Promise<string> {
  const [goal] = await tx
    .insert(financialGoals)
    .values({
      userId,
      name: proposal.normalizedGoal.name,
      type: proposal.normalizedGoal.type,
      targetAmount: proposal.normalizedGoal.targetAmount?.amount,
      currency: proposal.normalizedGoal.currency,
      priority: proposal.normalizedGoal.priority,
      strategy: proposal.normalizedGoal.strategy,
      status: 'active',
      desiredDate: proposal.normalizedGoal.desiredDate,
      emergencyFundMonths: proposal.normalizedGoal.emergencyFundMonths,
    })
    .returning({ id: financialGoals.id })
  return goal.id
}

async function insertInvestmentPosition(
  tx: any,
  goalId: string,
  proposal: GoalCreationProposal,
): Promise<void> {
  if (!proposal.investment) return
  await tx.insert(goalInvestmentPositions).values({
    goalId,
    currentValue: '0.00',
    currency: proposal.normalizedGoal.currency,
    annualReturnRate: proposal.investment.annualReturnRate,
    availability: proposal.investment.availability,
    availableFrom: proposal.investment.availableFrom,
  })
}

async function persistCreatedGoalPlan(
  tx: any,
  userId: string,
  proposal: GoalCreationProposal,
  goalId: string,
  plannedMonthlyContribution: string | null | undefined,
): Promise<void> {
  const snapshotId = await replaceCurrentAllocationSnapshot(
    tx,
    userId,
    proposal.allocation,
    plannedMonthlyContribution ?? null,
  )
  await replaceAllocationPlanEntries(
    tx,
    snapshotId,
    proposal.allocation.entries.map((entry) => ({
      goalId: entry.goalId === PENDING_GOAL_ID ? goalId : entry.goalId,
      percentage: entry.percentage,
    })),
  )
}

function requireCurrentGoalCreationProposal(
  state: GoalCreationState,
  currentMonth: string,
  draft: GoalCreationDraft,
  previewToken: string,
): GoalCreationProposal {
  const currentToken = createGoalCreationPreviewToken(state, currentMonth, draft)
  const proposal = buildGoalCreationProposal({ draft, state, currentMonth })
  if (currentToken !== previewToken) {
    throw new StaleGoalCreationPreviewError({ proposal, previewToken: currentToken })
  }
  return proposal
}

async function confirmGoalCreationTransaction(
  tx: any,
  lockedProfile: { plannedMonthlyContribution?: string | null },
  input: {
    userId: string
    currentMonth: string
    draft: GoalCreationDraft
    previewToken: string
  },
): Promise<{ goalId: string }> {
  const state = await getGoalCreationStateWithExecutor(tx, input.userId, input.currentMonth)
  if (!state) throw new Error('Financial profile not found.')
  const proposal = requireCurrentGoalCreationProposal(
    state,
    input.currentMonth,
    input.draft,
    input.previewToken,
  )
  const goalId = await insertGoalFromProposal(tx, input.userId, proposal)
  await insertInvestmentPosition(tx, goalId, proposal)
  await persistCreatedGoalPlan(
    tx,
    input.userId,
    proposal,
    goalId,
    lockedProfile.plannedMonthlyContribution ?? state.source.profile?.plannedMonthlyContribution,
  )
  return { goalId }
}

export async function confirmGoalCreationInRepository(input: {
  userId: string
  currentMonth: string
  draft: GoalCreationDraft
  previewToken: string
}): Promise<{ goalId: string }> {
  return withLockedFinancialProfile(input.userId, (tx, lockedProfile) =>
    confirmGoalCreationTransaction(tx, lockedProfile, input))
}

export async function confirmAllocationChangeInRepository(input: {
  userId: string
  currentMonth: string
  draft: AllocationChangeDraft
  previewToken: string
}): Promise<void> {
  return withLockedFinancialProfile(input.userId, (tx) =>
    confirmAllocationChangeTransaction(tx, input))
}

function requireCurrentAllocationProposal(
  state: AllocationChangeState,
  currentMonth: string,
  draft: AllocationChangeDraft,
  previewToken: string,
): AllocationChangePreviewResult['proposal'] {
  const currentToken = createAllocationChangePreviewToken(state, currentMonth, draft)
  const proposal = buildAllocationChangeProposal({ draft, state, currentMonth })
  if (currentToken !== previewToken) {
    throw new StaleAllocationChangePreviewError({ proposal, previewToken: currentToken })
  }
  return proposal
}

async function persistAllocationChange(
  tx: any,
  userId: string,
  draft: AllocationChangeDraft,
  proposal: AllocationChangePreviewResult['proposal'],
): Promise<void> {
  const monthlyContribution = getAllocationMonthlyContribution(proposal)
  await tx
    .update(financialProfiles)
    .set({
      goalDedicationPercentage: new BigNumber(draft.dedicationPercentage).toFixed(2),
      plannedMonthlyContribution: monthlyContribution,
    })
    .where(eq(financialProfiles.userId, userId))
  const snapshotId = await replaceCurrentAllocationSnapshot(
    tx,
    userId,
    proposal.allocation,
    monthlyContribution,
  )
  await replaceAllocationPlanEntries(tx, snapshotId, proposal.allocation.entries)
}

function getAllocationMonthlyContribution(
  proposal: AllocationChangePreviewResult['proposal'],
): string {
  return proposal.allocation.monthlyContribution?.amount ?? '0.00'
}

async function confirmAllocationChangeTransaction(
  tx: any,
  input: {
    userId: string
    currentMonth: string
    draft: AllocationChangeDraft
    previewToken: string
  },
): Promise<void> {
  const state = await getAllocationChangeStateWithExecutor(tx, input.userId, input.currentMonth)
  if (!state) throw new Error('Financial profile not found.')
  const proposal = requireCurrentAllocationProposal(
    state,
    input.currentMonth,
    input.draft,
    input.previewToken,
  )
  await persistAllocationChange(tx, input.userId, input.draft, proposal)
}

function requireEditableGoal(state: GoalCreationState, goalId: string) {
  const goal = state.source.goals.find(
    (candidate) => candidate.id === goalId &&
      (candidate.status === 'active' || candidate.status === 'paused'),
  )
  if (!goal) throw new Error('Goal not found or is not active.')
  return goal
}

function assertImmutableGoalFields(
  draft: GoalCreationDraft,
  goal: GoalCreationState['source']['goals'][number],
): void {
  if (draft.type !== goal.type || draft.currency !== goal.currency || draft.strategy !== goal.strategy) {
    throw new Error('Cannot modify immutable goal fields (type, currency, strategy).')
  }
}

function requireCurrentGoalEditProposal(
  state: GoalCreationState,
  goalId: string,
  currentMonth: string,
  draft: GoalCreationDraft,
  previewToken: string,
): GoalCreationProposal {
  const currentToken = createGoalEditPreviewToken(state, currentMonth, goalId, draft)
  const proposal = buildGoalCreationProposal({
    draft,
    state,
    currentMonth,
    subjectGoalId: goalId,
  })
  if (currentToken !== previewToken) {
    throw new StaleGoalEditPreviewError({ proposal, previewToken: currentToken })
  }
  return proposal
}

async function persistEditedGoal(
  tx: any,
  userId: string,
  goalId: string,
  proposal: GoalCreationProposal,
  plannedMonthlyContribution: string | null | undefined,
): Promise<void> {
  await tx
    .update(financialGoals)
    .set({
      name: proposal.normalizedGoal.name,
      targetAmount: proposal.normalizedGoal.targetAmount?.amount,
      desiredDate: proposal.normalizedGoal.desiredDate,
      emergencyFundMonths: proposal.normalizedGoal.emergencyFundMonths,
    })
    .where(eq(financialGoals.id, goalId))

  if (proposal.investment) {
    await tx
      .update(goalInvestmentPositions)
      .set({
        annualReturnRate: proposal.investment.annualReturnRate,
        availability: proposal.investment.availability,
        availableFrom: proposal.investment.availableFrom,
      })
      .where(eq(goalInvestmentPositions.goalId, goalId))
  }

  const snapshotId = await replaceCurrentAllocationSnapshot(
    tx,
    userId,
    proposal.allocation,
    plannedMonthlyContribution ?? null,
  )
  await replaceAllocationPlanEntries(tx, snapshotId, proposal.allocation.entries)
}

async function confirmGoalEditTransaction(
  tx: any,
  lockedProfile: { plannedMonthlyContribution?: string | null },
  input: {
    userId: string
    goalId: string
    currentMonth: string
    draft: GoalCreationDraft
    previewToken: string
  },
): Promise<void> {
  const state = await getGoalEditStateWithExecutor(tx, input.userId, input.currentMonth, input.goalId)
  if (!state) throw new Error('Financial profile not found.')
  const goal = requireEditableGoal(state, input.goalId)
  assertImmutableGoalFields(input.draft, goal)
  const proposal = requireCurrentGoalEditProposal(
    state,
    input.goalId,
    input.currentMonth,
    input.draft,
    input.previewToken,
  )
  await persistEditedGoal(
    tx,
    input.userId,
    input.goalId,
    proposal,
    lockedProfile.plannedMonthlyContribution ?? state.source.profile?.plannedMonthlyContribution,
  )
}

export async function confirmGoalEditInRepository(input: {
  userId: string
  goalId: string
  currentMonth: string
  draft: GoalCreationDraft
  previewToken: string
}): Promise<void> {
  return withLockedFinancialProfile(input.userId, (tx, lockedProfile) =>
    confirmGoalEditTransaction(tx, lockedProfile, input))
}

export async function confirmGoalLifecycleInRepository(input: {
  userId: string
  goalId: string
  lifecycle: GoalLifecycle
  currentMonth: string
  draft?: {
    allocations?: Array<{
      goalId: string
      percentage: string
    }>
  }
  previewToken: string
}): Promise<void> {
  return withLockedFinancialProfile(input.userId, (tx, lockedProfile) =>
    confirmGoalLifecycleTransaction(tx, lockedProfile, input))
}

function requireCurrentLifecycleProposal(
  state: GoalLifecycleState,
  input: {
    goalId: string
    lifecycle: GoalLifecycle
    currentMonth: string
    draft?: { allocations?: Array<{ goalId: string; percentage: string }> }
    previewToken: string
  },
): GoalLifecyclePreviewResult['proposal'] {
  const currentToken = createGoalLifecyclePreviewToken(
    input.lifecycle,
    input.goalId,
    state,
    input.currentMonth,
    input.draft,
  )
  const proposal = buildGoalLifecycleProposal({
    lifecycle: input.lifecycle,
    goalId: input.goalId,
    state,
    currentMonth: input.currentMonth,
    draft: input.draft,
  })
  if (currentToken !== input.previewToken) {
    throw new StaleGoalLifecyclePreviewError({ proposal, previewToken: currentToken })
  }
  return proposal
}

function getLifecyclePlannedContribution(
  lockedProfile: { plannedMonthlyContribution?: string | null },
  state: GoalLifecycleState,
 ): string | null {
  return lockedProfile.plannedMonthlyContribution ?? state.source.profile?.plannedMonthlyContribution ?? null
}

async function confirmGoalLifecycleTransaction(
  tx: any,
  lockedProfile: { plannedMonthlyContribution?: string | null },
  input: {
    userId: string
    goalId: string
    lifecycle: GoalLifecycle
    currentMonth: string
    draft?: { allocations?: Array<{ goalId: string; percentage: string }> }
    previewToken: string
  },
): Promise<void> {
  const state = await getGoalLifecycleStateWithExecutor(tx, input.userId, input.currentMonth)
  if (!state) throw new Error('Financial profile not found.')
  const proposal = requireCurrentLifecycleProposal(state, input)
  const plannedMonthlyContribution = getLifecyclePlannedContribution(lockedProfile, state)
  await tx
    .update(financialGoals)
    .set({ status: proposal.nextStatus })
    .where(and(eq(financialGoals.id, input.goalId), eq(financialGoals.userId, input.userId)))
  await persistGoalAllocationPlan({
    tx,
    userId: input.userId,
    allocation: proposal.persistedAllocation,
    plannedMonthlyContribution,
    pauseMonthlyCommitment: proposal.pauseMonthlyCommitment,
  })
}

export function createGoalCreationPreviewToken(
  state: GoalCreationState,
  currentMonth: string,
  draft?: GoalCreationDraft,
): string {
  return createHash('sha256')
    .update(serializeGoalCreationState(state, currentMonth, draft))
    .digest('hex')
}

export function createGoalEditPreviewToken(
  state: GoalCreationState,
  currentMonth: string,
  goalId: string,
  draft?: GoalCreationDraft,
): string {
  return createHash('sha256')
    .update(serializeGoalEditState(state, currentMonth, goalId, draft))
    .digest('hex')
}

export function createAllocationChangePreviewToken(
  state: AllocationChangeState,
  currentMonth: string,
  draft?: AllocationChangeDraft,
): string {
  return createHash('sha256')
    .update(serializeAllocationChangeState(state, currentMonth, draft))
    .digest('hex')
}

export function createGoalLifecyclePreviewToken(
  lifecycle: GoalLifecycle,
  goalId: string,
  state: GoalLifecycleState,
  currentMonth: string,
  draft?: {
    allocations?: Array<{
      goalId: string
      percentage: string
    }>
  },
): string {
  return createHash('sha256')
    .update(serializeGoalLifecycleState(lifecycle, goalId, state, currentMonth, draft))
    .digest('hex')
}

function mapProfileRow(profile: FinancialProfile): NonNullable<GoalsWorkspaceSource['profile']> {
  return {
    userId: profile.userId,
    baseCurrency: profile.baseCurrency as CurrencyCode,
    expensesKnowledge: profile.expensesKnowledge,
    plannedMonthlyContribution: profile.plannedMonthlyContribution,
    goalDedicationPercentage: profile.goalDedicationPercentage,
    onboardingCompleted: profile.onboardingCompleted,
  }
}

function mapIncomeRow(income: Income): NonNullable<GoalsWorkspaceSource['incomes']>[number] {
  return {
    id: income.id,
    sourceKind: income.sourceKind,
    sourceId: income.sourceId,
    sourceName: income.sourceKind,
    concept: income.concept,
    amount: income.amount,
    currency: income.currency as 'ARS' | 'USD',
    recurring: income.recurring,
    effectiveMonth: income.effectiveMonth,
  }
}

function mapExpenseRow(expense: Expense): NonNullable<GoalsWorkspaceSource['expenses']>[number] {
  return {
    id: expense.id,
    sourceKind: expense.sourceKind,
    sourceId: expense.sourceId,
    sourceName: expense.sourceKind,
    concept: expense.concept,
    amount: expense.amount,
    currency: expense.currency as 'ARS' | 'USD',
    recurring: expense.recurring,
    effectiveMonth: expense.effectiveMonth,
    endMonth: expense.endMonth,
  }
}

function mapGoalRow(goal: FinancialGoal): GoalsWorkspaceSource['goals'][number] {
  return {
    id: goal.id,
    userId: goal.userId,
    name: goal.name,
    type: goal.type,
    targetAmount: goal.targetAmount,
    currency: goal.currency as CurrencyCode,
    priority: goal.priority as GoalPriority,
    strategy: goal.strategy as GoalStrategy,
    status: goal.status as GoalStatus,
    desiredDate: goal.desiredDate,
    completedAt: goal.completedAt instanceof Date ? goal.completedAt.toISOString() : (goal.completedAt ?? null),
    emergencyFundMonths: goal.emergencyFundMonths,
    createdAt: goal.createdAt instanceof Date ? goal.createdAt.toISOString() : String(goal.createdAt),
  }
}

function mapSavingsPositionRow(position: GoalSavingsPosition) {
  return {
    id: position.id,
    goalId: position.goalId,
    amount: position.amount,
    currency: position.currency as CurrencyCode,
  }
}

function mapInvestmentPositionRow(position: GoalInvestmentPosition) {
  return {
    id: position.id,
    goalId: position.goalId,
    currentValue: position.currentValue,
    currency: position.currency as CurrencyCode,
    annualReturnRate: position.annualReturnRate,
    availability: position.availability as InvestmentAvailability,
    availableFrom: position.availableFrom,
  }
}

function mapContributionRow(
  contribution:
    | NonNullable<GoalsWorkspaceRows['contributions']>[number]
    | NonNullable<GoalsWorkspaceRows['savingContributions']>[number],
) {
  return {
    id: contribution.id,
    kind: (contribution.kind ?? 'saving') as ContributionKind,
    userId: contribution.userId,
    amount: contribution.amount,
    currency: contribution.currency as CurrencyCode,
    placeId: contribution.placeId,
    placeName: contribution.placeName,
    arsSpent: contribution.arsSpent,
    effectiveRate: contribution.effectiveRate,
    createdAt: contribution.createdAt instanceof Date
      ? contribution.createdAt.toISOString()
      : String(contribution.createdAt),
    allocations: (contribution.allocations ?? []).map((allocation) => ({
      goalId: allocation.goalId,
      goalName: allocation.goalName,
      amount: allocation.amount,
      percentage: allocation.percentage,
    })),
  }
}

function mapCompletionWithdrawalRow(
  withdrawal: NonNullable<GoalsWorkspaceRows['completionWithdrawals']>[number],
) {
  return {
    id: withdrawal.id,
    goalId: withdrawal.goalId,
    placeId: withdrawal.placeId,
    placeName: withdrawal.placeName,
    amount: withdrawal.amount,
    currency: withdrawal.currency as CurrencyCode,
    createdAt: withdrawal.createdAt instanceof Date
      ? withdrawal.createdAt.toISOString()
      : String(withdrawal.createdAt),
  }
}

function mapContributionRows(
  contributions: GoalsWorkspaceRows['contributions'] | GoalsWorkspaceRows['savingContributions'],
) {
  return (contributions ?? []).map(mapContributionRow)
}

export function mapRowsToGoalsWorkspaceSource(rows: GoalsWorkspaceRows): GoalsWorkspaceSource {
  const contributions = getWorkspaceContributions(rows)
  return {
    profile: mapProfileRow(rows.profile),
    incomes: (rows.incomes ?? []).map(mapIncomeRow),
    expenses: (rows.expenses ?? []).map(mapExpenseRow),
    goals: rows.goals.map(mapGoalRow),
    savingsPositions: rows.savingsPositions.map(mapSavingsPositionRow),
    investmentPositions: rows.investmentPositions.map(mapInvestmentPositionRow),
    snapshots: rows.snapshots.map(mapSnapshot),
    allocations: rows.allocations.map(mapAllocation),
    contributions: mapContributionRows(contributions),
    savingContributions: mapContributionRows(contributions),
    completionWithdrawals: (rows.completionWithdrawals ?? []).map(mapCompletionWithdrawalRow),
  }
}

function getWorkspaceContributions(rows: GoalsWorkspaceRows) {
  return rows.contributions ?? rows.savingContributions
}

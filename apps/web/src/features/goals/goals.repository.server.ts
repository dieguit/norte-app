import '@tanstack/react-start/server-only'
import { createHash } from 'node:crypto'
import BigNumber from 'bignumber.js'
import { db } from '../../db/client'
import { and, eq } from 'drizzle-orm'
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

  const goalIds = goals.map((g: any) => g.id)
  const savingsPositions =
    goalIds.length > 0
      ? await executor.query.goalSavingsPositions.findMany({
          where: (pos: any, { inArray }: any) => inArray(pos.goalId, goalIds),
        })
      : []

  const investmentPositions =
    goalIds.length > 0
      ? await executor.query.goalInvestmentPositions.findMany({
          where: (pos: any, { inArray }: any) => inArray(pos.goalId, goalIds),
        })
      : []

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

export async function getGoalsWorkspaceRows(
  userId: string,
  currentMonth: string,
): Promise<GoalsWorkspaceRows | null> {
  const base = await getOwnedGoalPlanBase(db, userId)
  if (!base) {
    return null
  }

  const snapshots = selectWinningSnapshots(base.snapshots, currentMonth)
  const nextMonth = getNextCalendarMonth(new Date(`${currentMonth.slice(0, 7)}-01T00:00:00Z`))
  snapshots.push(...base.snapshots.filter(
    (snapshot: AllocationPlanSnapshot) => snapshot.effectiveMonth.slice(0, 7) === nextMonth &&
      snapshots.every((selected) => selected.id !== snapshot.id),
  ))
  const snapshotIds = snapshots.map((s) => s.id)

  const allocations =
    snapshotIds.length > 0
      ? await db.query.allocationPlanEntries.findMany({
          where: (allocsTable: any, { inArray }: any) => inArray(allocsTable.snapshotId, snapshotIds),
        })
      : []

  const userSavingContributions = await db.query.savingContributions.findMany({
    where: (contribTable: any, { eq }: any) => eq(contribTable.userId, userId),
  })

  const savingContributionIds = userSavingContributions.map((c: any) => c.id)
  const savingAllocations =
    savingContributionIds.length > 0
      ? await db.query.savingContributionAllocations.findMany({
          where: (allocTable: any, { inArray }: any) => inArray(allocTable.contributionId, savingContributionIds),
        })
      : []

  const savingsPlaces = await db.query.savingsPlaces.findMany({
    where: (placeTable: any, { eq }: any) => eq(placeTable.userId, userId),
  })
  const placeNameMap = new Map<string, string>(savingsPlaces.map((p: any) => [p.id, p.name]))
  const goalIds = base.goals.map((goal: any) => goal.id)
  const completionRows =
    goalIds.length > 0 && savingsPlaces.length > 0
      ? await db.query.goalCompletionWithdrawals.findMany({
          where: (withdrawalsTable: any, { and, inArray }: any) =>
            and(inArray(withdrawalsTable.placeId, savingsPlaces.map((place: any) => place.id)), inArray(withdrawalsTable.goalId, goalIds)),
        })
      : []
  const completionWithdrawals = completionRows
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

  const userInvestmentContributions = await db.query.investmentContributions.findMany({
    where: (contribTable: any, { eq }: any) => eq(contribTable.userId, userId),
  })

  const investmentContributionIds = userInvestmentContributions.map((c: any) => c.id)
  const investmentAllocations =
    investmentContributionIds.length > 0
      ? await db.query.investmentContributionAllocations.findMany({
          where: (allocTable: any, { inArray }: any) => inArray(allocTable.contributionId, investmentContributionIds),
        })
      : []

  const goalNameMap = new Map<string, string>(base.goals.map((g: any) => [g.id, g.name]))

  const mappedSavingContributions = userSavingContributions.map((contrib: any) => ({
    id: contrib.id,
    kind: 'saving' as const,
    userId: contrib.userId,
    amount: contrib.amount,
    currency: contrib.currency,
    placeId: contrib.placeId,
    placeName: placeNameMap.get(contrib.placeId) ?? '',
    arsSpent: contrib.arsSpent,
    effectiveRate: contrib.effectiveRate,
    createdAt: contrib.createdAt,
    allocations: savingAllocations
      .filter((a: any) => a.contributionId === contrib.id)
      .map((a: any) => ({
        goalId: String(a.goalId),
        goalName: String(goalNameMap.get(a.goalId) ?? ''),
        amount: String(a.amount),
        percentage: String(a.percentage),
      })),
  }))

  const mappedInvestmentContributions = userInvestmentContributions.map((contrib: any) => ({
    id: contrib.id,
    kind: 'investment' as const,
    userId: contrib.userId,
    amount: contrib.amount,
    currency: contrib.currency,
    arsSpent: contrib.arsSpent,
    effectiveRate: contrib.effectiveRate,
    createdAt: contrib.createdAt,
    allocations: investmentAllocations
      .filter((a: any) => a.contributionId === contrib.id)
      .map((a: any) => ({
        goalId: String(a.goalId),
        goalName: String(goalNameMap.get(a.goalId) ?? ''),
        amount: String(a.amount),
        percentage: String(a.percentage),
      })),
  }))

  const getTime = (d: Date | string) => (d instanceof Date ? d.getTime() : new Date(d).getTime())
  const allContributions = [...mappedSavingContributions, ...mappedInvestmentContributions].sort(
    (a, b) => getTime(b.createdAt) - getTime(a.createdAt),
  )

  return {
    ...base,
    snapshots,
    allocations,
    contributions: allContributions,
    savingContributions: allContributions,
    completionWithdrawals,
  }
}

export function mapSnapshot(s: AllocationPlanSnapshot): GoalsWorkspaceSource['snapshots'][number] {
  return {
    id: s.id,
    userId: s.userId,
    effectiveMonth: s.effectiveMonth,
  }
}

export function mapAllocation(a: AllocationPlanEntry): GoalsWorkspaceSource['allocations'][number] {
  return {
    id: a.id,
    snapshotId: a.snapshotId,
    goalId: a.goalId,
    percentage: a.percentage,
  }
}

export async function getActiveGoalPlanStateWithExecutor(
  executor: any,
  userId: string,
  currentMonth: string,
): Promise<AllocationChangeState | null> {
  const base = await getOwnedGoalPlanBase(executor, userId)
  if (!base) {
    return null
  }

  const nextMonth = `${getNextCalendarMonth(new Date(`${currentMonth.slice(0, 7)}-01T00:00:00Z`))}-01`
  const currentSnapshots = selectWinningSnapshots(base.snapshots, currentMonth)
  const pendingSnapshots = base.snapshots.filter((snapshot: any) => snapshot.effectiveMonth.slice(0, 7) === nextMonth.slice(0, 7))
  const selectedIds = new Set([...currentSnapshots, ...pendingSnapshots].map((snapshot: any) => snapshot.id))
  const selectedSnapshotIds = Array.from(selectedIds)

  const allocations =
    selectedSnapshotIds.length > 0
      ? await executor.query.allocationPlanEntries.findMany({
          where: (allocsTable: any, { inArray }: any) => inArray(allocsTable.snapshotId, selectedSnapshotIds),
        })
      : []

  const currentSnapshotIds = new Set(currentSnapshots.map((s: any) => s.id))
  const pendingSnapshotIds = new Set(pendingSnapshots.map((s: any) => s.id))

  return {
    source: mapRowsToGoalsWorkspaceSource({
      profile: base.profile,
      goals: base.goals.filter((goal: any) => goal.status === 'active'),
      savingsPositions: base.savingsPositions,
      investmentPositions: base.investmentPositions,
      snapshots: currentSnapshots,
      allocations: allocations.filter((allocation: any) => currentSnapshotIds.has(allocation.snapshotId)),
      incomes: base.incomes,
      expenses: base.expenses,
    }),
    pendingSnapshots: pendingSnapshots.map(mapSnapshot),
    pendingAllocations: allocations
      .filter((allocation: any) => pendingSnapshotIds.has(allocation.snapshotId))
      .map(mapAllocation),
  }
}

export async function getGoalCreationStateWithExecutor(
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

export async function getGoalEditStateWithExecutor(
  executor: any,
  userId: string,
  currentMonth: string,
  goalId: string,
): Promise<GoalCreationState | null> {
  const base = await getOwnedGoalPlanBase(executor, userId)
  if (!base) {
    return null
  }

  const goal = base.goals.find((g: any) => g.id === goalId)
  if (!goal) {
    throw new Error('Goal not found or is not active.')
  }
  if (goal.status === 'completed') {
    throw new Error('Cannot edit a completed goal.')
  }
  if (goal.status !== 'active' && goal.status !== 'paused') {
    throw new Error('Goal not found or is not active.')
  }

  const nextMonth = `${getNextCalendarMonth(new Date(`${currentMonth.slice(0, 7)}-01T00:00:00Z`))}-01`
  const currentSnapshots = selectWinningSnapshots(base.snapshots, currentMonth)
  const pendingSnapshots = base.snapshots.filter(
    (snapshot: any) => snapshot.effectiveMonth.slice(0, 7) === nextMonth.slice(0, 7),
  )
  const selectedIds = new Set([...currentSnapshots, ...pendingSnapshots].map((snapshot: any) => snapshot.id))
  const selectedSnapshotIds = Array.from(selectedIds)

  const allocations =
    selectedSnapshotIds.length > 0
      ? await executor.query.allocationPlanEntries.findMany({
          where: (allocsTable: any, { inArray }: any) =>
            inArray(allocsTable.snapshotId, selectedSnapshotIds),
        })
      : []

  const currentSnapshotIds = new Set(currentSnapshots.map((s: any) => s.id))
  const pendingSnapshotIds = new Set(pendingSnapshots.map((s: any) => s.id))

  return {
    source: mapRowsToGoalsWorkspaceSource({
      profile: base.profile,
      goals: base.goals,
      savingsPositions: base.savingsPositions,
      investmentPositions: base.investmentPositions,
      snapshots: currentSnapshots,
      allocations: allocations.filter((allocation: any) =>
        currentSnapshotIds.has(allocation.snapshotId),
      ),
      incomes: base.incomes,
      expenses: base.expenses,
    }),
    pendingSnapshots: pendingSnapshots.map(mapSnapshot),
    pendingAllocations: allocations
      .filter((allocation: any) => pendingSnapshotIds.has(allocation.snapshotId))
      .map(mapAllocation),
  }
}

export async function getGoalEditState(
  userId: string,
  currentMonth: string,
  goalId: string,
): Promise<GoalCreationState | null> {
  return getGoalEditStateWithExecutor(db, userId, currentMonth, goalId)
}

export async function getAllocationChangeStateWithExecutor(
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

  const nextMonth = `${getNextCalendarMonth(new Date(`${currentMonth.slice(0, 7)}-01T00:00:00Z`))}-01`
  const currentSnapshots = selectWinningSnapshots(base.snapshots, currentMonth)
  const pendingSnapshots = base.snapshots.filter(
    (snapshot: any) => snapshot.effectiveMonth.slice(0, 7) === nextMonth.slice(0, 7),
  )
  const selectedIds = new Set([...currentSnapshots, ...pendingSnapshots].map((snapshot: any) => snapshot.id))
  const selectedSnapshotIds = Array.from(selectedIds)

  const allocations =
    selectedSnapshotIds.length > 0
      ? await executor.query.allocationPlanEntries.findMany({
          where: (allocsTable: any, { inArray }: any) =>
            inArray(allocsTable.snapshotId, selectedSnapshotIds),
        })
      : []

  const currentSnapshotIds = new Set(currentSnapshots.map((s: any) => s.id))
  const pendingSnapshotIds = new Set(pendingSnapshots.map((s: any) => s.id))

  return {
    source: mapRowsToGoalsWorkspaceSource({
      profile: base.profile,
      goals: base.goals,
      savingsPositions: base.savingsPositions,
      investmentPositions: base.investmentPositions,
      snapshots: currentSnapshots,
      allocations: allocations.filter((allocation: any) =>
        currentSnapshotIds.has(allocation.snapshotId),
      ),
      incomes: base.incomes,
      expenses: base.expenses,
    }),
    pendingSnapshots: pendingSnapshots.map(mapSnapshot),
    pendingAllocations: allocations
      .filter((allocation: any) => pendingSnapshotIds.has(allocation.snapshotId))
      .map(mapAllocation),
  }
}

export async function getGoalLifecycleState(
  userId: string,
  currentMonth: string,
): Promise<GoalLifecycleState | null> {
  return getGoalLifecycleStateWithExecutor(db, userId, currentMonth)
}

export async function replacePendingAllocationSnapshot(
  tx: any,
  userId: string,
  allocation: GoalCreationAllocation | { effectiveMonth: string; entries?: any[] },
  plannedMonthlyContribution?: string | null,
): Promise<string> {
  const existingSnapshot = await tx.query.allocationPlanSnapshots.findFirst({
    where: (snapshots: any, { and, eq }: any) =>
      and(
        eq(snapshots.userId, userId),
        eq(snapshots.effectiveMonth, allocation.effectiveMonth),
      ),
  })

  if (existingSnapshot) {
    if (plannedMonthlyContribution !== undefined) {
      await tx
        .update(allocationPlanSnapshots)
        .set({ plannedMonthlyContribution: plannedMonthlyContribution ?? null })
        .where(eq(allocationPlanSnapshots.id, existingSnapshot.id))
    }
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

export async function confirmGoalCreationInRepository(input: {
  userId: string
  currentMonth: string
  draft: GoalCreationDraft
  previewToken: string
}): Promise<{ goalId: string }> {
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

    if (!lockedProfile.length) {
      throw new Error('Financial profile not found.')
    }

    const state = await getGoalCreationStateWithExecutor(tx, userId, currentMonth)
    if (!state) throw new Error('Financial profile not found.')

    const currentToken = createGoalCreationPreviewToken(state, currentMonth, draft)
    const proposal = buildGoalCreationProposal({ draft, state, currentMonth })
    if (currentToken !== previewToken) {
      throw new StaleGoalCreationPreviewError({ proposal, previewToken: currentToken })
    }

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

    if (proposal.investment) {
      await tx.insert(goalInvestmentPositions).values({
        goalId: goal.id,
        currentValue: '0.00',
        currency: proposal.normalizedGoal.currency,
        annualReturnRate: proposal.investment.annualReturnRate,
        availability: proposal.investment.availability,
        availableFrom: proposal.investment.availableFrom,
      })
    }

    const snapshotId = await replacePendingAllocationSnapshot(
      tx,
      userId,
      proposal.allocation,
      lockedProfile[0]?.plannedMonthlyContribution ?? state.source.profile?.plannedMonthlyContribution ?? null,
    )
    await tx.delete(allocationPlanEntries).where(eq(allocationPlanEntries.snapshotId, snapshotId))
    await tx.insert(allocationPlanEntries).values(
      proposal.allocation.entries.map((entry) => ({
        snapshotId,
        goalId: entry.goalId === PENDING_GOAL_ID ? goal.id : entry.goalId,
        percentage: entry.percentage,
      })),
    )

    return { goalId: goal.id }
  })
}

export async function confirmAllocationChangeInRepository(input: {
  userId: string
  currentMonth: string
  draft: AllocationChangeDraft
  previewToken: string
}): Promise<void> {
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

    if (!lockedProfile.length) {
      throw new Error('Financial profile not found.')
    }

    const state = await getAllocationChangeStateWithExecutor(tx, userId, currentMonth)
    if (!state) throw new Error('Financial profile not found.')

    const currentToken = createAllocationChangePreviewToken(state, currentMonth, draft)
    const proposal = buildAllocationChangeProposal({ draft, state, currentMonth })
    if (currentToken !== previewToken) {
      throw new StaleAllocationChangePreviewError({ proposal, previewToken: currentToken })
    }

    await tx
      .update(financialProfiles)
      .set({
        goalDedicationPercentage: new BigNumber(draft.dedicationPercentage).toFixed(2),
        plannedMonthlyContribution: proposal.allocation.monthlyContribution?.amount ?? '0.00',
      })
      .where(eq(financialProfiles.userId, userId))

    const snapshotId = await replacePendingAllocationSnapshot(
      tx,
      userId,
      proposal.allocation,
      proposal.allocation.monthlyContribution?.amount ?? '0.00',
    )
    await tx.delete(allocationPlanEntries).where(eq(allocationPlanEntries.snapshotId, snapshotId))
    await tx.insert(allocationPlanEntries).values(
      proposal.allocation.entries.map((entry) => ({
        snapshotId,
        goalId: entry.goalId,
        percentage: entry.percentage,
      })),
    )
  })
}

export async function confirmGoalEditInRepository(input: {
  userId: string
  goalId: string
  currentMonth: string
  draft: GoalCreationDraft
  previewToken: string
}): Promise<void> {
  const { userId, goalId, currentMonth, draft, previewToken } = input

  return db.transaction(async (tx) => {
    const lockedProfile = await tx
      .select({
        userId: financialProfiles.userId,
        plannedMonthlyContribution: financialProfiles.plannedMonthlyContribution,
      })
      .from(financialProfiles)
      .where(eq(financialProfiles.userId, userId))
      .for('update')

    if (!lockedProfile.length) {
      throw new Error('Financial profile not found.')
    }

    const state = await getGoalEditStateWithExecutor(tx, userId, currentMonth, goalId)
    if (!state) throw new Error('Financial profile not found.')

    const selectedGoal = state.source.goals.find(
      (g) => g.id === goalId && (g.status === 'active' || g.status === 'paused'),
    )
    if (!selectedGoal) {
      throw new Error('Goal not found or is not active.')
    }

    if (
      draft.type !== selectedGoal.type ||
      draft.currency !== selectedGoal.currency ||
      draft.strategy !== selectedGoal.strategy
    ) {
      throw new Error('Cannot modify immutable goal fields (type, currency, strategy).')
    }

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

    const snapshotId = await replacePendingAllocationSnapshot(
      tx,
      userId,
      proposal.allocation,
      lockedProfile[0]?.plannedMonthlyContribution ?? state.source.profile?.plannedMonthlyContribution ?? null,
    )
    await tx.delete(allocationPlanEntries).where(eq(allocationPlanEntries.snapshotId, snapshotId))
    if (proposal.allocation.entries.length > 0) {
      await tx.insert(allocationPlanEntries).values(
        proposal.allocation.entries.map((entry) => ({
          snapshotId,
          goalId: entry.goalId,
          percentage: entry.percentage,
        })),
      )
    }
  })
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
  const { userId, goalId, lifecycle, currentMonth, draft, previewToken } = input

  return db.transaction(async (tx) => {
    const lockedProfile = await tx
      .select({
        userId: financialProfiles.userId,
        plannedMonthlyContribution: financialProfiles.plannedMonthlyContribution,
      })
      .from(financialProfiles)
      .where(eq(financialProfiles.userId, userId))
      .for('update')

    if (!lockedProfile.length) {
      throw new Error('Financial profile not found.')
    }

    const state = await getGoalLifecycleStateWithExecutor(tx, userId, currentMonth)
    if (!state) throw new Error('Financial profile not found.')

    const currentToken = createGoalLifecyclePreviewToken(
      lifecycle,
      goalId,
      state,
      currentMonth,
      draft,
    )
    const proposal = buildGoalLifecycleProposal({
      lifecycle,
      goalId,
      state,
      currentMonth,
      draft,
    })

    if (currentToken !== previewToken) {
      throw new StaleGoalLifecyclePreviewError({ proposal, previewToken: currentToken })
    }

    await tx
      .update(financialGoals)
      .set({ status: proposal.nextStatus })
      .where(and(eq(financialGoals.id, goalId), eq(financialGoals.userId, userId)))

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
        : (lockedProfile[0]?.plannedMonthlyContribution ?? state.source.profile?.plannedMonthlyContribution ?? null),
    )
    await tx.delete(allocationPlanEntries).where(eq(allocationPlanEntries.snapshotId, snapshotId))
    if (proposal.persistedAllocation.entries.length > 0) {
      await tx.insert(allocationPlanEntries).values(
        proposal.persistedAllocation.entries.map(({ goalId: entryGoalId, percentage }) => ({
          snapshotId,
          goalId: entryGoalId,
          percentage,
        })),
      )
    }
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

export function mapRowsToGoalsWorkspaceSource(rows: GoalsWorkspaceRows): GoalsWorkspaceSource {
  return {
    profile: {
      userId: rows.profile.userId,
      baseCurrency: rows.profile.baseCurrency as CurrencyCode,
      expensesKnowledge: rows.profile.expensesKnowledge,
      plannedMonthlyContribution: rows.profile.plannedMonthlyContribution,
      goalDedicationPercentage: rows.profile.goalDedicationPercentage,
      onboardingCompleted: rows.profile.onboardingCompleted,
    },
    incomes: (rows.incomes ?? []).map((income) => ({
      id: income.id,
      sourceKind: income.sourceKind,
      sourceId: income.sourceId,
      sourceName: income.sourceKind,
      concept: income.concept,
      amount: income.amount,
      currency: income.currency as 'ARS' | 'USD',
      recurring: income.recurring,
      effectiveMonth: income.effectiveMonth,
    })),
    expenses: (rows.expenses ?? []).map((expense) => ({
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
    })),
    goals: rows.goals.map((g) => ({
      id: g.id,
      userId: g.userId,
      name: g.name,
      type: g.type,
      targetAmount: g.targetAmount,
      currency: g.currency as CurrencyCode,
      priority: g.priority as GoalPriority,
      strategy: g.strategy as GoalStrategy,
      status: g.status as GoalStatus,
      desiredDate: g.desiredDate,
      completedAt: g.completedAt instanceof Date ? g.completedAt.toISOString() : (g.completedAt ?? null),
      emergencyFundMonths: g.emergencyFundMonths,
      createdAt: g.createdAt instanceof Date ? g.createdAt.toISOString() : String(g.createdAt),
    })),
    savingsPositions: rows.savingsPositions.map((p) => ({
      id: p.id,
      goalId: p.goalId,
      amount: p.amount,
      currency: p.currency as CurrencyCode,
    })),
    investmentPositions: rows.investmentPositions.map((p) => ({
      id: p.id,
      goalId: p.goalId,
      currentValue: p.currentValue,
      currency: p.currency as CurrencyCode,
      annualReturnRate: p.annualReturnRate,
      availability: p.availability as InvestmentAvailability,
      availableFrom: p.availableFrom,
    })),
    snapshots: rows.snapshots.map(mapSnapshot),
    allocations: rows.allocations.map(mapAllocation),
    contributions: (rows.contributions ?? rows.savingContributions ?? []).map((c) => ({
      id: c.id,
      kind: (c.kind ?? 'saving') as ContributionKind,
      userId: c.userId,
      amount: c.amount,
      currency: c.currency as CurrencyCode,
      placeId: c.placeId,
      placeName: c.placeName,
      arsSpent: c.arsSpent,
      effectiveRate: c.effectiveRate,
      createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : String(c.createdAt),
      allocations: (c.allocations ?? []).map((a) => ({
        goalId: a.goalId,
        goalName: a.goalName,
        amount: a.amount,
        percentage: a.percentage,
      })),
    })),
    savingContributions: (rows.contributions ?? rows.savingContributions ?? []).map((c) => ({
      id: c.id,
      kind: (c.kind ?? 'saving') as ContributionKind,
      userId: c.userId,
      amount: c.amount,
      currency: c.currency as CurrencyCode,
      placeId: c.placeId,
      placeName: c.placeName,
      arsSpent: c.arsSpent,
      effectiveRate: c.effectiveRate,
      createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : String(c.createdAt),
      allocations: (c.allocations ?? []).map((a) => ({
        goalId: a.goalId,
        goalName: a.goalName,
        amount: a.amount,
        percentage: a.percentage,
      })),
    })),
    completionWithdrawals: (rows.completionWithdrawals ?? []).map((withdrawal) => ({
      id: withdrawal.id,
      goalId: withdrawal.goalId,
      placeId: withdrawal.placeId,
      placeName: withdrawal.placeName,
      amount: withdrawal.amount,
      currency: withdrawal.currency as CurrencyCode,
      createdAt: withdrawal.createdAt instanceof Date
        ? withdrawal.createdAt.toISOString()
        : String(withdrawal.createdAt),
    })),
  }
}

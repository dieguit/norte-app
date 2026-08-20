import '@tanstack/react-start/server-only'
import { createHash } from 'node:crypto'
import { db } from '../../db/client'
import { eq } from 'drizzle-orm'
import {
  allocationPlanEntries,
  allocationPlanSnapshots,
  financialGoals,
  financialProfiles,
  goalInvestmentPositions,
  type AllocationPlanEntry,
  type AllocationPlanSnapshot,
  type FinancialGoal,
  type FinancialProfile,
  type GoalInvestmentPosition,
  type GoalSavingsPosition,
} from '../../db/schema'
import type {
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

export class StaleGoalCreationPreviewError extends Error {
  readonly code = 'STALE_GOAL_CREATION_PREVIEW'

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

export interface GoalsWorkspaceRows {
  profile: FinancialProfile
  goals: FinancialGoal[]
  savingsPositions: GoalSavingsPosition[]
  investmentPositions: GoalInvestmentPosition[]
  snapshots: AllocationPlanSnapshot[]
  allocations: AllocationPlanEntry[]
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

  const goals = await executor.query.financialGoals.findMany({
    where: (goalsTable: any, { eq }: any) => eq(goalsTable.userId, userId),
  })

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
  const snapshotIds = snapshots.map((s) => s.id)

  const allocations =
    snapshotIds.length > 0
      ? await db.query.allocationPlanEntries.findMany({
          where: (allocsTable: any, { inArray }: any) => inArray(allocsTable.snapshotId, snapshotIds),
        })
      : []

  return {
    ...base,
    snapshots,
    allocations,
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

export async function replacePendingAllocationSnapshot(
  tx: any,
  userId: string,
  allocation: GoalCreationAllocation,
): Promise<string> {
  const existingSnapshot = await tx.query.allocationPlanSnapshots.findFirst({
    where: (snapshots: any, { and, eq }: any) =>
      and(
        eq(snapshots.userId, userId),
        eq(snapshots.effectiveMonth, allocation.effectiveMonth),
      ),
  })

  if (existingSnapshot) {
    return existingSnapshot.id
  }

  const [insertedSnapshot] = await tx
    .insert(allocationPlanSnapshots)
    .values({
      userId,
      effectiveMonth: allocation.effectiveMonth,
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
      .select({ userId: financialProfiles.userId })
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

    const snapshotId = await replacePendingAllocationSnapshot(tx, userId, proposal.allocation)
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
      .select({ userId: financialProfiles.userId })
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

    const snapshotId = await replacePendingAllocationSnapshot(tx, userId, proposal.allocation)
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

export function createGoalCreationPreviewToken(
  state: GoalCreationState,
  currentMonth: string,
  draft?: GoalCreationDraft,
): string {
  return createHash('sha256')
    .update(serializeGoalCreationState(state, currentMonth, draft))
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

export function mapRowsToGoalsWorkspaceSource(rows: GoalsWorkspaceRows): GoalsWorkspaceSource {
  return {
    profile: {
      userId: rows.profile.userId,
      baseCurrency: rows.profile.baseCurrency as CurrencyCode,
      approximateMonthlyIncome: rows.profile.approximateMonthlyIncome,
      approximateMonthlyExpenses: rows.profile.approximateMonthlyExpenses,
      expensesKnowledge: rows.profile.expensesKnowledge,
      plannedMonthlyContribution: rows.profile.plannedMonthlyContribution,
      onboardingCompleted: rows.profile.onboardingCompleted,
    },
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
      location: p.location,
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
  }
}

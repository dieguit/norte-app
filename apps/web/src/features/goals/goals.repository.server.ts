import '@tanstack/react-start/server-only'
import { createHash } from 'node:crypto'
import { db } from '../../db/client'
import { eq } from 'drizzle-orm'
import {
  channelPlanAllocations,
  channelPlanSnapshots,
  contributionChannels,
  financialGoals,
  financialProfiles,
  goalInvestmentPositions,
  type ChannelPlanAllocation,
  type ChannelPlanSnapshot,
  type ContributionChannel,
  type FinancialGoal,
  type FinancialProfile,
  type GoalInvestmentPosition,
  type GoalSavingsPosition,
} from '../../db/schema'
import type {
  GoalPriority,
  GoalStatus,
  GoalsWorkspaceSource,
  InvestmentAvailability,
} from './goals'
import type { CurrencyCode } from '../../lib/money'
import { getNextCalendarMonth, type FundingMethod } from '../financial/financial'
import {
  PENDING_GOAL_ID,
  buildGoalCreationProposal,
  serializeGoalCreationState,
  type GoalCreationAllocationGroup,
  type GoalCreationPreviewResult,
  type GoalCreationState,
} from './goal-creation'
import type { GoalCreationDraft } from './goal-creation.schema'

export class StaleGoalCreationPreviewError extends Error {
  readonly code = 'STALE_GOAL_CREATION_PREVIEW'

  constructor(readonly refreshedPreview: GoalCreationPreviewResult) {
    super('Tu Plan cambió mientras revisabas el impacto.')
  }
}

export interface GoalsWorkspaceRows {
  profile: FinancialProfile
  goals: FinancialGoal[]
  savingsPositions: GoalSavingsPosition[]
  investmentPositions: GoalInvestmentPosition[]
  channels: ContributionChannel[]
  snapshots: ChannelPlanSnapshot[]
  allocations: ChannelPlanAllocation[]
}

export function selectWinningSnapshots(
  snapshots: ChannelPlanSnapshot[],
  currentMonth: string,
): ChannelPlanSnapshot[] {
  const currentYM = currentMonth.slice(0, 7)
  const byChannel = new Map<string, ChannelPlanSnapshot[]>()

  for (const snapshot of snapshots) {
    const list = byChannel.get(snapshot.channelId) ?? []
    list.push(snapshot)
    byChannel.set(snapshot.channelId, list)
  }

  const selected: ChannelPlanSnapshot[] = []

  for (const channelSnapshots of byChannel.values()) {
    const onOrBefore = channelSnapshots.filter(
      (s) => s.effectiveMonth.slice(0, 7) <= currentYM,
    )
    if (onOrBefore.length > 0) {
      onOrBefore.sort((a, b) => b.effectiveMonth.localeCompare(a.effectiveMonth))
      selected.push(onOrBefore[0])
    } else {
      const upcoming = [...channelSnapshots]
      upcoming.sort((a, b) => a.effectiveMonth.localeCompare(b.effectiveMonth))
      if (upcoming.length > 0) {
        selected.push(upcoming[0])
      }
    }
  }

  return selected
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

  const channels = await executor.query.contributionChannels.findMany({
    where: (channelsTable: any, { eq }: any) => eq(channelsTable.userId, userId),
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

  const channelIds = channels.map((c: any) => c.id)
  const snapshots =
    channelIds.length > 0
      ? await executor.query.channelPlanSnapshots.findMany({
          where: (snapshotsTable: any, { inArray }: any) => inArray(snapshotsTable.channelId, channelIds),
        })
      : []

  return {
    profile,
    goals,
    savingsPositions,
    investmentPositions,
    channels,
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
      ? await db.query.channelPlanAllocations.findMany({
          where: (allocsTable, { inArray }) => inArray(allocsTable.snapshotId, snapshotIds),
        })
      : []

  return {
    ...base,
    snapshots,
    allocations,
  }
}

export function mapSnapshot(s: ChannelPlanSnapshot): GoalsWorkspaceSource['snapshots'][number] {
  return {
    id: s.id,
    channelId: s.channelId,
    monthlyCommitmentAmount: s.monthlyCommitmentAmount,
    baseCurrency: s.baseCurrency as CurrencyCode,
    commitmentStatus: s.commitmentStatus as 'active' | 'paused',
    effectiveMonth: s.effectiveMonth,
  }
}

export function mapAllocation(a: ChannelPlanAllocation): GoalsWorkspaceSource['allocations'][number] {
  return {
    id: a.id,
    snapshotId: a.snapshotId,
    goalId: a.goalId,
    percentage: a.percentage,
  }
}

export async function getGoalCreationStateWithExecutor(
  executor: any,
  userId: string,
  currentMonth: string,
): Promise<GoalCreationState | null> {
  const base = await getOwnedGoalPlanBase(executor, userId)
  if (!base) {
    return null
  }

  const nextMonth = `${getNextCalendarMonth(new Date(`${currentMonth.slice(0, 7)}-01T00:00:00Z`))}-01`
  const currentSnapshots = selectWinningSnapshots(base.snapshots, currentMonth)
  const pendingSnapshots = base.snapshots.filter((snapshot: any) => snapshot.effectiveMonth === nextMonth)
  const selectedIds = new Set([...currentSnapshots, ...pendingSnapshots].map((snapshot: any) => snapshot.id))
  const selectedSnapshotIds = Array.from(selectedIds)

  const allocations =
    selectedSnapshotIds.length > 0
      ? await executor.query.channelPlanAllocations.findMany({
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
      channels: base.channels,
      snapshots: currentSnapshots,
      allocations: allocations.filter((allocation: any) => currentSnapshotIds.has(allocation.snapshotId)),
    }),
    pendingSnapshots: pendingSnapshots.map(mapSnapshot),
    pendingAllocations: allocations
      .filter((allocation: any) => pendingSnapshotIds.has(allocation.snapshotId))
      .map(mapAllocation),
  }
}

export async function getGoalCreationState(
  userId: string,
  currentMonth: string,
): Promise<GoalCreationState | null> {
  return getGoalCreationStateWithExecutor(db, userId, currentMonth)
}

export async function upsertOwnedContributionChannel(
  tx: any,
  userId: string,
  group: GoalCreationAllocationGroup,
): Promise<string> {
  if (group.channelId) {
    return group.channelId
  }
  const existing = await tx.query.contributionChannels.findFirst({
    where: (channels: any, { and, eq }: any) =>
      and(
        eq(channels.userId, userId),
        eq(channels.fundingMethod, group.fundingMethod),
        eq(channels.destinationCurrency, group.destinationCurrency),
      ),
  })
  if (existing) {
    return existing.id
  }
  const [inserted] = await tx
    .insert(contributionChannels)
    .values({
      userId,
      fundingMethod: group.fundingMethod,
      destinationCurrency: group.destinationCurrency,
    })
    .returning({ id: contributionChannels.id })
  return inserted.id
}

export async function replacePendingSnapshot(
  tx: any,
  channelId: string,
  group: GoalCreationAllocationGroup,
): Promise<string> {
  const existingSnapshot = await tx.query.channelPlanSnapshots.findFirst({
    where: (snapshots: any, { and, eq }: any) =>
      and(
        eq(snapshots.channelId, channelId),
        eq(snapshots.effectiveMonth, group.effectiveMonth),
      ),
  })

  if (existingSnapshot) {
    await tx
      .update(channelPlanSnapshots)
      .set({
        monthlyCommitmentAmount: group.monthlyCommitment ? group.monthlyCommitment.amount : null,
        baseCurrency: group.baseCurrency,
        commitmentStatus: existingSnapshot.commitmentStatus,
      })
      .where(eq(channelPlanSnapshots.id, existingSnapshot.id))
    return existingSnapshot.id
  }

  const [insertedSnapshot] = await tx
    .insert(channelPlanSnapshots)
    .values({
      channelId,
      monthlyCommitmentAmount: group.monthlyCommitment ? group.monthlyCommitment.amount : null,
      baseCurrency: group.baseCurrency,
      commitmentStatus: 'active',
      effectiveMonth: group.effectiveMonth,
    })
    .returning({ id: channelPlanSnapshots.id })

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
        status: 'active',
        desiredDate: proposal.normalizedGoal.desiredDate,
        emergencyFundMonths: proposal.normalizedGoal.emergencyFundMonths,
        saveEnabled: proposal.normalizedGoal.saveEnabled,
        investEnabled: proposal.normalizedGoal.investEnabled,
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

    for (const group of proposal.allocationGroups) {
      const channelId = await upsertOwnedContributionChannel(tx, userId, group)
      const snapshotId = await replacePendingSnapshot(tx, channelId, group)
      await tx.delete(channelPlanAllocations).where(eq(channelPlanAllocations.snapshotId, snapshotId))
      await tx.insert(channelPlanAllocations).values(
        group.entries.map((entry) => ({
          snapshotId,
          goalId: entry.goalId === PENDING_GOAL_ID ? goal.id : entry.goalId,
          percentage: entry.percentage,
        })),
      )
    }

    return { goalId: goal.id }
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

export function mapRowsToGoalsWorkspaceSource(rows: GoalsWorkspaceRows): GoalsWorkspaceSource {
  return {
    profile: {
      userId: rows.profile.userId,
      baseCurrency: rows.profile.baseCurrency as CurrencyCode,
      approximateMonthlyIncome: rows.profile.approximateMonthlyIncome,
      approximateMonthlyExpenses: rows.profile.approximateMonthlyExpenses,
      expensesKnowledge: rows.profile.expensesKnowledge,
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
      status: g.status as GoalStatus,
      desiredDate: g.desiredDate,
      completedAt: g.completedAt instanceof Date ? g.completedAt.toISOString() : (g.completedAt ?? null),
      emergencyFundMonths: g.emergencyFundMonths,
      saveEnabled: g.saveEnabled,
      investEnabled: g.investEnabled,
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
    channels: rows.channels.map((c) => ({
      id: c.id,
      userId: c.userId,
      fundingMethod: c.fundingMethod as FundingMethod,
      destinationCurrency: c.destinationCurrency as CurrencyCode,
    })),
    snapshots: rows.snapshots.map((s) => ({
      id: s.id,
      channelId: s.channelId,
      monthlyCommitmentAmount: s.monthlyCommitmentAmount,
      baseCurrency: s.baseCurrency as CurrencyCode,
      commitmentStatus: s.commitmentStatus as 'active' | 'paused',
      effectiveMonth: s.effectiveMonth,
    })),
    allocations: rows.allocations.map((a) => ({
      id: a.id,
      snapshotId: a.snapshotId,
      goalId: a.goalId,
      percentage: a.percentage,
    })),
  }
}

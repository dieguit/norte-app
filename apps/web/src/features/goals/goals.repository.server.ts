import '@tanstack/react-start/server-only'
import { db } from '../../db/client'
import type {
  ChannelPlanAllocation,
  ChannelPlanSnapshot,
  ContributionChannel,
  FinancialGoal,
  FinancialProfile,
  GoalInvestmentPosition,
  GoalSavingsPosition,
} from '../../db/schema'
import type {
  GoalPriority,
  GoalStatus,
  GoalsWorkspaceSource,
  InvestmentAvailability,
} from './goals'
import type { CurrencyCode } from '../../lib/money'
import type { FundingMethod } from '../financial/financial'

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

export async function getGoalsWorkspaceRows(
  userId: string,
  currentMonth: string,
): Promise<GoalsWorkspaceRows | null> {
  const profile = await db.query.financialProfiles.findFirst({
    where: (profiles, { eq }) => eq(profiles.userId, userId),
  })

  if (!profile) {
    return null
  }

  const goals = await db.query.financialGoals.findMany({
    where: (goalsTable, { eq }) => eq(goalsTable.userId, userId),
  })

  const channels = await db.query.contributionChannels.findMany({
    where: (channelsTable, { eq }) => eq(channelsTable.userId, userId),
  })

  const goalIds = goals.map((g) => g.id)
  const savingsPositions =
    goalIds.length > 0
      ? await db.query.goalSavingsPositions.findMany({
          where: (pos, { inArray }) => inArray(pos.goalId, goalIds),
        })
      : []

  const investmentPositions =
    goalIds.length > 0
      ? await db.query.goalInvestmentPositions.findMany({
          where: (pos, { inArray }) => inArray(pos.goalId, goalIds),
        })
      : []

  const channelIds = channels.map((c) => c.id)
  const allSnapshots =
    channelIds.length > 0
      ? await db.query.channelPlanSnapshots.findMany({
          where: (snapshotsTable, { inArray }) => inArray(snapshotsTable.channelId, channelIds),
        })
      : []

  const snapshots = selectWinningSnapshots(allSnapshots, currentMonth)
  const snapshotIds = snapshots.map((s) => s.id)

  const allocations =
    snapshotIds.length > 0
      ? await db.query.channelPlanAllocations.findMany({
          where: (allocsTable, { inArray }) => inArray(allocsTable.snapshotId, snapshotIds),
        })
      : []

  return {
    profile,
    goals,
    savingsPositions,
    investmentPositions,
    channels,
    snapshots,
    allocations,
  }
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

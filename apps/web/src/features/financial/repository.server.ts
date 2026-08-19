import '@tanstack/react-start/server-only'
import { db } from '../../db/client'
import {
  channelPlanAllocations,
  channelPlanSnapshots,
  contributionChannels,
  financialGoals,
  financialProfiles,
} from '../../db/schema'
import { type CurrencyCode, createMoney } from '../../lib/money'
import type {
  DerivedInitialChannel,
  DerivedInitialGoal,
  FundingMethod,
  InitialHomeState,
  InitialPlan,
} from './financial'
import {
  convertCommitmentToDestination,
  deriveEmergencyFundTarget,
  projectCompletionMonth,
} from './financial'

export async function persistInitialPlan(
  userId: string,
  plan: InitialPlan,
  goal: DerivedInitialGoal,
  channel: DerivedInitialChannel,
) {
  return db.transaction(async (tx) => {
    const insertedProfiles = await tx
      .insert(financialProfiles)
      .values({
        userId,
        baseCurrency: 'ARS',
        approximateMonthlyIncome: plan.income.amount,
        approximateMonthlyExpenses: plan.expenses?.amount ?? null,
        expensesKnowledge: plan.expensesKnowledge,
        onboardingCompleted: true,
      })
      .onConflictDoNothing({ target: financialProfiles.userId })
      .returning({ userId: financialProfiles.userId })

    if (insertedProfiles.length === 0) return { created: false }

    const [insertedGoal] = await tx
      .insert(financialGoals)
      .values({
        userId,
        name: goal.name,
        type: goal.type,
        targetAmount: goal.targetAmount?.amount ?? null,
        currency: goal.currency,
        emergencyFundMonths: goal.emergencyFundMonths ?? null,
        saveEnabled: goal.saveEnabled,
        investEnabled: goal.investEnabled,
      })
      .returning({ id: financialGoals.id })

    const [insertedChannel] = await tx
      .insert(contributionChannels)
      .values({
        userId,
        fundingMethod: channel.fundingMethod,
        destinationCurrency: channel.destinationCurrency,
      })
      .returning({ id: contributionChannels.id })

    const [insertedSnapshot] = await tx
      .insert(channelPlanSnapshots)
      .values({
        channelId: insertedChannel.id,
        monthlyCommitmentAmount: channel.monthlyCommitment.amount,
        baseCurrency: channel.monthlyCommitment.currency,
        effectiveMonth: `${channel.effectiveMonth}-01`,
      })
      .returning({ id: channelPlanSnapshots.id })

    await tx.insert(channelPlanAllocations).values({
      snapshotId: insertedSnapshot.id,
      goalId: insertedGoal.id,
      percentage: '100.00',
    })

    return { created: true }
  })
}

export async function getInitialHomeState(userId: string): Promise<InitialHomeState | null> {
  const profile = await db.query.financialProfiles.findFirst({
    where: (profiles, { eq }) => eq(profiles.userId, userId),
  })
  if (!profile) return null

  const goal = await db.query.financialGoals.findFirst({
    where: (goals, { eq }) => eq(goals.userId, userId),
    orderBy: (goals, { asc }) => [asc(goals.createdAt)],
  })
  const channel = await db.query.contributionChannels.findFirst({
    where: (channels, { eq }) => eq(channels.userId, userId),
    orderBy: (channels, { asc }) => [asc(channels.createdAt)],
  })
  if (!goal || !channel) return null

  const snapshot = await db.query.channelPlanSnapshots.findFirst({
    where: (snapshots, { eq }) => eq(snapshots.channelId, channel.id),
    orderBy: (snapshots, { desc }) => [desc(snapshots.effectiveMonth)],
  })
  if (!snapshot) return null

  const allocation = await db.query.channelPlanAllocations.findFirst({
    where: (allocations, { and, eq }) => and(
      eq(allocations.snapshotId, snapshot.id),
      eq(allocations.goalId, goal.id),
    ),
  })
  if (!allocation) return null

  const expensesKnowledge = profile.expensesKnowledge === 'known' ? 'known' : 'unknown'
  const expenses = profile.approximateMonthlyExpenses
    ? createMoney(profile.approximateMonthlyExpenses, 'ARS')
    : undefined
  const targetAmount = goal.type === 'emergency_fund'
    ? expenses
      ? deriveEmergencyFundTarget(expenses, goal.emergencyFundMonths ?? 6)
      : undefined
    : goal.targetAmount
      ? createMoney(goal.targetAmount, goal.currency as CurrencyCode)
      : undefined
  const monthlyCommitment = createMoney(snapshot.monthlyCommitmentAmount, snapshot.baseCurrency as CurrencyCode)
  const destinationAmount = convertCommitmentToDestination(
    monthlyCommitment,
    channel.destinationCurrency as CurrencyCode,
  )
  const effectiveMonth = snapshot.effectiveMonth.slice(0, 7)
  const projection = targetAmount
    ? projectCompletionMonth(targetAmount, destinationAmount, effectiveMonth)
    : { status: 'unknown_expenses' as const }

  return {
    income: createMoney(profile.approximateMonthlyIncome, 'ARS'),
    expensesKnowledge,
    expenses,
    plan: {
      fundingMethod: channel.fundingMethod as FundingMethod,
      destinationCurrency: channel.destinationCurrency as CurrencyCode,
      monthlyCommitment,
      destinationAmount,
      effectiveMonth,
      allocationPercentage: allocation.percentage,
    },
    goal: {
      type: goal.type,
      name: goal.name,
      targetAmount,
      currentAmount: createMoney('0', goal.currency as CurrencyCode),
      emergencyFundMonths: goal.emergencyFundMonths ?? undefined,
    },
    projection,
  }
}

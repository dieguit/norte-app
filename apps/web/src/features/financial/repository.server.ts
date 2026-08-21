import '@tanstack/react-start/server-only'
import { db } from '../../db/client'
import {
  allocationPlanEntries,
  allocationPlanSnapshots,
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
  getPreviousCalendarMonth,
  projectCompletionMonth,
} from './financial'
import {
  derivePreviousMonthShortfalls,
  type PreviousMonthShortfall,
} from '../contributions/saving-contribution'

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
        plannedMonthlyContribution: plan.plannedContribution.amount,
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
        strategy: goal.strategy,
      })
      .returning({ id: financialGoals.id })

    const [insertedSnapshot] = await tx
      .insert(allocationPlanSnapshots)
      .values({
        userId,
        effectiveMonth: `${channel.effectiveMonth}-01`,
        plannedMonthlyContribution: plan.plannedContribution.amount,
      })
      .returning({ id: allocationPlanSnapshots.id })

    await tx.insert(allocationPlanEntries).values({
      snapshotId: insertedSnapshot.id,
      goalId: insertedGoal.id,
      percentage: '100.00',
    })

    return { created: true }
  })
}

export async function getInitialHomeState(
  userId: string,
  now: Date = new Date(),
): Promise<InitialHomeState | null> {
  const profile = await db.query.financialProfiles.findFirst({
    where: (profiles, { eq }) => eq(profiles.userId, userId),
  })
  if (!profile) return null

  const goal = await db.query.financialGoals.findFirst({
    where: (goals, { eq }) => eq(goals.userId, userId),
    orderBy: (goals, { asc }) => [asc(goals.createdAt)],
  })
  if (!goal) return null

  const snapshot = await db.query.allocationPlanSnapshots.findFirst({
    where: (snapshots, { eq }) => eq(snapshots.userId, userId),
    orderBy: (snapshots, { desc }) => [desc(snapshots.effectiveMonth)],
  })
  if (!snapshot) return null

  const allocation = await db.query.allocationPlanEntries.findFirst({
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
  const monthlyCommitment = createMoney(profile.plannedMonthlyContribution ?? '0.00', profile.baseCurrency as CurrencyCode)
  const destinationAmount = convertCommitmentToDestination(
    monthlyCommitment,
    goal.currency as CurrencyCode,
  )
  const effectiveMonth = snapshot.effectiveMonth.slice(0, 7)
  const projection = targetAmount
    ? projectCompletionMonth(targetAmount, destinationAmount, effectiveMonth)
    : { status: 'unknown_expenses' as const }

  const closedMonth = getPreviousCalendarMonth(now)
  const userSnapshots = await db.query.allocationPlanSnapshots.findMany({
    where: (snapshots, { eq }) => eq(snapshots.userId, userId),
    orderBy: (snapshots, { desc }) => [desc(snapshots.effectiveMonth)],
  })
  const applicableSnapshot = userSnapshots.find(
    (s) => s.effectiveMonth.slice(0, 7) <= closedMonth,
  )

  let previousMonthShortfalls: PreviousMonthShortfall[] = []

  if (applicableSnapshot && applicableSnapshot.plannedMonthlyContribution !== null) {
    const [snapshotEntries, userGoals, savingContribs, investmentContribs] = await Promise.all([
      db.query.allocationPlanEntries.findMany({
        where: (entries, { eq }) => eq(entries.snapshotId, applicableSnapshot.id),
      }),
      db.query.financialGoals.findMany({
        where: (goals, { eq }) => eq(goals.userId, userId),
      }),
      db.query.savingContributions.findMany({
        where: (contribs, { eq }) => eq(contribs.userId, userId),
      }),
      db.query.investmentContributions.findMany({
        where: (contribs, { eq }) => eq(contribs.userId, userId),
      }),
    ])

    previousMonthShortfalls = derivePreviousMonthShortfalls({
      closedMonth,
      plannedMonthlyContribution: applicableSnapshot.plannedMonthlyContribution,
      goals: userGoals.map((g) => ({
        id: g.id,
        strategy: g.strategy,
        currency: g.currency as CurrencyCode,
      })),
      allocations: snapshotEntries.map((e) => ({
        goalId: e.goalId,
        percentage: e.percentage,
      })),
      savingContributions: savingContribs,
      investmentContributions: investmentContribs,
    })
  }

  return {
    income: createMoney(profile.approximateMonthlyIncome, 'ARS'),
    expensesKnowledge,
    expenses,
    plan: {
      fundingMethod: goal.strategy as FundingMethod,
      destinationCurrency: goal.currency as CurrencyCode,
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
    previousMonthShortfalls,
  }
}

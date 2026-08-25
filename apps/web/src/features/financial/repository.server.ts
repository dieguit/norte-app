import '@tanstack/react-start/server-only'
import { db } from '../../db/client'
import {
  allocationPlanEntries,
  allocationPlanSnapshots,
  financialGoals,
  financialProfiles,
  goalInvestmentPositions,
} from '../../db/schema'
import { type CurrencyCode, createMoney, parseMoneyInput } from '../../lib/money'
import type {
  FundingMethod,
  InitialHomeState,
} from './financial'
import {
  convertCommitmentToDestination,
  deriveEmergencyFundTarget,
  getPreviousCalendarMonth,
  projectCompletionMonth,
} from './financial'
import { derivePreviousMonthShortfalls, type PreviousMonthShortfall } from '../contributions/saving-contribution'
import { getIncomeTotalArs } from './incomes'
import { getExpenseTotalArs, getMonthlyBalanceArs } from './expenses'
import { getGoalContributionArs } from './monthly-plan'
import { insertIncomeWithExecutor } from './incomes.repository.server'
import { insertExpenseWithExecutor } from './expenses.repository.server'
import type { GoalCreationDraft } from '../goals/goal-creation.schema'
import type { IncomeDraft } from './incomes.schema'
import type { ExpenseDraft } from './expenses.schema'

export async function getInitialHomeState(
  userId: string,
  now: Date = new Date(),
): Promise<InitialHomeState | null> {
  const profile = await db.query.financialProfiles.findFirst({
    where: (profiles, { eq }) => eq(profiles.userId, userId),
  })
  if (!profile) return null

  const currentMonth = now.toISOString().slice(0, 7)
  const [incomeRows, expenseRows] = await Promise.all([
    db.query.incomes.findMany({
      where: (incomes, { eq }) => eq(incomes.userId, userId),
    }),
    db.query.expenses.findMany({
      where: (expenses, { eq }) => eq(expenses.userId, userId),
    }),
  ])
  const income = getIncomeTotalArs(
    incomeRows.filter((row) => row.recurring).map((row) => ({
      amount: createMoney(row.amount, row.currency as CurrencyCode),
      recurring: row.recurring,
      effectiveMonth: row.effectiveMonth,
    })),
    currentMonth,
  )

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
  const expenses = profile.expensesKnowledge === 'known'
    ? getExpenseTotalArs(
        expenseRows.map((row) => ({
          amount: createMoney(row.amount, row.currency as CurrencyCode),
          recurring: row.recurring,
          effectiveMonth: row.effectiveMonth,
          endMonth: row.endMonth,
        })),
        currentMonth,
      )
    : undefined
  const targetAmount = goal.type === 'emergency_fund'
    ? goal.targetAmount
      ? createMoney(goal.targetAmount, goal.currency as CurrencyCode)
      : expenses
        ? deriveEmergencyFundTarget(expenses, goal.emergencyFundMonths ?? 3)
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
    income,
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
      emergencyFundMonths: goal.emergencyFundMonths ?? (goal.type === 'emergency_fund' ? 3 : undefined),
    },
    projection,
    previousMonthShortfalls,
  }
}

export async function getGoalDedicationPercentage(
  userId: string,
): Promise<string | null> {
  const profile = await db.query.financialProfiles.findFirst({
    where: (profiles, { eq }) => eq(profiles.userId, userId),
  })

  return profile?.goalDedicationPercentage ?? null
}

export interface PersistFinancialOnboardingInput {
  goal: GoalCreationDraft
  incomes: IncomeDraft[]
  expenses: ExpenseDraft[]
}

export async function persistFinancialOnboarding(
  userId: string,
  input: PersistFinancialOnboardingInput,
  currentMonth: string,
): Promise<{ created: boolean }> {
  const incomeTotal = getIncomeTotalArs(
    input.incomes.map((inc) => ({
      amount: createMoney(inc.amount, inc.currency as CurrencyCode),
      recurring: inc.recurring,
      effectiveMonth: `${currentMonth}-01`,
    })),
    currentMonth,
  )

  const expenseTotal = getExpenseTotalArs(
    input.expenses.map((exp) => ({
      amount: createMoney(exp.amount, exp.currency as CurrencyCode),
      recurring: exp.recurring,
      effectiveMonth: `${currentMonth}-01`,
    })),
    currentMonth,
  )

  const monthlyBalance = getMonthlyBalanceArs(incomeTotal, expenseTotal)
  const plannedMonthlyContribution = getGoalContributionArs(monthlyBalance, '90.00')

  const targetAmount =
    input.goal.type === 'emergency_fund'
      ? deriveEmergencyFundTarget(expenseTotal, 3)
      : input.goal.targetAmount
        ? parseMoneyInput(input.goal.targetAmount, input.goal.currency as CurrencyCode) ?? undefined
        : undefined

  return db.transaction(async (tx) => {
    const [profile] = await tx
      .insert(financialProfiles)
      .values({
        userId,
        baseCurrency: 'ARS',
        expensesKnowledge: 'known',
        plannedMonthlyContribution: plannedMonthlyContribution.amount,
        goalDedicationPercentage: '90.00',
        onboardingCompleted: true,
      })
      .onConflictDoNothing()
      .returning()

    if (!profile) {
      return { created: false }
    }

    for (const income of input.incomes) {
      await insertIncomeWithExecutor(tx, userId, income, currentMonth)
    }

    for (const expense of input.expenses) {
      await insertExpenseWithExecutor(tx, userId, expense, currentMonth)
    }

    const [goal] = await tx
      .insert(financialGoals)
      .values({
        userId,
        name: input.goal.name.trim(),
        type: input.goal.type,
        targetAmount: targetAmount?.amount ?? null,
        currency: input.goal.currency,
        priority: input.goal.priority,
        strategy: input.goal.strategy,
        status: 'active',
        desiredDate:
          input.goal.desiredMonth && input.goal.desiredMonth.trim() !== ''
            ? `${input.goal.desiredMonth.slice(0, 7)}-01`
            : null,
        emergencyFundMonths: input.goal.type === 'emergency_fund' ? 3 : null,
      })
      .returning({ id: financialGoals.id })

    if (input.goal.strategy === 'invest') {
      await tx.insert(goalInvestmentPositions).values({
        goalId: goal.id,
        currentValue: '0.00',
        currency: input.goal.currency,
        annualReturnRate: input.goal.annualReturnRate || '8.000',
        availability: input.goal.availability || 'available_now',
        availableFrom:
          input.goal.availability === 'available_from' && input.goal.availableFromMonth
            ? `${input.goal.availableFromMonth.slice(0, 7)}-01`
            : null,
      })
    }

    const [snapshot] = await tx
      .insert(allocationPlanSnapshots)
      .values({
        userId,
        effectiveMonth: `${currentMonth.slice(0, 7)}-01`,
        plannedMonthlyContribution: plannedMonthlyContribution.amount,
      })
      .returning({ id: allocationPlanSnapshots.id })

    await tx.insert(allocationPlanEntries).values({
      snapshotId: snapshot.id,
      goalId: goal.id,
      percentage: '100.00',
    })

    return { created: true }
  })
}

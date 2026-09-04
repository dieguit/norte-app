import '@tanstack/react-start/server-only'
import { db } from '../../db/client'
import {
  allocationPlanEntries,
  allocationPlanSnapshots,
  financialGoals,
  financialProfiles,
  goalInvestmentPositions,
} from '../../db/schema'
import { type CurrencyCode, type Money, createMoney, parseMoneyInput } from '../../lib/money'
import type {
  FundingMethod,
  InitialHomeState,
} from './financial'
import {
  convertCommitmentToDestination,
  deriveEmergencyFundTarget,
  getPreviousCalendarMonth,
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

type IncomeCalculationRow = {
  amount: string
  currency: string
  recurring: boolean
  effectiveMonth: string
}

type ExpenseCalculationRow = IncomeCalculationRow & { endMonth: string | null }

type HomeGoal = {
  type: string
  name: string
  strategy: string
  targetAmount: string | null
  currency: string
  emergencyFundMonths: number | null
}

function getRecurringIncomeTotal(rows: IncomeCalculationRow[], currentMonth: string) {
  return getIncomeTotalArs(
    rows.filter((row) => row.recurring).map((row) => ({
      amount: createMoney(row.amount, row.currency as CurrencyCode),
      recurring: row.recurring,
      effectiveMonth: row.effectiveMonth,
    })),
    currentMonth,
  )
}

function getKnownExpenseTotal(
  expensesKnowledge: string,
  rows: ExpenseCalculationRow[],
  currentMonth: string,
) {
  if (expensesKnowledge !== 'known') return undefined

  return getExpenseTotalArs(
    rows.map((row) => ({
      amount: createMoney(row.amount, row.currency as CurrencyCode),
      recurring: row.recurring,
      effectiveMonth: row.effectiveMonth,
      endMonth: row.endMonth,
    })),
    currentMonth,
  )
}

function getHomeTargetAmount(goal: HomeGoal, expenses: Money | undefined) {
  if (goal.type !== 'emergency_fund') {
    return goal.targetAmount
      ? createMoney(goal.targetAmount, goal.currency as CurrencyCode)
      : undefined
  }
  if (goal.targetAmount) return createMoney(goal.targetAmount, goal.currency as CurrencyCode)
  if (expenses) return deriveEmergencyFundTarget(expenses, goal.emergencyFundMonths ?? 3)
  return undefined
}

function getEmergencyFundMonths(goal: HomeGoal) {
  return goal.emergencyFundMonths ?? (goal.type === 'emergency_fund' ? 3 : undefined)
}

function calculateHomeFinancialState(
  profile: {
    expensesKnowledge: string
    plannedMonthlyContribution: string | null | undefined
    baseCurrency: string
  },
  goal: HomeGoal,
  expenseRows: ExpenseCalculationRow[],
  currentMonth: string,
) {
  const expensesKnowledge: 'known' | 'unknown' = profile.expensesKnowledge === 'known' ? 'known' : 'unknown'
  const expenses = getKnownExpenseTotal(profile.expensesKnowledge, expenseRows, currentMonth)
  const targetAmount = getHomeTargetAmount(goal, expenses)
  const monthlyCommitment = createMoney(profile.plannedMonthlyContribution ?? '0.00', profile.baseCurrency as CurrencyCode)
  const destinationAmount = convertCommitmentToDestination(
    monthlyCommitment,
    goal.currency as CurrencyCode,
  )

  return {
    expensesKnowledge,
    expenses,
    targetAmount,
    monthlyCommitment,
    destinationAmount,
  }
}

function buildInitialHomeState({
  income,
  expensesKnowledge,
  expenses,
  goal,
  targetAmount,
  monthlyCommitment,
  destinationAmount,
  effectiveMonth,
  allocationPercentage,
  previousMonthShortfalls,
}: {
  income: Money
  expensesKnowledge: 'known' | 'unknown'
  expenses: Money | undefined
  goal: HomeGoal
  targetAmount: Money | undefined
  monthlyCommitment: Money
  destinationAmount: Money
  effectiveMonth: string
  allocationPercentage: string
  previousMonthShortfalls: PreviousMonthShortfall[]
}): InitialHomeState {
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
      allocationPercentage,
    },
    goal: {
      type: goal.type,
      name: goal.name,
      targetAmount,
      currentAmount: createMoney('0', goal.currency as CurrencyCode),
      emergencyFundMonths: getEmergencyFundMonths(goal),
    },
    previousMonthShortfalls,
  }
}

async function getPreviousMonthShortfalls(
  userId: string,
  now: Date,
): Promise<PreviousMonthShortfall[]> {
  const closedMonth = getPreviousCalendarMonth(now)
  const userSnapshots = await db.query.allocationPlanSnapshots.findMany({
    where: (snapshots, { eq }) => eq(snapshots.userId, userId),
    orderBy: (snapshots, { desc }) => [desc(snapshots.effectiveMonth)],
  })
  const applicableSnapshot = userSnapshots.find(
    (snapshot) => snapshot.effectiveMonth.slice(0, 7) <= closedMonth,
  )

  if (!applicableSnapshot || applicableSnapshot.plannedMonthlyContribution === null) return []

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

  return derivePreviousMonthShortfalls({
    closedMonth,
    plannedMonthlyContribution: applicableSnapshot.plannedMonthlyContribution,
    goals: userGoals.map((goal) => ({
      id: goal.id,
      strategy: goal.strategy,
      currency: goal.currency as CurrencyCode,
    })),
    allocations: snapshotEntries.map((entry) => ({
      goalId: entry.goalId,
      percentage: entry.percentage,
    })),
    savingContributions: savingContribs,
    investmentContributions: investmentContribs,
  })
}

function getDesiredDate(desiredMonth: string) {
  return desiredMonth && desiredMonth.trim() !== ''
    ? `${desiredMonth.slice(0, 7)}-01`
    : null
}

function getAvailableFromDate(availability: string, availableFromMonth: string) {
  return availability === 'available_from' && availableFromMonth
    ? `${availableFromMonth.slice(0, 7)}-01`
    : null
}

function getFinancialGoalValues(
  userId: string,
  input: PersistFinancialOnboardingInput,
  targetAmount: Money | undefined,
) {
  return {
    userId,
    name: input.goal.name.trim(),
    type: input.goal.type,
    targetAmount: targetAmount?.amount ?? null,
    currency: input.goal.currency,
    priority: input.goal.priority,
    strategy: input.goal.strategy,
    status: 'active' as const,
    desiredDate: getDesiredDate(input.goal.desiredMonth),
    emergencyFundMonths: input.goal.type === 'emergency_fund' ? 3 : null,
  }
}

function getInvestmentPositionValues(input: PersistFinancialOnboardingInput, goalId: string) {
  return {
    goalId,
    currentValue: '0.00',
    currency: input.goal.currency,
    annualReturnRate: input.goal.annualReturnRate || '8.000',
    availability: input.goal.availability || 'available_now',
    availableFrom: getAvailableFromDate(
      input.goal.availability,
      input.goal.availableFromMonth,
    ),
  }
}

async function persistFinancialOnboardingInTransaction(
  tx: any,
  userId: string,
  input: PersistFinancialOnboardingInput,
  currentMonth: string,
  plannedMonthlyContribution: Money,
  targetAmount: Money | undefined,
) {
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

  if (!profile) return { created: false }

  for (const income of input.incomes) {
    await insertIncomeWithExecutor(tx, userId, income, currentMonth)
  }
  for (const expense of input.expenses) {
    await insertExpenseWithExecutor(tx, userId, expense, currentMonth)
  }

  const [goal] = await tx
    .insert(financialGoals)
    .values(getFinancialGoalValues(userId, input, targetAmount))
    .returning({ id: financialGoals.id })

  if (input.goal.strategy === 'invest') {
    await tx.insert(goalInvestmentPositions).values({
      ...getInvestmentPositionValues(input, goal.id),
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
}

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
  const income = getRecurringIncomeTotal(incomeRows, currentMonth)

  const snapshot = await db.query.allocationPlanSnapshots.findFirst({
    where: (snapshots, { eq }) => eq(snapshots.userId, userId),
    orderBy: (snapshots, { desc }) => [desc(snapshots.effectiveMonth)],
  })
  if (!snapshot) return null

  const allocation: { goalId: string; percentage: string } | undefined = await db.query.allocationPlanEntries.findFirst({
    where: (allocations, { and, eq }) => and(
      eq(allocations.snapshotId, snapshot.id),
    ),
  })
  if (!allocation) return null

  const goal: (HomeGoal & { id: string }) | undefined = await db.query.financialGoals.findFirst({
    where: (goals, { and, eq }) => and(
      eq(goals.userId, userId),
      eq(goals.id, allocation.goalId),
    ),
  })
  if (!goal) return null

  const effectiveMonth = snapshot.effectiveMonth.slice(0, 7)
  const homeFinancialState = calculateHomeFinancialState(
    profile,
    goal,
    expenseRows,
    currentMonth,
  )
  const previousMonthShortfalls = await getPreviousMonthShortfalls(userId, now)

  return buildInitialHomeState({
    income,
    goal,
    effectiveMonth,
    allocationPercentage: allocation.percentage,
    previousMonthShortfalls,
    ...homeFinancialState,
  })
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

  return db.transaction((tx) =>
    persistFinancialOnboardingInTransaction(
      tx,
      userId,
      input,
      currentMonth,
      plannedMonthlyContribution,
      targetAmount,
    ),
  )
}

import { isExpenseIncludedInMonth, type ExpensesWorkspace } from '../financial/expenses'
import { isIncomeIncludedInMonth, type IncomesWorkspace } from '../financial/incomes'
import type { ContributionSummary, GoalsWorkspace, GoalWorkspaceItem } from '../goals/goals'

type Income = IncomesWorkspace['incomes'][number]
type Expense = ExpensesWorkspace['expenses'][number]

export interface RoadmapMonth {
  month: string
  objectives: GoalWorkspaceItem[]
  oneTimeExpenses: Expense[]
  recurringExpenses: Expense[]
  endingExpenses: Expense[]
  oneTimeIncomes: Income[]
  recurringIncomes: Income[]
  contributions: ContributionSummary[]
}

export interface RoadmapData {
  undatedObjectives: GoalWorkspaceItem[]
  futureMonths: RoadmapMonth[]
  currentMonth: RoadmapMonth
  historyMonths: RoadmapMonth[]
}

export interface RoadmapFinances {
  incomes: IncomesWorkspace
  expenses: ExpensesWorkspace
}

function addMonth(month: string, offset: number) {
  const [year, monthNumber] = month.split('-').map(Number)
  const date = new Date(Date.UTC(year, monthNumber - 1 + offset, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

export function buildRoadmap({
  goals,
  finances,
  currentMonth,
}: {
  goals: GoalsWorkspace
  finances: RoadmapFinances
  currentMonth: string
}): RoadmapData {
  const allGoals = goals.groups.flatMap((group) => group.goals)
  const roadmapGoals = allGoals.filter((goal) => goal.status !== 'completed')
  const completedObjectives = allGoals.filter(
    (goal) => goal.status === 'completed' && goal.completedAt,
  )
  const datedObjectives = roadmapGoals.filter(
    (goal) => goal.projection.status === 'available',
  )
  const undatedObjectives = roadmapGoals.filter(
    (goal) => goal.projection.status !== 'available',
  )
  const contributions = [
    ...new Map(
      allGoals
        .flatMap((goal) => goal.contributions ?? goal.savingContributions ?? [])
        .map((contribution) => [contribution.id, contribution]),
    ).values(),
  ]

  const buildMonth = (month: string): RoadmapMonth => ({
    month,
    objectives: [
      ...datedObjectives.filter(
        (goal) => goal.projection.status === 'available' && goal.projection.completionMonth === month,
      ),
      ...completedObjectives.filter((goal) => goal.completedAt?.slice(0, 7) === month),
    ],
    oneTimeExpenses: finances.expenses.expenses.filter(
      (expense) => !expense.recurring && isExpenseIncludedInMonth(expense, month),
    ),
    recurringExpenses: finances.expenses.expenses.filter(
      (expense) => expense.recurring && isExpenseIncludedInMonth(expense, month),
    ),
    endingExpenses: finances.expenses.expenses.filter(
      (expense) => expense.recurring && expense.endMonth?.slice(0, 7) === month,
    ),
    oneTimeIncomes: finances.incomes.incomes.filter(
      (income) => !income.recurring && isIncomeIncludedInMonth(income, month),
    ),
    recurringIncomes: finances.incomes.incomes.filter(
      (income) => income.recurring && isIncomeIncludedInMonth(income, month),
    ),
    contributions: contributions.filter(
      (contribution) => contribution.createdAt.slice(0, 7) === month,
    ),
  })

  const futureMonthKeys = new Set<string>()
  for (const goal of datedObjectives) {
    if (goal.projection.status === 'available' && goal.projection.completionMonth > currentMonth) {
      futureMonthKeys.add(goal.projection.completionMonth)
    }
  }
  for (const goal of completedObjectives) {
    const month = goal.completedAt!.slice(0, 7)
    if (month > currentMonth) futureMonthKeys.add(month)
  }
  for (const income of finances.incomes.incomes) {
    const month = income.effectiveMonth.slice(0, 7)
    if (month > currentMonth) futureMonthKeys.add(month)
  }
  for (const expense of finances.expenses.expenses) {
    const startMonth = expense.effectiveMonth.slice(0, 7)
    const endMonth = expense.endMonth?.slice(0, 7)
    if (startMonth > currentMonth) futureMonthKeys.add(startMonth)
    if (endMonth && endMonth > currentMonth) futureMonthKeys.add(endMonth)
  }

  const earliestHistoryMonth = [
    ...finances.incomes.incomes.map((income) => income.effectiveMonth.slice(0, 7)),
    ...finances.expenses.expenses.map((expense) => expense.effectiveMonth.slice(0, 7)),
    ...contributions.map((contribution) => contribution.createdAt.slice(0, 7)),
    ...completedObjectives.map((goal) => goal.completedAt!.slice(0, 7)),
  ].filter((month) => month < currentMonth).sort()[0]

  const historyMonths: RoadmapMonth[] = []
  if (earliestHistoryMonth) {
    for (let month = addMonth(currentMonth, -1); month >= earliestHistoryMonth; month = addMonth(month, -1)) {
      const group = buildMonth(month)
      if (
        group.objectives.length || group.oneTimeExpenses.length || group.recurringExpenses.length || group.endingExpenses.length ||
        group.oneTimeIncomes.length || group.recurringIncomes.length || group.contributions.length
      ) {
        historyMonths.push(group)
      }
    }
  }

  return {
    undatedObjectives,
    futureMonths: [...futureMonthKeys].sort().reverse().map(buildMonth),
    currentMonth: buildMonth(currentMonth),
    historyMonths,
  }
}

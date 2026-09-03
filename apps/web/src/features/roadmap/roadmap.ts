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

function splitGoalGroups(goals: GoalsWorkspace) {
  const allGoals = goals.groups.flatMap((group) => group.goals)
  const roadmapGoals = allGoals.filter((goal) => goal.status !== 'completed')
  const completedObjectives = allGoals.filter(
    (goal) => goal.status === 'completed' && goal.completedAt,
  )

  return {
    allGoals,
    datedObjectives: roadmapGoals.filter((goal) => goal.projection.status === 'available'),
    undatedObjectives: roadmapGoals.filter((goal) => goal.projection.status !== 'available'),
    completedObjectives,
  }
}

function getUniqueContributions(goals: GoalWorkspaceItem[]) {
  return [
    ...new Map(
      goals
        .flatMap((goal) => goal.contributions ?? goal.savingContributions ?? [])
        .map((contribution) => [contribution.id, contribution]),
    ).values(),
  ]
}

// Within a month, date then domain type then ID makes ordering independent of query order.
function sortRoadmapEvents<T extends { id: string }>(
  events: T[],
  getDate: (event: T) => string,
  getType: (event: T) => string,
) {
  return [...events].sort((left, right) => {
    const leftKey = `${getDate(left)}\0${getType(left)}\0${left.id}`
    const rightKey = `${getDate(right)}\0${getType(right)}\0${right.id}`
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0
  })
}

function buildObjectives(
  datedObjectives: GoalWorkspaceItem[],
  completedObjectives: GoalWorkspaceItem[],
  month: string,
) {
  return [
    ...sortRoadmapEvents(
      datedObjectives.filter(
        (goal) => goal.projection.status === 'available' && goal.projection.completionMonth === month,
      ),
      (goal) => goal.projection.status === 'available' ? goal.projection.completionMonth : '',
      (goal) => goal.type,
    ),
    ...sortRoadmapEvents(
      completedObjectives.filter((goal) => goal.completedAt?.slice(0, 7) === month),
      (goal) => goal.completedAt!,
      (goal) => goal.type,
    ),
  ]
}

function buildExpenseGroups(finances: RoadmapFinances, month: string) {
  const expenses = finances.expenses.expenses
  return {
    oneTimeExpenses: sortRoadmapEvents(
      expenses.filter((expense) => !expense.recurring && isExpenseIncludedInMonth(expense, month)),
      (expense) => expense.effectiveMonth,
      (expense) => expense.sourceKind,
    ),
    recurringExpenses: sortRoadmapEvents(
      expenses.filter((expense) => expense.recurring && isExpenseIncludedInMonth(expense, month)),
      (expense) => expense.effectiveMonth,
      (expense) => expense.sourceKind,
    ),
    endingExpenses: sortRoadmapEvents(
      expenses.filter((expense) => expense.recurring && expense.endMonth?.slice(0, 7) === month),
      (expense) => expense.endMonth!,
      (expense) => expense.sourceKind,
    ),
  }
}

function buildIncomeGroups(finances: RoadmapFinances, month: string) {
  const incomes = finances.incomes.incomes
  return {
    oneTimeIncomes: sortRoadmapEvents(
      incomes.filter((income) => !income.recurring && isIncomeIncludedInMonth(income, month)),
      (income) => income.effectiveMonth,
      (income) => income.sourceKind,
    ),
    recurringIncomes: sortRoadmapEvents(
      incomes.filter((income) => income.recurring && isIncomeIncludedInMonth(income, month)),
      (income) => income.effectiveMonth,
      (income) => income.sourceKind,
    ),
  }
}

function buildMonthContributions(contributions: ContributionSummary[], month: string) {
  return sortRoadmapEvents(
    contributions.filter((contribution) => contribution.createdAt.slice(0, 7) === month),
    (contribution) => contribution.createdAt,
    (contribution) => contribution.kind,
  )
}

function createMonthBuilder(
  finances: RoadmapFinances,
  datedObjectives: GoalWorkspaceItem[],
  completedObjectives: GoalWorkspaceItem[],
  contributions: ContributionSummary[],
) {
  return (month: string): RoadmapMonth => ({
    month,
    objectives: buildObjectives(datedObjectives, completedObjectives, month),
    ...buildExpenseGroups(finances, month),
    ...buildIncomeGroups(finances, month),
    contributions: buildMonthContributions(contributions, month),
  })
}

function addFutureMonth(months: Set<string>, currentMonth: string, month: string) {
  if (month > currentMonth) months.add(month)
}

function addGoalFutureMonths(
  months: Set<string>,
  currentMonth: string,
  datedObjectives: GoalWorkspaceItem[],
) {
  for (const goal of datedObjectives) {
    if (goal.projection.status === 'available') {
      addFutureMonth(months, currentMonth, goal.projection.completionMonth)
    }
  }
}

function addCompletedFutureMonths(
  months: Set<string>,
  currentMonth: string,
  completedObjectives: GoalWorkspaceItem[],
) {
  for (const goal of completedObjectives) {
    addFutureMonth(months, currentMonth, goal.completedAt!.slice(0, 7))
  }
}

function addFinanceFutureMonths(
  months: Set<string>,
  currentMonth: string,
  finances: RoadmapFinances,
) {
  for (const income of finances.incomes.incomes) {
    addFutureMonth(months, currentMonth, income.effectiveMonth.slice(0, 7))
  }
  for (const expense of finances.expenses.expenses) {
    addFutureMonth(months, currentMonth, expense.effectiveMonth.slice(0, 7))
    const endMonth = expense.endMonth?.slice(0, 7)
    if (endMonth) addFutureMonth(months, currentMonth, endMonth)
  }
}

function collectFutureMonthKeys(
  currentMonth: string,
  datedObjectives: GoalWorkspaceItem[],
  completedObjectives: GoalWorkspaceItem[],
  finances: RoadmapFinances,
) {
  const futureMonthKeys = new Set<string>()
  addGoalFutureMonths(futureMonthKeys, currentMonth, datedObjectives)
  addCompletedFutureMonths(futureMonthKeys, currentMonth, completedObjectives)
  addFinanceFutureMonths(futureMonthKeys, currentMonth, finances)
  return futureMonthKeys
}

function getEarliestHistoryMonth(
  currentMonth: string,
  finances: RoadmapFinances,
  contributions: ContributionSummary[],
  completedObjectives: GoalWorkspaceItem[],
) {
  return [
    ...finances.incomes.incomes.map((income) => income.effectiveMonth.slice(0, 7)),
    ...finances.expenses.expenses.map((expense) => expense.effectiveMonth.slice(0, 7)),
    ...contributions.map((contribution) => contribution.createdAt.slice(0, 7)),
    ...completedObjectives.map((goal) => goal.completedAt!.slice(0, 7)),
  ].filter((month) => month < currentMonth).sort()[0]
}

function hasRoadmapEvents(group: RoadmapMonth) {
  return [
    group.objectives,
    group.oneTimeExpenses,
    group.recurringExpenses,
    group.endingExpenses,
    group.oneTimeIncomes,
    group.recurringIncomes,
    group.contributions,
  ].some((events) => events.length > 0)
}

function buildHistoryMonths(
  currentMonth: string,
  earliestHistoryMonth: string | undefined,
  buildMonth: (month: string) => RoadmapMonth,
) {
  const historyMonths: RoadmapMonth[] = []
  if (!earliestHistoryMonth) return historyMonths

  for (let month = addMonth(currentMonth, -1); month >= earliestHistoryMonth; month = addMonth(month, -1)) {
    const group = buildMonth(month)
    if (hasRoadmapEvents(group)) historyMonths.push(group)
  }
  return historyMonths
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
  const { allGoals, datedObjectives, undatedObjectives, completedObjectives } = splitGoalGroups(goals)
  const contributions = getUniqueContributions(allGoals)
  const buildMonth = createMonthBuilder(finances, datedObjectives, completedObjectives, contributions)
  const futureMonthKeys = collectFutureMonthKeys(
    currentMonth,
    datedObjectives,
    completedObjectives,
    finances,
  )
  const earliestHistoryMonth = getEarliestHistoryMonth(
    currentMonth,
    finances,
    contributions,
    completedObjectives,
  )
  const historyMonths = buildHistoryMonths(currentMonth, earliestHistoryMonth, buildMonth)

  return {
    undatedObjectives,
    futureMonths: [...futureMonthKeys].sort().reverse().map(buildMonth),
    currentMonth: buildMonth(currentMonth),
    historyMonths,
  }
}

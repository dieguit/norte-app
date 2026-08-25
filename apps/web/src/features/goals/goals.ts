import BigNumber from 'bignumber.js'
import {
  type CurrencyCode,
  type Money,
  createMoney,
  addMoney,
  multiplyMoneyByFactor,
} from '../../lib/money'
import {
  convertCommitmentToDestination,
  deriveEmergencyFundTarget,
  PROJECTION_HORIZON_MONTHS,
} from '../financial/financial'
import {
  type MonthlyFinancialPlan,
  type MonthlyFinancialSummary,
  getMonthlyFinancialSummary,
  getGoalContributionArs,
} from '../financial/monthly-plan'
import type { IncomesWorkspace } from '../financial/incomes'
import type { ExpensesWorkspace } from '../financial/expenses'

export type GoalPriority = 'high' | 'medium' | 'low'
export type GoalStatus = 'active' | 'paused' | 'completed'
export type GoalStrategy = 'save' | 'invest'
export type InvestmentAvailability = 'available_now' | 'available_from' | 'long_term'

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  active: 'Activo',
  paused: 'Pausado',
  completed: 'Completado',
}

export type GoalProjection =
  | { status: 'available'; completionMonth: string }
  | { status: 'target_unavailable' }
  | { status: 'no_future_allocation' }
  | { status: 'commitment_absent' }
  | { status: 'plan_paused' }
  | { status: 'investment_assumption_unavailable' }
  | { status: 'outside_horizon' }

export interface GoalFundingRow {
  percentage: string
  monthlyContribution?: Money
  allocatedBaseAmount?: Money
  allocatedDestinationAmount?: Money
  effectiveMonth: string
}

export type ContributionKind = 'saving' | 'investment'

export interface ContributionAllocationSummary {
  goalId: string
  goalName: string
  amount: string
  percentage: string
}

export interface ContributionSummary {
  id: string
  kind: ContributionKind
  userId?: string
  amount: string
  currency: CurrencyCode
  location?: string | null
  arsSpent?: string | null
  effectiveRate?: string | null
  createdAt: string
  allocations: ContributionAllocationSummary[]
}

export type SavingContributionAllocationSummary = ContributionAllocationSummary
export type SavingContributionSummary = ContributionSummary

export interface GoalWorkspaceItem {
  id: string
  name: string
  type: string
  currency: CurrencyCode
  priority: GoalPriority
  strategy: GoalStrategy
  status: GoalStatus
  createdAt: string
  desiredDate?: string
  completedAt?: string
  targetAmount?: Money
  savingsValue: Money
  investmentValue: Money
  actualValue: Money
  progressPercentage?: string
  funding: GoalFundingRow[]
  projection: GoalProjection
  desiredDateDeltaMonths?: number
  annualReturnRate?: string
  availability?: InvestmentAvailability
  availableFrom?: string
  usesPlanningRate: boolean
  contributions?: ContributionSummary[]
  savingContributions?: ContributionSummary[]
}

export interface GoalsFinancialSummary extends MonthlyFinancialSummary {
  dedicationPercentage: string
  contribution: Money
}

export interface GoalsWorkspace {
  financialSummary: GoalsFinancialSummary
  groups: Array<{ status: GoalStatus; goals: GoalWorkspaceItem[] }>
}

export type GoalsAppState =
  | { profile: 'missing' }
  | { profile: 'present'; workspace: GoalsWorkspace }

export interface GoalsWorkspaceSource {
  profile?: {
    userId: string
    baseCurrency: CurrencyCode
    approximateMonthlyIncome: string
    approximateMonthlyExpenses?: string | null
    expensesKnowledge: 'known' | 'unknown' | string
    plannedMonthlyContribution?: string | null
    goalDedicationPercentage?: string
    onboardingCompleted: boolean
  } | null
  goals: Array<{
    id: string
    userId?: string
    name: string
    type: string
    targetAmount?: string | null
    currency: CurrencyCode
    priority: GoalPriority
    strategy: GoalStrategy
    status: GoalStatus
    desiredDate?: string | null
    completedAt?: string | null
    emergencyFundMonths?: number | null
    createdAt: string
  }>
  savingsPositions: Array<{
    id: string
    goalId: string
    amount: string
    currency: CurrencyCode
    location?: string | null
  }>
  investmentPositions: Array<{
    id: string
    goalId: string
    currentValue: string
    currency: CurrencyCode
    annualReturnRate?: string | null
    availability?: InvestmentAvailability | null
    availableFrom?: string | null
  }>
  snapshots: Array<{
    id: string
    userId?: string
    effectiveMonth: string
  }>
  allocations: Array<{
    id: string
    snapshotId: string
    goalId: string
    percentage: string
  }>
  contributions?: ContributionSummary[]
  savingContributions?: SavingContributionSummary[]
  incomes?: IncomesWorkspace['incomes']
  expenses?: ExpensesWorkspace['expenses']
}

const PRIORITY_ORDER: Record<GoalPriority, number> = { high: 0, medium: 1, low: 2 }
const STATUS_GROUPS: GoalStatus[] = ['active', 'paused', 'completed']

export function groupGoals(goals: GoalWorkspaceItem[]): GoalsWorkspace['groups'] {
  return STATUS_GROUPS.map((status) => ({
    status,
    goals: goals
      .filter((goal) => goal.status === status)
      .sort((a, b) => {
        const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
        if (priorityDiff !== 0) return priorityDiff
        const createdDiff = a.createdAt.localeCompare(b.createdAt)
        if (createdDiff !== 0) return createdDiff
        return a.name.localeCompare(b.name, 'es-AR')
      }),
  }))
}

function addMonthsToMonth(monthStr: string, monthsToAdd: number): string {
  const [year, month] = monthStr.slice(0, 7).split('-').map(Number)
  const totalMonths = year * 12 + (month - 1) + monthsToAdd
  const targetYear = Math.floor(totalMonths / 12)
  const targetMonth = (totalMonths % 12) + 1
  return `${targetYear}-${String(targetMonth).padStart(2, '0')}`
}

export function selectFundingForMonth(funding: GoalFundingRow[], month: string): GoalFundingRow | undefined {
  let selected: GoalFundingRow | undefined

  for (const row of funding) {
    if (row.effectiveMonth.slice(0, 7) > month.slice(0, 7)) continue
    if (!selected || selected.effectiveMonth.localeCompare(row.effectiveMonth) < 0) {
      selected = row
    }
  }

  return selected
}

export function projectGoalCompletion(params: {
  status: GoalStatus
  strategy: GoalStrategy
  targetAmount?: Money
  actualValue: Money
  savingsValue: Money
  investmentValue: Money
  annualReturnRate?: string
  funding: GoalFundingRow[]
  currentMonth: string
  getMonthlyContribution?: (month: string) => Money
}): GoalProjection {
  const {
    status,
    strategy,
    targetAmount,
    actualValue,
    savingsValue,
    investmentValue,
    annualReturnRate,
    funding,
    currentMonth,
    getMonthlyContribution,
  } = params

  if (!targetAmount) {
    return { status: 'target_unavailable' }
  }

  // Short-circuit reached Goals to currentMonth
  if (new BigNumber(actualValue.amount).isGreaterThanOrEqualTo(targetAmount.amount)) {
    return { status: 'available', completionMonth: currentMonth.slice(0, 7) }
  }

  // Short-circuit inactive Goals to plan_paused
  if (status !== 'active') {
    return { status: 'plan_paused' }
  }

  const horizonFunding = selectFundingForMonth(
    funding,
    addMonthsToMonth(currentMonth, PROJECTION_HORIZON_MONTHS - 1),
  )

  const horizonHasPositive =
    horizonFunding !== undefined && new BigNumber(horizonFunding.percentage).isGreaterThan(0)

  const hasPositiveAllocation =
    funding.some((f) => new BigNumber(f.percentage).isGreaterThan(0)) || horizonHasPositive

  const hasCommitmentAbsent =
    funding.some(
      (f) => new BigNumber(f.percentage).isGreaterThan(0) && f.monthlyContribution === undefined,
    ) || (horizonHasPositive && horizonFunding.monthlyContribution === undefined)

  if (hasCommitmentAbsent) {
    return { status: 'commitment_absent' }
  }

  const hasInvestBalance = new BigNumber(investmentValue.amount).isGreaterThan(0)
  const needsInvestmentSimulation = strategy === 'invest' && (hasPositiveAllocation || hasInvestBalance)

  let monthlyRate: BigNumber | undefined
  if (needsInvestmentSimulation) {
    if (annualReturnRate === undefined || annualReturnRate === null || annualReturnRate.trim() === '') {
      return { status: 'investment_assumption_unavailable' }
    }
    const annualNum = Number(annualReturnRate.replace(',', '.'))
    if (!Number.isFinite(annualNum) || annualNum <= -100) {
      return { status: 'investment_assumption_unavailable' }
    }
    const annualRate = annualNum / 100
    const compoundRate = Math.pow(1 + annualRate, 1 / 12) - 1
    if (!Number.isFinite(compoundRate)) {
      return { status: 'investment_assumption_unavailable' }
    }
    monthlyRate = new BigNumber(compoundRate)
  }

  // Bounded monthly simulation: 0..719
  let currentSavings = new BigNumber(savingsValue.amount)
  let currentInvestments = new BigNumber(investmentValue.amount)
  const targetBn = new BigNumber(targetAmount.amount)
  const baseMonth = currentMonth.slice(0, 7)

  for (let m = 0; m < PROJECTION_HORIZON_MONTHS; m++) {
    const projectedMonth = addMonthsToMonth(baseMonth, m)

    if (m > 0 && monthlyRate && strategy === 'invest') {
      currentInvestments = currentInvestments.times(new BigNumber(1).plus(monthlyRate))
    }

    const monthFunding = selectFundingForMonth(funding, projectedMonth)
    if (
      monthFunding &&
      new BigNumber(monthFunding.percentage).isGreaterThan(0)
    ) {
      let allocatedDestination = monthFunding.allocatedDestinationAmount
      if (getMonthlyContribution) {
        const monthContribution = getMonthlyContribution(projectedMonth)
        const allocatedBase = multiplyMoneyByFactor(
          monthContribution,
          new BigNumber(monthFunding.percentage).dividedBy(100).toString(),
        )
        allocatedDestination = convertCommitmentToDestination(allocatedBase, targetAmount.currency)
      }

      if (allocatedDestination && new BigNumber(allocatedDestination.amount).isGreaterThan(0)) {
        if (strategy === 'save') {
          currentSavings = currentSavings.plus(allocatedDestination.amount)
        } else if (strategy === 'invest') {
          currentInvestments = currentInvestments.plus(allocatedDestination.amount)
        }
      }
    }

    if (currentSavings.plus(currentInvestments).isGreaterThanOrEqualTo(targetBn)) {
      return { status: 'available', completionMonth: projectedMonth }
    }
  }

  if (!horizonHasPositive && (!hasInvestBalance || strategy !== 'invest')) {
    return { status: 'no_future_allocation' }
  }

  return { status: 'outside_horizon' }
}

export function buildGoalsWorkspace(
  rows: GoalsWorkspaceSource,
  currentMonth: string,
): GoalsWorkspace {
  const dedicationPercentage = rows.profile?.goalDedicationPercentage ?? '90.00'
  const hasPlan = rows.incomes !== undefined || rows.expenses !== undefined
  const monthlyPlan: MonthlyFinancialPlan = {
    incomes: rows.incomes ?? [],
    expenses: rows.expenses ?? [],
  }
  const currentFinancials = getMonthlyFinancialSummary(monthlyPlan, currentMonth)

  const hasLegacyContribution =
    rows.profile?.plannedMonthlyContribution !== null &&
    rows.profile?.plannedMonthlyContribution !== undefined

  let currentContribution: Money | undefined
  let getMonthlyContribution: ((month: string) => Money) | undefined

  if (hasPlan) {
    getMonthlyContribution = (month: string): Money => {
      const financials = getMonthlyFinancialSummary(monthlyPlan, month)
      return getGoalContributionArs(financials.balance, dedicationPercentage)
    }
    currentContribution = getMonthlyContribution(currentMonth)
  } else if (hasLegacyContribution) {
    const legacyContribution = createMoney(
      rows.profile!.plannedMonthlyContribution!,
      rows.profile?.baseCurrency ?? 'ARS',
    )
    currentContribution = legacyContribution
    getMonthlyContribution = () => legacyContribution
  } else {
    currentContribution = undefined
    getMonthlyContribution = undefined
  }

  const financialSummary: GoalsFinancialSummary = {
    ...currentFinancials,
    dedicationPercentage,
    contribution:
      currentContribution ??
      getGoalContributionArs(currentFinancials.balance, dedicationPercentage),
  }

  const goalItems: GoalWorkspaceItem[] = rows.goals.map((goal) => {
    // 1. Savings value
    const goalSavings = (rows.savingsPositions ?? []).filter((pos) => pos.goalId === goal.id)
    for (const pos of goalSavings) {
      if (pos.currency !== goal.currency) {
        throw new Error(`Persisted savings position currency mismatch: ${pos.currency} vs ${goal.currency}`)
      }
    }
    const savingsValue = goalSavings.reduce(
      (acc, pos) => addMoney(acc, createMoney(pos.amount, pos.currency)),
      createMoney('0', goal.currency),
    )

    // 2. Investment value & assumptions
    const goalInvestments = (rows.investmentPositions ?? []).filter((pos) => pos.goalId === goal.id)
    for (const pos of goalInvestments) {
      if (pos.currency !== goal.currency) {
        throw new Error(`Persisted investment position currency mismatch: ${pos.currency} vs ${goal.currency}`)
      }
    }
    const investmentPos = goalInvestments[0]
    const investmentValue = investmentPos
      ? createMoney(investmentPos.currentValue, investmentPos.currency)
      : createMoney('0', goal.currency)
    const annualReturnRate = investmentPos?.annualReturnRate ?? undefined
    const availability = investmentPos?.availability ?? undefined
    const availableFrom = investmentPos?.availableFrom ?? undefined

    // 3. Actual value
    const actualValue = addMoney(savingsValue, investmentValue)

    // 4. Target amount & Progress
    let usesPlanningRate = false
    let targetAmount = goal.targetAmount ? createMoney(goal.targetAmount, goal.currency) : undefined

    if (
      !targetAmount &&
      goal.type === 'emergency_fund' &&
      rows.profile?.expensesKnowledge === 'known' &&
      rows.profile?.approximateMonthlyExpenses
    ) {
      targetAmount = deriveEmergencyFundTarget(
        createMoney(rows.profile.approximateMonthlyExpenses, 'ARS'),
        goal.emergencyFundMonths ?? 6,
      )
      usesPlanningRate = true
    }

    let progressPercentage: string | undefined
    if (targetAmount) {
      const targetBn = new BigNumber(targetAmount.amount)
      if (targetBn.isGreaterThan(0)) {
        progressPercentage = new BigNumber(actualValue.amount)
          .dividedBy(targetBn)
          .times(100)
          .toFixed(2, BigNumber.ROUND_HALF_UP)
      }
    }

    // 5. Funding rows
    const goalAllocations = (rows.allocations ?? []).filter((alloc) => alloc.goalId === goal.id)
    const funding: GoalFundingRow[] = []

    for (const alloc of goalAllocations) {
      const snapshot = (rows.snapshots ?? []).find((s) => s.id === alloc.snapshotId)
      if (!snapshot) continue

      let allocatedBaseAmount: Money | undefined
      let allocatedDestinationAmount: Money | undefined

      if (currentContribution) {
        const factor = new BigNumber(alloc.percentage).dividedBy(100).toString()
        allocatedBaseAmount = multiplyMoneyByFactor(currentContribution, factor)
        allocatedDestinationAmount = convertCommitmentToDestination(
          allocatedBaseAmount,
          goal.currency,
        )

        if (allocatedBaseAmount.currency !== allocatedDestinationAmount.currency) {
          usesPlanningRate = true
        }
      }

      funding.push({
        percentage: alloc.percentage,
        monthlyContribution: currentContribution,
        allocatedBaseAmount,
        allocatedDestinationAmount,
        effectiveMonth: snapshot.effectiveMonth,
      })
    }

    // 6. Projection
    const projection = projectGoalCompletion({
      status: goal.status,
      strategy: goal.strategy,
      targetAmount,
      actualValue,
      savingsValue,
      investmentValue,
      annualReturnRate,
      funding,
      currentMonth,
      getMonthlyContribution,
    })

    // 7. desiredDateDeltaMonths
    let desiredDateDeltaMonths: number | undefined
    if (goal.desiredDate && projection.status === 'available') {
      const [compYear, compMonth] = projection.completionMonth.split('-').map(Number)
      const [desiredYear, desiredMonth] = goal.desiredDate.slice(0, 7).split('-').map(Number)
      desiredDateDeltaMonths = compYear * 12 + compMonth - (desiredYear * 12 + desiredMonth)
    }

    // 8. Contributions for this goal
    const allSourceContributions = rows.contributions ?? rows.savingContributions ?? []
    const goalContributions = allSourceContributions
      .filter((contrib) => contrib.allocations.some((a) => a.goalId === goal.id))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    return {
      id: goal.id,
      name: goal.name,
      type: goal.type,
      currency: goal.currency,
      priority: goal.priority,
      strategy: goal.strategy,
      status: goal.status,
      createdAt: goal.createdAt,
      desiredDate: goal.desiredDate ?? undefined,
      completedAt: goal.completedAt ?? undefined,
      targetAmount,
      savingsValue,
      investmentValue,
      actualValue,
      progressPercentage,
      funding,
      projection,
      desiredDateDeltaMonths,
      annualReturnRate,
      availability,
      availableFrom,
      usesPlanningRate,
      contributions: goalContributions,
      savingContributions: goalContributions,
    }
  })

  return {
    financialSummary,
    groups: groupGoals(goalItems),
  }
}

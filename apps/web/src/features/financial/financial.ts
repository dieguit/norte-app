import BigNumber from 'bignumber.js'
import {
  type CurrencyCode,
  type Money,
  createMoney,
  isPositiveMoney,
  parseMoneyInput,
} from '../../lib/money'

export type InitialGoalKind = 'emergency_fund' | 'fixed_savings' | 'car'

export const INITIAL_GOAL_NAMES: Record<InitialGoalKind, string> = {
  emergency_fund: 'Colchón financiero',
  fixed_savings: 'Quiero ahorrar cierta suma de dinero',
  car: 'Quiero cambiar el auto',
}

export const PLANNING_ARS_PER_USD = '1500'
export const PROJECTION_HORIZON_MONTHS = 720

export type FundingMethod = 'save' | 'invest'

export interface InitialPlanInput {
  goalKind: InitialGoalKind | string
  income: string
  expensesKnowledge: 'known' | 'unknown' | string
  expenses?: string
  plannedContribution: string
  fixedTarget?: string
}

export interface InitialPlan {
  goalKind: InitialGoalKind
  income: Money
  expensesKnowledge: 'known' | 'unknown'
  expenses?: Money
  plannedContribution: Money
  fixedTarget?: Money
}

export interface DerivedInitialGoal {
  type: InitialGoalKind
  name: string
  targetAmount?: Money
  currency: CurrencyCode
  emergencyFundMonths?: number
  saveEnabled: boolean
  investEnabled: boolean
}

export interface DerivedInitialChannel {
  fundingMethod: FundingMethod
  destinationCurrency: CurrencyCode
  monthlyCommitment: Money
  effectiveMonth: string
}

export type CompletionProjection =
  | { status: 'available'; completionMonth: string }
  | { status: 'unknown_expenses' }
  | { status: 'outside_horizon' }

export interface InitialHomeState {
  income: Money
  expensesKnowledge: 'known' | 'unknown'
  expenses?: Money
  plan: {
    fundingMethod: FundingMethod
    destinationCurrency: CurrencyCode
    monthlyCommitment: Money
    destinationAmount: Money
    effectiveMonth: string
    allocationPercentage: string
  }
  goal: {
    type: string
    name: string
    targetAmount?: Money
    currentAmount: Money
    emergencyFundMonths?: number
  }
  projection: CompletionProjection
}

export function parseInitialPlan(input: InitialPlanInput): InitialPlan {
  const goalKind = input.goalKind as InitialGoalKind
  if (goalKind !== 'emergency_fund' && goalKind !== 'fixed_savings' && goalKind !== 'car') {
    throw new Error('Tipo de objetivo inválido.')
  }

  const income = parseMoneyInput(input.income, 'ARS')
  if (!income) {
    throw new Error('Ingresá tus ingresos mensuales aproximados.')
  }

  const expensesKnowledge = input.expensesKnowledge === 'known' ? 'known' : 'unknown'
  let expenses: Money | undefined

  if (expensesKnowledge === 'known') {
    const parsedExpenses = parseMoneyInput(input.expenses ?? '', 'ARS')
    if (!parsedExpenses) {
      throw new Error('Ingresá tus gastos mensuales aproximados.')
    }
    expenses = parsedExpenses
  }

  const plannedContribution = parseMoneyInput(input.plannedContribution, 'ARS')
  if (!plannedContribution) {
    throw new Error('Ingresá un aporte mensual mayor a cero.')
  }

  let fixedTarget: Money | undefined
  if (goalKind === 'fixed_savings' || goalKind === 'car') {
    const parsedFixedTarget = parseMoneyInput(input.fixedTarget ?? '', 'ARS')
    if (!parsedFixedTarget || !isPositiveMoney(parsedFixedTarget)) {
      throw new Error('Ingresá un monto objetivo mayor a cero.')
    }
    fixedTarget = parsedFixedTarget
  }

  return {
    goalKind,
    income,
    expensesKnowledge,
    expenses,
    plannedContribution,
    fixedTarget,
  }
}

export function getNextCalendarMonth(now: Date): string {
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() + 1
  const next = new Date(Date.UTC(year, month, 1))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`
}

export function deriveInitialGoal(plan: InitialPlan): DerivedInitialGoal {
  const isEmergency = plan.goalKind === 'emergency_fund'

  return {
    type: plan.goalKind,
    name: INITIAL_GOAL_NAMES[plan.goalKind],
    targetAmount: isEmergency ? undefined : plan.fixedTarget,
    currency: isEmergency ? 'USD' : 'ARS',
    emergencyFundMonths: isEmergency ? 6 : undefined,
    saveEnabled: true,
    investEnabled: false,
  }
}

export function deriveInitialChannel(plan: InitialPlan, now: Date): DerivedInitialChannel {
  return {
    fundingMethod: 'save',
    destinationCurrency: plan.goalKind === 'emergency_fund' ? 'USD' : 'ARS',
    monthlyCommitment: plan.plannedContribution,
    effectiveMonth: getNextCalendarMonth(now),
  }
}

export function convertCommitmentToDestination(
  commitment: Money,
  destinationCurrency: CurrencyCode,
): Money {
  if (commitment.currency === destinationCurrency) return commitment
  if (commitment.currency !== 'ARS' || destinationCurrency !== 'USD') {
    throw new Error('Unsupported planning-rate conversion.')
  }
  return createMoney(
    new BigNumber(commitment.amount).dividedBy(PLANNING_ARS_PER_USD),
    'USD',
  )
}

export function deriveEmergencyFundTarget(expenses: Money, months: number): Money {
  if (expenses.currency !== 'ARS') throw new Error('Emergency expenses must use ARS.')
  return createMoney(
    new BigNumber(expenses.amount).times(months).dividedBy(PLANNING_ARS_PER_USD),
    'USD',
  )
}

export function projectCompletionMonth(
  target: Money,
  monthlyContribution: Money,
  effectiveMonth: string,
): CompletionProjection {
  if (target.currency !== monthlyContribution.currency) {
    throw new Error('Projection currencies must match.')
  }

  const monthly = new BigNumber(monthlyContribution.amount)
  if (!monthly.isGreaterThan(0)) return { status: 'outside_horizon' }

  const months = new BigNumber(target.amount).dividedBy(monthly).integerValue(BigNumber.ROUND_CEIL).toNumber()
  if (months > PROJECTION_HORIZON_MONTHS) return { status: 'outside_horizon' }

  const [year, month] = effectiveMonth.split('-').map(Number)
  const completion = new Date(Date.UTC(year, month - 1 + Math.max(months - 1, 0), 1))
  return {
    status: 'available',
    completionMonth: `${completion.getUTCFullYear()}-${String(completion.getUTCMonth() + 1).padStart(2, '0')}`,
  }
}

import {
  type Money,
  isPositiveMoney,
  multiplyMoneyByFactor,
  parseMoneyInput,
} from '../lib/money'

export type InitialGoalKind = 'emergency_fund' | 'fixed_savings' | 'car'

export const INITIAL_GOAL_NAMES: Record<InitialGoalKind, string> = {
  emergency_fund: 'Colchón financiero',
  fixed_savings: 'Quiero ahorrar cierta suma de dinero',
  car: 'Quiero cambiar el auto',
}

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
  emergencyFundMonths?: number
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
  if (!plannedContribution || !isPositiveMoney(plannedContribution)) {
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

export function deriveInitialGoal(plan: InitialPlan): DerivedInitialGoal {
  const targetAmount =
    plan.goalKind === 'emergency_fund'
      ? plan.expenses
        ? multiplyMoneyByFactor(plan.expenses, 6)
        : undefined
      : plan.fixedTarget

  return {
    type: plan.goalKind,
    name: INITIAL_GOAL_NAMES[plan.goalKind],
    targetAmount,
    emergencyFundMonths: plan.goalKind === 'emergency_fund' ? 6 : undefined,
  }
}

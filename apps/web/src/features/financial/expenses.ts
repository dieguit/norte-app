import BigNumber from 'bignumber.js'
import { createMoney, type Money } from '../../lib/money'
import { PLANNING_ARS_PER_USD } from './financial'

export const FIXED_EXPENSE_SOURCES = {
  housing: 'Alquiler / vivienda',
  school: 'Colegio',
  health: 'Prepaga / salud',
  loans: 'Préstamos',
  utilities: 'Servicios',
  insurance: 'Seguros',
  family_support: 'Ayuda a familiares',
  subscriptions: 'Suscripciones',
} as const

export type FixedExpenseSourceKind = keyof typeof FIXED_EXPENSE_SOURCES

export interface ExpenseMonthInput {
  amount: Money
  recurring: boolean
  effectiveMonth: string
  endMonth?: string | null
}

export interface ExpensesWorkspace {
  sources: Array<{ id: string; name: string; normalizedName: string }>
  expenses: Array<{
    id: string
    sourceKind: string
    sourceId: string | null
    sourceName: string
    amount: string
    currency: 'ARS' | 'USD'
    recurring: boolean
    effectiveMonth: string
    endMonth: string | null
  }>
}

export function isExpenseIncludedInMonth(
  expense: Pick<ExpenseMonthInput, 'recurring' | 'effectiveMonth' | 'endMonth'>,
  month: string,
) {
  const targetMonth = month.slice(0, 7)
  const effectiveMonth = expense.effectiveMonth.slice(0, 7)
  const endMonth = expense.endMonth?.slice(0, 7)
  return expense.recurring
    ? effectiveMonth <= targetMonth && (endMonth === undefined || targetMonth < endMonth)
    : effectiveMonth === targetMonth
}

export function getExpenseTotalArs(expenses: ExpenseMonthInput[], month: string): Money {
  const total = expenses.reduce((sum, expense) => {
    if (!isExpenseIncludedInMonth(expense, month)) return sum
    return sum.plus(
      expense.amount.currency === 'USD'
        ? new BigNumber(expense.amount.amount).times(PLANNING_ARS_PER_USD)
        : expense.amount.amount,
    )
  }, new BigNumber(0))

  return createMoney(total, 'ARS')
}

export function getMonthlyBalanceArs(income: Money, expenses: Money): Money {
  if (income.currency !== 'ARS' || expenses.currency !== 'ARS') {
    throw new Error('Balance calculations must use ARS.')
  }
  const balance = new BigNumber(income.amount).minus(expenses.amount)
  return createMoney(balance, 'ARS')
}

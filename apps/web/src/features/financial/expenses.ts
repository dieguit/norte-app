import BigNumber from 'bignumber.js'
import { createMoney, type Money } from '../../lib/money'
import { PLANNING_ARS_PER_USD } from './financial'

export {
  RECURRING_EXPENSE_SOURCES,
  ONE_TIME_EXPENSE_SOURCES,
  FIXED_EXPENSE_SOURCES,
} from '@repo/shared-types'

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
    concept: string | null
    amount: string
    currency: 'ARS' | 'USD'
    recurring: boolean
    effectiveMonth: string
    endMonth: string | null
  }>
}

import { isExpenseIncludedInMonth } from '@repo/shared-types'
export { isExpenseIncludedInMonth }

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

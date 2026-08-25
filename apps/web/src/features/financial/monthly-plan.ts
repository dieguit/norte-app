import BigNumber from 'bignumber.js'
import { createMoney, type Money } from '../../lib/money'
import { getExpenseTotalArs, getMonthlyBalanceArs, type ExpensesWorkspace } from './expenses'
import { getIncomeTotalArs, type IncomesWorkspace } from './incomes'

export interface MonthlyFinancialPlan {
  incomes: IncomesWorkspace['incomes']
  expenses: ExpensesWorkspace['expenses']
}

export interface MonthlyFinancialSummary {
  month: string
  income: Money
  expenses: Money
  balance: Money
}

export function getMonthlyFinancialSummary(
  plan: MonthlyFinancialPlan,
  month: string,
): MonthlyFinancialSummary {
  const income = getIncomeTotalArs(
    plan.incomes.map((item) => ({
      amount: createMoney(item.amount, item.currency),
      recurring: item.recurring,
      effectiveMonth: item.effectiveMonth,
    })),
    month,
  )
  const expenses = getExpenseTotalArs(
    plan.expenses.map((item) => ({
      amount: createMoney(item.amount, item.currency),
      recurring: item.recurring,
      effectiveMonth: item.effectiveMonth,
      endMonth: item.endMonth,
    })),
    month,
  )

  return {
    month: month.slice(0, 7),
    income,
    expenses,
    balance: getMonthlyBalanceArs(income, expenses),
  }
}

export function getGoalContributionArs(balance: Money, percentage: number | string): Money {
  const positiveBalance = BigNumber.maximum(balance.amount, 0)
  return createMoney(positiveBalance.times(percentage).dividedBy(100), 'ARS')
}

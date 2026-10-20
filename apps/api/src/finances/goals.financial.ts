import BigNumber from 'bignumber.js';
import {
  createMoney,
  PLANNING_ARS_PER_USD,
  type CurrencyCode,
  type Money,
} from '@repo/finance-utils';

export interface MonthlyFinancialPlan {
  incomes: Array<{ amount: string; currency: CurrencyCode; recurring: boolean; effectiveMonth: string }>;
  expenses: Array<{ amount: string; currency: CurrencyCode; recurring: boolean; effectiveMonth: string; endMonth?: string | null }>;
}
export interface MonthlyFinancialSummary { month: string; income: Money; expenses: Money; balance: Money }

export function getMonthlyFinancialSummary(plan: MonthlyFinancialPlan, month: string): MonthlyFinancialSummary {
  const total = (rows: Array<{ amount: string; currency: CurrencyCode; recurring: boolean; effectiveMonth: string; endMonth?: string | null }>, expense: boolean) => createMoney(rows.reduce((sum, row) => {
    const effective = row.effectiveMonth.slice(0, 7);
    const end = row.endMonth?.slice(0, 7);
    const included = expense
      ? row.recurring ? effective <= month && (!end || month < end) : effective === month
      : row.recurring ? effective <= month : effective === month;
    return included ? sum.plus(row.currency === 'USD' ? new BigNumber(row.amount).times(PLANNING_ARS_PER_USD) : row.amount) : sum;
  }, new BigNumber(0)), 'ARS');
  const income = total(plan.incomes, false);
  const expenses = total(plan.expenses, true);
  return { month: month.slice(0, 7), income, expenses, balance: createMoney(new BigNumber(income.amount).minus(expenses.amount), 'ARS') };
}

export function getGoalContributionArs(balance: Money, percentage: number | string): Money {
  return createMoney(BigNumber.maximum(balance.amount, 0).times(percentage).dividedBy(100), 'ARS');
}

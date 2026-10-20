import BigNumber from 'bignumber.js';
import { createMoney, type CurrencyCode, type Money } from './goals.money';

export const PLANNING_ARS_PER_USD = '1500';
export const PROJECTION_HORIZON_MONTHS = 720;

export function convertCommitmentToDestination(commitment: Money, currency: CurrencyCode): Money {
  if (commitment.currency === currency) return commitment;
  if (commitment.currency !== 'ARS' || currency !== 'USD') throw new Error('Unsupported planning-rate conversion.');
  return createMoney(new BigNumber(commitment.amount).dividedBy(PLANNING_ARS_PER_USD), 'USD');
}

export function deriveEmergencyFundTarget(expenses: Money, months: number): Money {
  if (expenses.currency !== 'ARS') throw new Error('Emergency expenses must use ARS.');
  return createMoney(new BigNumber(expenses.amount).times(months).dividedBy(PLANNING_ARS_PER_USD), 'USD');
}

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

import BigNumber from 'bignumber.js';
import {
  createMoney,
  PLANNING_ARS_PER_USD,
  type Money,
} from '@repo/finance-utils';

export interface MonthlyFinancialRow {
  amount: string;
  currency: string;
  recurring: boolean;
  effectiveMonth: string;
  endMonth?: string | null;
}

export interface MonthlyFinancialPlan {
  incomes: MonthlyFinancialRow[];
  expenses: MonthlyFinancialRow[];
}
export interface MonthlyFinancialSummary {
  month: string;
  income: Money;
  expenses: Money;
  balance: Money;
}

export interface MonthlyFinancialSummaryOptions {
  includeOneOffIncome?: boolean;
}

export function getMonthlyFinancialSummary(
  plan: MonthlyFinancialPlan,
  month: string,
  options: MonthlyFinancialSummaryOptions = {},
): MonthlyFinancialSummary {
  const { includeOneOffIncome = true } = options;
  const total = (rows: MonthlyFinancialRow[], expense: boolean) =>
    createMoney(
      rows.reduce((sum, row) => {
        const effective = row.effectiveMonth.slice(0, 7);
        const end = row.endMonth?.slice(0, 7);
        const included = expense
          ? row.recurring
            ? effective <= month && (!end || month < end)
            : effective === month
          : row.recurring
            ? effective <= month
            : includeOneOffIncome
              ? effective === month
              : false;
        return included
          ? sum.plus(
              row.currency === 'USD'
                ? new BigNumber(row.amount).times(PLANNING_ARS_PER_USD)
                : row.amount,
            )
          : sum;
      }, new BigNumber(0)),
      'ARS',
    );
  const income = total(plan.incomes, false);
  const expenses = total(plan.expenses, true);
  return {
    month: month.slice(0, 7),
    income,
    expenses,
    balance: createMoney(
      new BigNumber(income.amount).minus(expenses.amount),
      'ARS',
    ),
  };
}

export function getGoalContributionArs(
  balance: Money,
  percentage: number | string,
): Money {
  return createMoney(
    BigNumber.maximum(balance.amount, 0).times(percentage).dividedBy(100),
    'ARS',
  );
}

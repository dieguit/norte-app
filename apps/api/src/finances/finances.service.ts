import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gte, inArray, lt } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import BigNumber from 'bignumber.js';
import {
  FinancesWorkspaceSchema,
  type FinancesWorkspace,
} from '@repo/shared-types';
import { argentinaInstant, DAY_MS, todayInArgentina } from '../argentina-time';
import { DATABASE_CONNECTION } from '../database/database.constants';
import type { Database } from '../database/database.types';
import {
  expenses,
  expenseSources,
  financialGoals,
  financialProfiles,
  goalCompletionWithdrawals,
  incomes,
  incomeSources,
  investmentContributions,
  savingContributions,
  savingsPlaceTransfers,
  savingsPlaces,
} from '../profile/profile.schema';
import {
  calculateSavingsBalances,
  filterOwnedSavingsMovements,
} from './savings-projection';
import { getMonthlyFinancialSummary } from './goals.financial';

const RATE = '1500';
type Row = {
  amount: string;
  currency: string;
  recurring: boolean;
  effectiveMonth: string;
  endMonth?: string | null;
};
const ars = (amount: BigNumber) => ({
  amount: amount.toFixed(2, BigNumber.ROUND_HALF_UP),
  currency: 'ARS' as const,
});

const arsEquivalent = (amount: string, currency: string) =>
  currency === 'USD'
    ? new BigNumber(amount).times(RATE).toFixed(2, BigNumber.ROUND_HALF_UP)
    : null;

type IncomeRow = typeof incomes.$inferSelect;
type ExpenseRow = typeof expenses.$inferSelect;

const toIncomeItem = (row: IncomeRow, sourceNames: Map<string, string>) => ({
  id: row.id,
  sourceKind: row.sourceKind,
  sourceId: row.sourceId,
  sourceName: row.sourceId
    ? (sourceNames.get(row.sourceId) ?? 'Fuente eliminada')
    : row.sourceKind,
  concept: row.concept,
  amount: row.amount,
  currency: row.currency as 'ARS' | 'USD',
  recurring: row.recurring,
  effectiveMonth: row.effectiveMonth,
  createdAt: row.createdAt.toISOString(),
  arsEquivalent: arsEquivalent(row.amount, row.currency),
});

const toExpenseItem = (row: ExpenseRow, sourceNames: Map<string, string>) => ({
  id: row.id,
  sourceKind: row.sourceKind,
  sourceId: row.sourceId,
  sourceName: row.sourceId
    ? (sourceNames.get(row.sourceId) ?? 'Concepto eliminado')
    : row.sourceKind,
  concept: row.concept,
  amount: row.amount,
  currency: row.currency as 'ARS' | 'USD',
  recurring: row.recurring,
  effectiveMonth: row.effectiveMonth,
  endMonth: row.endMonth,
  createdAt: row.createdAt.toISOString(),
  arsEquivalent: arsEquivalent(row.amount, row.currency),
});

const totalsByCurrency = (items: { amount: string; currency: string }[]) =>
  items.reduce<Record<string, string>>(
    (totals, { amount, currency }) => ({
      ...totals,
      [currency]: new BigNumber(totals[currency] ?? 0).plus(amount).toFixed(2),
    }),
    {},
  );

export function calculateFinancesSummary(input: {
  month: string;
  dedication: string;
  incomes: Row[];
  expenses: Row[];
}) {
  const summary = getMonthlyFinancialSummary(
    { incomes: input.incomes, expenses: input.expenses },
    input.month,
  );
  const balanceBn = new BigNumber(summary.balance.amount);
  const contribution = balanceBn.isGreaterThan(0)
    ? balanceBn.times(input.dedication).dividedBy(100)
    : new BigNumber(0);
  return {
    income: summary.income,
    expenses: summary.expenses,
    balance: summary.balance,
    contribution: ars(contribution),
  };
}

@Injectable()
export class FinancesService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async getWorkspace(
    userId: string,
    month = new Date().toISOString().slice(0, 7),
  ): Promise<FinancesWorkspace | null> {
    const profile = await this.db.query.financialProfiles.findFirst({
      where: eq(financialProfiles.userId, userId),
    });
    if (!profile) return null;
    const [is, ins, es, exs, places, contributions, transfers, goals] =
      await Promise.all([
        this.db.query.incomeSources.findMany({
          where: eq(incomeSources.userId, userId),
        }),
        this.db.query.incomes.findMany({ where: eq(incomes.userId, userId) }),
        this.db.query.expenseSources.findMany({
          where: eq(expenseSources.userId, userId),
        }),
        this.db.query.expenses.findMany({ where: eq(expenses.userId, userId) }),
        this.db.query.savingsPlaces.findMany({
          where: eq(savingsPlaces.userId, userId),
        }),
        this.db.query.savingContributions.findMany({
          where: eq(savingContributions.userId, userId),
        }),
        this.db.query.savingsPlaceTransfers.findMany({
          where: eq(savingsPlaceTransfers.userId, userId),
        }),
        this.db.query.financialGoals.findMany({
          where: eq(financialGoals.userId, userId),
        }),
      ]);
    const placeIds = places.map(({ id }) => id);
    const goalIds = goals.map(({ id }) => id);
    const [withdrawals] =
      placeIds.length && goalIds.length
        ? await Promise.all([
            this.db.query.goalCompletionWithdrawals.findMany({
              where: and(
                inArray(goalCompletionWithdrawals.placeId, placeIds),
                inArray(goalCompletionWithdrawals.goalId, goalIds),
              ),
            }),
          ])
        : [[]];
    const placeMap = new Map(places.map(({ id, name }) => [id, name]));
    const goalMap = new Map(goals.map(({ id, name }) => [id, name]));
    const {
      contributions: safeContributions,
      transfers: safeTransfers,
      withdrawals: safeWithdrawals,
    } = filterOwnedSavingsMovements({
      placeIds: new Set(placeIds),
      goalIds: new Set(goalIds),
      contributions,
      transfers,
      withdrawals,
    });
    const placesWithBalances = calculateSavingsBalances({
      places,
      contributions: safeContributions,
      transfers: safeTransfers,
      withdrawals: safeWithdrawals,
    });
    const incomeSourceMap = new Map(is.map(({ id, name }) => [id, name]));
    const expenseSourceMap = new Map(es.map(({ id, name }) => [id, name]));
    const movements = [
      ...safeContributions.map((c) => ({
        kind: 'contribution' as const,
        id: c.id,
        placeId: c.placeId,
        placeName: placeMap.get(c.placeId)!,
        amount: c.amount,
        currency: c.currency as 'ARS' | 'USD',
        createdAt: c.createdAt.toISOString(),
      })),
      ...safeTransfers.map((t) => ({
        kind: 'transfer' as const,
        id: t.id,
        fromPlaceId: t.fromPlaceId,
        fromPlaceName: placeMap.get(t.fromPlaceId)!,
        toPlaceId: t.toPlaceId,
        toPlaceName: placeMap.get(t.toPlaceId)!,
        amount: t.amount,
        currency: t.currency as 'ARS' | 'USD',
        createdAt: t.createdAt.toISOString(),
      })),
      ...safeWithdrawals.map((w) => ({
        kind: 'completion' as const,
        id: w.id,
        goalId: w.goalId,
        goalName: goalMap.get(w.goalId)!,
        placeId: w.placeId,
        placeName: placeMap.get(w.placeId)!,
        amount: w.amount,
        currency: w.currency as 'ARS' | 'USD',
        createdAt: w.createdAt.toISOString(),
      })),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return FinancesWorkspaceSchema.parse({
      goalDedicationPercentage: profile.goalDedicationPercentage,
      month,
      summary: calculateFinancesSummary({
        month,
        dedication: profile.goalDedicationPercentage,
        incomes: ins,
        expenses: exs,
      }),
      incomes: {
        sources: is.map(({ id, name, normalizedName }) => ({
          id,
          name,
          normalizedName,
        })),
        incomes: ins.map((row) => toIncomeItem(row, incomeSourceMap)),
      },
      expenses: {
        sources: es.map(({ id, name, normalizedName }) => ({
          id,
          name,
          normalizedName,
        })),
        expenses: exs.map((row) => toExpenseItem(row, expenseSourceMap)),
      },
      savings: {
        places: placesWithBalances.map((place) => ({
          ...place,
          hasMovements:
            safeContributions.some((c) => c.placeId === place.id) ||
            safeWithdrawals.some((w) => w.placeId === place.id) ||
            safeTransfers.some(
              (t) => t.fromPlaceId === place.id || t.toPlaceId === place.id,
            ),
        })),
        movements,
      },
    });
  }

  // Incomes/expenses only carry a month, so "movements in range" means registered (createdAt) in range.
  async getMovementsInRange(userId: string, from: Date, to: Date) {
    const inRange = (owner: AnyPgColumn, created: AnyPgColumn) =>
      and(eq(owner, userId), gte(created, from), lt(created, to));
    const [is, ins, es, exs, savings, investments] = await Promise.all([
      this.db.query.incomeSources.findMany({
        where: eq(incomeSources.userId, userId),
      }),
      this.db.query.incomes.findMany({
        where: inRange(incomes.userId, incomes.createdAt),
      }),
      this.db.query.expenseSources.findMany({
        where: eq(expenseSources.userId, userId),
      }),
      this.db.query.expenses.findMany({
        where: inRange(expenses.userId, expenses.createdAt),
      }),
      this.db.query.savingContributions.findMany({
        where: inRange(
          savingContributions.userId,
          savingContributions.createdAt,
        ),
      }),
      this.db.query.investmentContributions.findMany({
        where: inRange(
          investmentContributions.userId,
          investmentContributions.createdAt,
        ),
      }),
    ]);
    const incomeNames = new Map(is.map(({ id, name }) => [id, name]));
    const expenseNames = new Map(es.map(({ id, name }) => [id, name]));
    const incomeItems = ins.map((row) => toIncomeItem(row, incomeNames));
    const expenseItems = exs.map((row) => toExpenseItem(row, expenseNames));
    const contributions = [
      ...savings.map((c) => ({ kind: 'saving' as const, c })),
      ...investments.map((c) => ({ kind: 'investment' as const, c })),
    ].map(({ kind, c }) => ({
      kind,
      id: c.id,
      amount: c.amount,
      currency: c.currency as 'ARS' | 'USD',
    }));
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      incomes: incomeItems,
      expenses: expenseItems,
      contributions,
      totals: {
        incomes: totalsByCurrency(incomeItems),
        expenses: totalsByCurrency(expenseItems),
        contributions: totalsByCurrency(contributions),
      },
    };
  }

  async getDailySummary(userId: string, now = new Date()) {
    const { today } = todayInArgentina(now);
    const from = argentinaInstant(today);
    const movements = await this.getMovementsInRange(
      userId,
      from,
      new Date(from.getTime() + DAY_MS),
    );
    return { day: today, ...movements };
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import BigNumber from 'bignumber.js';
import { FinancesWorkspaceSchema, type FinancesWorkspace } from '@repo/shared-types';
import { DATABASE_CONNECTION } from '../database/database.constants';
import type { Database } from '../database/database.types';
import { expenses, expenseSources, financialGoals, financialProfiles, goalCompletionWithdrawals, incomes, incomeSources, savingContributions, savingsPlaceTransfers, savingsPlaces } from '../profile/profile.schema';
import { calculateSavingsBalances, filterOwnedSavingsMovements } from './savings-projection';

const RATE = '1500';
type Row = { amount: string; currency: string; recurring: boolean; effectiveMonth: string; endMonth?: string | null };
const ars = (amount: BigNumber) => ({ amount: amount.toFixed(2, BigNumber.ROUND_HALF_UP), currency: 'ARS' as const });

export function calculateFinancesSummary(input: { month: string; dedication: string; incomes: Row[]; expenses: Row[] }) {
  const total = (rows: Row[], expense: boolean) => ars(rows.reduce((sum, row) => {
    const effective = row.effectiveMonth.slice(0, 7);
    const end = row.endMonth?.slice(0, 7);
    const included = expense ? row.recurring ? effective <= input.month && (!end || input.month < end) : effective === input.month : row.recurring ? effective <= input.month : effective === input.month;
    return included ? sum.plus(row.currency === 'USD' ? new BigNumber(row.amount).times(RATE) : row.amount) : sum;
  }, new BigNumber(0)));
  const income = total(input.incomes, false);
  const expensesTotal = total(input.expenses, true);
  const balance = new BigNumber(income.amount).minus(expensesTotal.amount);
  const contribution = balance.isGreaterThan(0) ? balance.times(input.dedication).dividedBy(100) : new BigNumber(0);
  return { income, expenses: expensesTotal, balance: ars(balance), contribution: ars(contribution) };
}

@Injectable()
export class FinancesService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async getWorkspace(userId: string, month = new Date().toISOString().slice(0, 7)): Promise<FinancesWorkspace | null> {
    const profile = await this.db.query.financialProfiles.findFirst({ where: eq(financialProfiles.userId, userId) });
    if (!profile) return null;
    const [is, ins, es, exs, places, contributions, transfers, goals] = await Promise.all([
      this.db.query.incomeSources.findMany({ where: eq(incomeSources.userId, userId) }),
      this.db.query.incomes.findMany({ where: eq(incomes.userId, userId) }),
      this.db.query.expenseSources.findMany({ where: eq(expenseSources.userId, userId) }),
      this.db.query.expenses.findMany({ where: eq(expenses.userId, userId) }),
      this.db.query.savingsPlaces.findMany({ where: eq(savingsPlaces.userId, userId) }),
      this.db.query.savingContributions.findMany({ where: eq(savingContributions.userId, userId) }),
      this.db.query.savingsPlaceTransfers.findMany({ where: eq(savingsPlaceTransfers.userId, userId) }),
      this.db.query.financialGoals.findMany({ where: eq(financialGoals.userId, userId) }),
    ]);
    const placeIds = places.map(({ id }) => id);
    const goalIds = goals.map(({ id }) => id);
    const [withdrawals] = placeIds.length && goalIds.length ? await Promise.all([this.db.query.goalCompletionWithdrawals.findMany({ where: and(inArray(goalCompletionWithdrawals.placeId, placeIds), inArray(goalCompletionWithdrawals.goalId, goalIds)) })]) : [[]];
    const placeMap = new Map(places.map(({ id, name }) => [id, name]));
    const goalMap = new Map(goals.map(({ id, name }) => [id, name]));
    const { contributions: safeContributions, transfers: safeTransfers, withdrawals: safeWithdrawals } = filterOwnedSavingsMovements({ placeIds: new Set(placeIds), goalIds: new Set(goalIds), contributions, transfers, withdrawals });
    const placesWithBalances = calculateSavingsBalances({ places, contributions: safeContributions, transfers: safeTransfers, withdrawals: safeWithdrawals });
    const incomeSourceMap = new Map(is.map(({ id, name }) => [id, name]));
    const expenseSourceMap = new Map(es.map(({ id, name }) => [id, name]));
    const toEq = (amount: string, currency: string) => currency === 'USD' ? new BigNumber(amount).times(RATE).toFixed(2, BigNumber.ROUND_HALF_UP) : null;
    const incomeRows = ins.map((row) => ({ ...row, arsEquivalent: toEq(row.amount, row.currency) }));
    const expenseRows = exs.map((row) => ({ ...row, arsEquivalent: toEq(row.amount, row.currency) }));
    const movements = [
      ...safeContributions.map((c) => ({ kind: 'contribution' as const, id: c.id, placeId: c.placeId, placeName: placeMap.get(c.placeId)!, amount: c.amount, currency: c.currency as 'ARS' | 'USD', createdAt: c.createdAt.toISOString() })),
      ...safeTransfers.map((t) => ({ kind: 'transfer' as const, id: t.id, fromPlaceId: t.fromPlaceId, fromPlaceName: placeMap.get(t.fromPlaceId)!, toPlaceId: t.toPlaceId, toPlaceName: placeMap.get(t.toPlaceId)!, amount: t.amount, currency: t.currency as 'ARS' | 'USD', createdAt: t.createdAt.toISOString() })),
      ...safeWithdrawals.map((w) => ({ kind: 'completion' as const, id: w.id, goalId: w.goalId, goalName: goalMap.get(w.goalId)!, placeId: w.placeId, placeName: placeMap.get(w.placeId)!, amount: w.amount, currency: w.currency as 'ARS' | 'USD', createdAt: w.createdAt.toISOString() })),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return FinancesWorkspaceSchema.parse({
      goalDedicationPercentage: profile.goalDedicationPercentage,
      month,
      summary: calculateFinancesSummary({ month, dedication: profile.goalDedicationPercentage, incomes: ins, expenses: exs }),
      incomes: { sources: is.map(({ id, name, normalizedName }) => ({ id, name, normalizedName })), incomes: incomeRows.map(({ id, sourceKind, sourceId, concept, amount, currency, recurring, effectiveMonth, arsEquivalent }) => ({ id, sourceKind, sourceId, sourceName: sourceId ? incomeSourceMap.get(sourceId) ?? 'Fuente eliminada' : sourceKind, concept, amount, currency: currency as 'ARS' | 'USD', recurring, effectiveMonth, arsEquivalent })) },
      expenses: { sources: es.map(({ id, name, normalizedName }) => ({ id, name, normalizedName })), expenses: expenseRows.map(({ id, sourceKind, sourceId, concept, amount, currency, recurring, effectiveMonth, endMonth, arsEquivalent }) => ({ id, sourceKind, sourceId, sourceName: sourceId ? expenseSourceMap.get(sourceId) ?? 'Concepto eliminado' : sourceKind, concept, amount, currency: currency as 'ARS' | 'USD', recurring, effectiveMonth, endMonth, arsEquivalent })) },
      savings: { places: placesWithBalances.map((place) => ({ ...place, hasMovements: safeContributions.some((c) => c.placeId === place.id) || safeWithdrawals.some((w) => w.placeId === place.id) || safeTransfers.some((t) => t.fromPlaceId === place.id || t.toPlaceId === place.id) })), movements },
    });
  }
}

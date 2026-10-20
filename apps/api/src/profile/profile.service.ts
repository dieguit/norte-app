import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import BigNumber from 'bignumber.js';
import type { InitialHomeState, ProfileResponse } from '@repo/shared-types';
import { DATABASE_CONNECTION } from '../database/database.constants';
import type { Database } from '../database/database.types';
import {
  allocationPlanEntries,
  allocationPlanSnapshots,
  expenses,
  financialGoals,
  financialProfiles,
  incomes,
  investmentContributions,
  savingContributions,
} from './profile.schema';

type Currency = 'ARS' | 'USD';
type Money = { amount: string; currency: Currency };
type ContributionKind = 'saving' | 'investment';
type Shortfall = { kind: ContributionKind; currency: Currency; amount: Money };
const PLANNING_ARS_PER_USD = '1500';
type ReadyProfile = {
  profile: typeof financialProfiles.$inferSelect;
  incomeRows: (typeof incomes.$inferSelect)[];
  expenseRows: (typeof expenses.$inferSelect)[];
  snapshot: typeof allocationPlanSnapshots.$inferSelect;
  allocation: typeof allocationPlanEntries.$inferSelect;
  goal: typeof financialGoals.$inferSelect;
};

function money(amount: string | BigNumber, currency: Currency): Money {
  const value = new BigNumber(amount);
  if (!value.isFinite()) throw new Error('Invalid money amount');
  return { amount: value.toFixed(2, BigNumber.ROUND_HALF_UP), currency };
}

function previousMonth(date: Date) {
  const previous = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1),
  );
  return `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, '0')}`;
}

function totalArs(
  rows: Array<{
    amount: string;
    currency: string;
    recurring: boolean;
    effectiveMonth: string;
    endMonth?: string | null;
  }>,
  month: string,
  expense = false,
): Money {
  const total = rows.reduce((sum, row) => {
    const effective = row.effectiveMonth.slice(0, 7);
    const end = row.endMonth?.slice(0, 7);
    const included = expense
      ? row.recurring
        ? effective <= month && (end === undefined || month < end)
        : effective === month
      : row.recurring && effective <= month;
    return included
      ? sum.plus(
          row.currency === 'USD'
            ? new BigNumber(row.amount).times(PLANNING_ARS_PER_USD)
            : row.amount,
        )
      : sum;
  }, new BigNumber(0));
  return money(total, 'ARS');
}

function getContributionMonth(createdAt: Date | string): string | null {
  try {
    return (createdAt instanceof Date ? createdAt : new Date(createdAt))
      .toISOString()
      .slice(0, 7);
  } catch {
    return null;
  }
}

function parsePositiveContributionAmount(value: string): BigNumber {
  try {
    const amount = new BigNumber(value);
    return amount.isFinite() && amount.isGreaterThan(0)
      ? amount
      : new BigNumber(0);
  } catch {
    return new BigNumber(0);
  }
}

export function deriveShortfalls(input: {
  closedMonth: string;
  plannedMonthlyContribution: string | null;
  goals: Array<{ id: string; strategy: string; currency: Currency }>;
  allocations: Array<{ goalId: string; percentage: string }>;
  savingContributions: Array<{
    amount: string;
    currency: string;
    createdAt: Date | string;
  }>;
  investmentContributions: Array<{
    amount: string;
    currency: string;
    createdAt: Date | string;
  }>;
}): Shortfall[] {
  const commitment =
    input.plannedMonthlyContribution &&
    new BigNumber(input.plannedMonthlyContribution);
  if (
    !commitment ||
    !commitment.isFinite() ||
    !commitment.isGreaterThan(0) ||
    !input.allocations.length
  )
    return [];
  const allocations = new Map(
    input.allocations.flatMap(({ goalId, percentage }) => {
      const value = new BigNumber(percentage.replace(',', '.'));
      return value.isFinite() && value.isGreaterThan(0)
        ? [[goalId, value] as const]
        : [];
    }),
  );
  const categories: Array<{
    kind: ContributionKind;
    currency: Currency;
    strategy: 'save' | 'invest';
  }> = [
    { kind: 'saving', currency: 'ARS', strategy: 'save' },
    { kind: 'saving', currency: 'USD', strategy: 'save' },
    { kind: 'investment', currency: 'ARS', strategy: 'invest' },
    { kind: 'investment', currency: 'USD', strategy: 'invest' },
  ];
  return categories.flatMap(({ kind, currency, strategy }) => {
    const expected = input.goals.reduce((sum, goal) => {
      const percentage =
        goal.strategy === strategy && goal.currency === currency
          ? allocations.get(goal.id)
          : undefined;
      const share = percentage
        ? commitment.times(percentage).dividedBy(100)
        : new BigNumber(0);
      return sum.plus(
        currency === 'USD' ? share.dividedBy(PLANNING_ARS_PER_USD) : share,
      );
    }, new BigNumber(0));
    if (!expected.isGreaterThan(0)) return [];
    const rows =
      kind === 'saving'
        ? input.savingContributions
        : input.investmentContributions;
    const actual = rows.reduce(
      (sum, row) =>
        row.currency === currency &&
        getContributionMonth(row.createdAt) === input.closedMonth
          ? sum.plus(parsePositiveContributionAmount(row.amount))
          : sum,
      new BigNumber(0),
    );
    const amount = expected.minus(actual).toFixed(2, BigNumber.ROUND_HALF_UP);
    return new BigNumber(amount).isGreaterThan(0)
      ? [{ kind, currency, amount: money(amount, currency) }]
      : [];
  });
}

type HomeGoal = Pick<
  ReadyProfile['goal'],
  | 'type'
  | 'name'
  | 'strategy'
  | 'targetAmount'
  | 'currency'
  | 'emergencyFundMonths'
>;

function getHomeTargetAmount(goal: HomeGoal, expenses: Money | undefined) {
  if (goal.type !== 'emergency_fund') {
    return goal.targetAmount
      ? money(goal.targetAmount, goal.currency as Currency)
      : undefined;
  }
  if (goal.targetAmount)
    return money(goal.targetAmount, goal.currency as Currency);
  return expenses
    ? money(
        new BigNumber(expenses.amount)
          .times(goal.emergencyFundMonths ?? 3)
          .dividedBy(PLANNING_ARS_PER_USD),
        'USD',
      )
    : undefined;
}

function getEmergencyFundMonths(goal: HomeGoal) {
  return (
    goal.emergencyFundMonths ?? (goal.type === 'emergency_fund' ? 3 : undefined)
  );
}

function calculateHomeFinancialState(
  profile: ReadyProfile['profile'],
  goal: HomeGoal,
  expenseRows: ReadyProfile['expenseRows'],
  currentMonth: string,
) {
  const expensesKnowledge: 'known' | 'unknown' =
    profile.expensesKnowledge === 'known' ? 'known' : 'unknown';
  const expenses =
    expensesKnowledge === 'known'
      ? totalArs(expenseRows, currentMonth, true)
      : undefined;
  const monthlyCommitment = money(
    profile.plannedMonthlyContribution ?? '0.00',
    profile.baseCurrency as Currency,
  );
  let destinationAmount: Money;
  if (monthlyCommitment.currency === goal.currency) {
    destinationAmount = monthlyCommitment;
  } else {
    if (monthlyCommitment.currency !== 'ARS' || goal.currency !== 'USD') {
      throw new Error('Unsupported planning-rate conversion.');
    }
    destinationAmount = money(
      new BigNumber(monthlyCommitment.amount).dividedBy(PLANNING_ARS_PER_USD),
      'USD',
    );
  }

  return {
    expensesKnowledge,
    expenses,
    targetAmount: getHomeTargetAmount(goal, expenses),
    monthlyCommitment,
    destinationAmount,
  };
}

function buildHomeState(
  ready: ReadyProfile,
  currentMonth: string,
  previousMonthShortfalls: Shortfall[],
): InitialHomeState {
  const { profile, incomeRows, snapshot, allocation, goal } = ready;
  const income = totalArs(
    incomeRows.filter((row) => row.recurring),
    currentMonth,
  );
  const financialState = calculateHomeFinancialState(
    profile,
    goal,
    ready.expenseRows,
    currentMonth,
  );
  const {
    expensesKnowledge,
    expenses,
    targetAmount,
    monthlyCommitment,
    destinationAmount,
  } = financialState;
  const currency = goal.currency as Currency;

  return {
    income,
    expensesKnowledge,
    expenses,
    plan: {
      fundingMethod: goal.strategy as 'save' | 'invest',
      destinationCurrency: currency,
      monthlyCommitment,
      destinationAmount,
      effectiveMonth: snapshot.effectiveMonth.slice(0, 7),
      allocationPercentage: allocation.percentage,
    },
    goal: {
      type: goal.type,
      name: goal.name,
      targetAmount,
      currentAmount: money('0', currency),
      emergencyFundMonths: getEmergencyFundMonths(goal),
    },
    previousMonthShortfalls,
  };
}

@Injectable()
export class ProfileService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  private async getReadyProfile(userId: string) {
    const profile = await this.db.query.financialProfiles.findFirst({
      where: eq(financialProfiles.userId, userId),
    });
    if (!profile) return null;

    const [incomeRows, expenseRows, snapshot] = await Promise.all([
      this.db.query.incomes.findMany({ where: eq(incomes.userId, userId) }),
      this.db.query.expenses.findMany({ where: eq(expenses.userId, userId) }),
      this.db.query.allocationPlanSnapshots.findFirst({
        where: eq(allocationPlanSnapshots.userId, userId),
        orderBy: [desc(allocationPlanSnapshots.effectiveMonth)],
      }),
    ]);
    if (!snapshot) return null;
    const allocation = await this.db.query.allocationPlanEntries.findFirst({
      where: eq(allocationPlanEntries.snapshotId, snapshot.id),
    });
    if (!allocation) return null;
    const goal = await this.db.query.financialGoals.findFirst({
      where: and(
        eq(financialGoals.userId, userId),
        eq(financialGoals.id, allocation.goalId),
      ),
    });
    return goal
      ? { profile, incomeRows, expenseRows, snapshot, allocation, goal }
      : null;
  }

  private async getPreviousMonthShortfalls(
    userId: string,
    now: Date,
  ): Promise<Shortfall[]> {
    const closedMonth = previousMonth(now);
    const snapshots = await this.db.query.allocationPlanSnapshots.findMany({
      where: eq(allocationPlanSnapshots.userId, userId),
      orderBy: [desc(allocationPlanSnapshots.effectiveMonth)],
    });
    const applicable = snapshots.find(
      (row) => row.effectiveMonth.slice(0, 7) <= closedMonth,
    );
    if (!applicable || applicable.plannedMonthlyContribution === null)
      return [];

    const [entries, goals, saving, investing] = await Promise.all([
      this.db.query.allocationPlanEntries.findMany({
        where: eq(allocationPlanEntries.snapshotId, applicable.id),
      }),
      this.db.query.financialGoals.findMany({
        where: eq(financialGoals.userId, userId),
      }),
      this.db.query.savingContributions.findMany({
        where: eq(savingContributions.userId, userId),
      }),
      this.db.query.investmentContributions.findMany({
        where: eq(investmentContributions.userId, userId),
      }),
    ]);
    return deriveShortfalls({
      closedMonth,
      plannedMonthlyContribution: applicable.plannedMonthlyContribution,
      goals: goals.map((row) => ({
        id: row.id,
        strategy: row.strategy,
        currency: row.currency as Currency,
      })),
      allocations: entries.map(({ goalId, percentage }) => ({
        goalId,
        percentage,
      })),
      savingContributions: saving,
      investmentContributions: investing,
    });
  }

  async getProfile(userId: string, now = new Date()): Promise<ProfileResponse> {
    const ready = await this.getReadyProfile(userId);
    if (!ready) return { profile: 'missing' };
    const previousMonthShortfalls = await this.getPreviousMonthShortfalls(
      userId,
      now,
    );
    return {
      profile: 'present',
      home: buildHomeState(
        ready,
        now.toISOString().slice(0, 7),
        previousMonthShortfalls,
      ),
    };
  }
}

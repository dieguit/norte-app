import type { CurrencyCode } from '@repo/finance-utils';
import type {
  ContributionKind,
  ContributionSummary,
  GoalPriority,
  GoalStatus,
  GoalStrategy,
  GoalsWorkspaceSource,
  InvestmentAvailability,
} from '../finances/goals.engine';

const toIso = (date: Date | string): string =>
  date instanceof Date ? date.toISOString() : String(date);

const toNullableIso = (
  date: Date | string | null | undefined,
): string | null | undefined =>
  date == null
    ? date
    : date instanceof Date
      ? date.toISOString()
      : String(date);

export interface GoalsSourceProfileRow {
  userId: string;
  baseCurrency: string;
  expensesKnowledge: string;
  plannedMonthlyContribution?: string | null;
  goalDedicationPercentage?: string | null;
  onboardingCompleted?: boolean | null;
}

export interface GoalsSourceGoalRow {
  id: string;
  userId?: string;
  name: string;
  type: string;
  targetAmount?: string | null;
  currency: string;
  priority: string;
  strategy: string;
  status: string;
  desiredDate?: string | null;
  completedAt?: Date | string | null;
  emergencyFundMonths?: number | null;
  createdAt: Date | string;
}

export interface GoalsSourceSavingsPositionRow {
  id: string;
  goalId: string;
  amount: string;
  currency: string;
  location?: string | null;
}

export interface GoalsSourceInvestmentPositionRow {
  id: string;
  goalId: string;
  currentValue: string;
  currency: string;
  annualReturnRate?: string | null;
  availability?: string | null;
  availableFrom?: string | null;
}

export interface GoalsSourceSnapshotRow {
  id: string;
  userId?: string;
  effectiveMonth: string;
}

export interface GoalsSourceAllocationRow {
  id: string;
  snapshotId: string;
  goalId: string;
  percentage: string;
  createdAt?: Date | string | null;
}

export interface GoalsSourceIncomeRow {
  id: string;
  sourceKind: string;
  sourceId: string | null;
  concept: string | null;
  amount: string;
  currency: string;
  recurring: boolean;
  effectiveMonth: string;
}

export interface GoalsSourceExpenseRow {
  id: string;
  sourceKind: string;
  sourceId: string | null;
  concept: string | null;
  amount: string;
  currency: string;
  recurring: boolean;
  effectiveMonth: string;
  endMonth?: string | null;
}

export interface GoalsSourceContributionRow {
  id: string;
  kind: string;
  userId?: string;
  amount: string;
  currency: string;
  placeId?: string | null;
  placeName?: string | null;
  arsSpent?: string | null;
  effectiveRate?: string | null;
  createdAt: Date | string;
  allocations: Array<{
    goalId: string;
    goalName?: string;
    amount: string;
    percentage: string;
  }>;
}

export interface GoalsSourceCompletionWithdrawalRow {
  id: string;
  goalId: string;
  placeId: string;
  placeName: string;
  amount: string;
  currency: string;
  createdAt: Date | string;
}

export interface GoalsSourceRows {
  profile: GoalsSourceProfileRow | null | undefined;
  goals: GoalsSourceGoalRow[];
  savingsPositions: GoalsSourceSavingsPositionRow[];
  investmentPositions: GoalsSourceInvestmentPositionRow[];
  snapshots: GoalsSourceSnapshotRow[];
  allocations: GoalsSourceAllocationRow[];
  incomes: GoalsSourceIncomeRow[];
  expenses: GoalsSourceExpenseRow[];
  contributions: GoalsSourceContributionRow[];
  completionWithdrawals: GoalsSourceCompletionWithdrawalRow[];
}

export function mapRowsToGoalsWorkspaceSource(
  rows: GoalsSourceRows,
): GoalsWorkspaceSource {
  const contributions: ContributionSummary[] = rows.contributions.map(
    (row) => ({
      id: row.id,
      kind: row.kind as ContributionKind,
      userId: row.userId,
      amount: row.amount,
      currency: row.currency as CurrencyCode,
      ...(row.kind === 'saving'
        ? {
            placeId: row.placeId ?? undefined,
            placeName: row.placeName ?? undefined,
          }
        : {}),
      arsSpent: row.arsSpent,
      effectiveRate: row.effectiveRate,
      createdAt: toIso(row.createdAt),
      allocations: row.allocations.map((a) => ({
        goalId: a.goalId,
        goalName: a.goalName ?? '',
        amount: a.amount,
        percentage: a.percentage,
      })),
    }),
  );
  return {
    profile: rows.profile
      ? {
          userId: rows.profile.userId,
          baseCurrency: rows.profile.baseCurrency as CurrencyCode,
          expensesKnowledge: rows.profile.expensesKnowledge,
          plannedMonthlyContribution:
            rows.profile.plannedMonthlyContribution ?? null,
          goalDedicationPercentage:
            rows.profile.goalDedicationPercentage ?? undefined,
          onboardingCompleted: Boolean(rows.profile.onboardingCompleted),
        }
      : null,
    goals: rows.goals.map((row) => ({
      id: row.id,
      userId: row.userId,
      name: row.name,
      type: row.type,
      targetAmount: row.targetAmount ?? null,
      currency: row.currency as CurrencyCode,
      priority: row.priority as GoalPriority,
      strategy: row.strategy as GoalStrategy,
      status: row.status as GoalStatus,
      desiredDate: row.desiredDate ?? null,
      completedAt: toNullableIso(row.completedAt) ?? null,
      emergencyFundMonths: row.emergencyFundMonths ?? null,
      createdAt: toIso(row.createdAt),
    })),
    savingsPositions: rows.savingsPositions.map((row) => ({
      id: row.id,
      goalId: row.goalId,
      amount: row.amount,
      currency: row.currency as CurrencyCode,
      location: row.location ?? null,
    })),
    investmentPositions: rows.investmentPositions.map((row) => ({
      id: row.id,
      goalId: row.goalId,
      currentValue: row.currentValue,
      currency: row.currency as CurrencyCode,
      annualReturnRate: row.annualReturnRate ?? null,
      availability: (row.availability as InvestmentAvailability) ?? null,
      availableFrom: row.availableFrom ?? null,
    })),
    snapshots: rows.snapshots.map((row) => ({
      id: row.id,
      userId: row.userId,
      effectiveMonth: row.effectiveMonth,
    })),
    allocations: rows.allocations.map((row) => ({
      id: row.id,
      snapshotId: row.snapshotId,
      goalId: row.goalId,
      percentage: row.percentage,
    })),
    incomes: rows.incomes.map((row) => ({
      id: row.id,
      sourceKind: row.sourceKind,
      sourceId: row.sourceId,
      sourceName: row.sourceKind,
      concept: row.concept,
      amount: row.amount,
      currency: row.currency as CurrencyCode,
      recurring: row.recurring,
      effectiveMonth: row.effectiveMonth,
    })),
    expenses: rows.expenses.map((row) => ({
      id: row.id,
      sourceKind: row.sourceKind,
      sourceId: row.sourceId,
      sourceName: row.sourceKind,
      concept: row.concept,
      amount: row.amount,
      currency: row.currency as CurrencyCode,
      recurring: row.recurring,
      effectiveMonth: row.effectiveMonth,
      endMonth: row.endMonth ?? null,
    })),
    contributions,
    savingContributions: contributions,
    completionWithdrawals: rows.completionWithdrawals.map((row) => ({
      id: row.id,
      goalId: row.goalId,
      placeId: row.placeId,
      placeName: row.placeName,
      amount: row.amount,
      currency: row.currency as CurrencyCode,
      createdAt: toIso(row.createdAt),
    })),
  };
}

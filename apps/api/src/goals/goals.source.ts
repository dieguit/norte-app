import type { GoalsWorkspaceSource } from '../finances/goals.engine';

const iso = (date: Date | string | null | undefined) =>
  date == null
    ? date
    : date instanceof Date
      ? date.toISOString()
      : String(date);

export function mapRowsToGoalsWorkspaceSource(rows: {
  profile: any;
  goals: any[];
  savingsPositions: any[];
  investmentPositions: any[];
  snapshots: any[];
  allocations: any[];
  incomes: any[];
  expenses: any[];
  contributions: any[];
  completionWithdrawals: any[];
}): GoalsWorkspaceSource {
  const contributions = rows.contributions.map((row) => ({
    id: row.id,
    kind: row.kind,
    userId: row.userId,
    amount: row.amount,
    currency: row.currency,
    ...(row.kind === 'saving'
      ? { placeId: row.placeId, placeName: row.placeName }
      : {}),
    arsSpent: row.arsSpent,
    effectiveRate: row.effectiveRate,
    createdAt: iso(row.createdAt)!,
    allocations: row.allocations,
  }));
  return {
    profile: {
      userId: rows.profile.userId,
      baseCurrency: rows.profile.baseCurrency,
      expensesKnowledge: rows.profile.expensesKnowledge,
      plannedMonthlyContribution: rows.profile.plannedMonthlyContribution,
      goalDedicationPercentage: rows.profile.goalDedicationPercentage,
      onboardingCompleted: rows.profile.onboardingCompleted,
    },
    goals: rows.goals.map((row) => ({
      ...row,
      createdAt: iso(row.createdAt)!,
      completedAt: iso(row.completedAt),
    })),
    savingsPositions: rows.savingsPositions,
    investmentPositions: rows.investmentPositions,
    snapshots: rows.snapshots.map((row) => ({
      id: row.id,
      userId: row.userId,
      effectiveMonth: row.effectiveMonth,
    })),
    allocations: rows.allocations,
    incomes: rows.incomes.map((row) => ({
      ...row,
      sourceName: row.sourceKind,
    })),
    expenses: rows.expenses.map((row) => ({
      ...row,
      sourceName: row.sourceKind,
    })),
    contributions,
    savingContributions: contributions,
    completionWithdrawals: rows.completionWithdrawals.map((row) => ({
      ...row,
      createdAt: iso(row.createdAt)!,
    })),
  };
}

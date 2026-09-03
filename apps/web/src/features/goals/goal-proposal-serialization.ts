import BigNumber from 'bignumber.js'
import type { GoalsWorkspaceSource } from './goals'

export function serializeGoalRecord(goal: GoalsWorkspaceSource['goals'][number]) {
  return {
    id: goal.id,
    userId: goal.userId ?? null,
    name: goal.name,
    type: goal.type,
    targetAmount: goal.targetAmount ?? null,
    currency: goal.currency,
    priority: goal.priority,
    strategy: goal.strategy,
    status: goal.status,
    desiredDate: goal.desiredDate ?? null,
    completedAt: goal.completedAt ?? null,
    emergencyFundMonths: goal.emergencyFundMonths ?? null,
    createdAt: goal.createdAt,
  }
}

function serializeSnapshot(snapshot: GoalsWorkspaceSource['snapshots'][number]) {
  return { id: snapshot.id, userId: snapshot.userId ?? null, effectiveMonth: snapshot.effectiveMonth }
}

function serializeAllocation(allocation: GoalsWorkspaceSource['allocations'][number]) {
  return {
    id: allocation.id,
    snapshotId: allocation.snapshotId,
    goalId: allocation.goalId,
    percentage: allocation.percentage,
  }
}

export function serializeGoalProfile(
  profile: GoalsWorkspaceSource['profile'],
  includeDedicationPercentage = false,
) {
  if (!profile) return null
  return {
    userId: profile.userId,
    baseCurrency: profile.baseCurrency,
    expensesKnowledge: profile.expensesKnowledge,
    plannedMonthlyContribution: profile.plannedMonthlyContribution ?? null,
    ...(includeDedicationPercentage
      ? { goalDedicationPercentage: profile.goalDedicationPercentage ?? null }
      : {}),
    onboardingCompleted: profile.onboardingCompleted,
  }
}

export function serializeGoalFinancialSources(source: GoalsWorkspaceSource) {
  return {
    incomes: (source.incomes ?? []).map((income) => ({
      id: income.id,
      sourceKind: income.sourceKind,
      sourceId: income.sourceId ?? null,
      sourceName: income.sourceName ?? null,
      concept: income.concept ?? null,
      amount: income.amount,
      currency: income.currency,
      recurring: income.recurring,
      effectiveMonth: income.effectiveMonth,
    })).sort((a, b) => a.id.localeCompare(b.id)),
    expenses: (source.expenses ?? []).map((expense) => ({
      id: expense.id,
      sourceKind: expense.sourceKind,
      sourceId: expense.sourceId ?? null,
      sourceName: expense.sourceName ?? null,
      concept: expense.concept ?? null,
      amount: expense.amount,
      currency: expense.currency,
      recurring: expense.recurring,
      effectiveMonth: expense.effectiveMonth,
      endMonth: expense.endMonth ?? null,
    })).sort((a, b) => a.id.localeCompare(b.id)),
  }
}

function sortById<T extends { id: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.id.localeCompare(b.id))
}

export function serializeGoalCoreCollections(source: GoalsWorkspaceSource) {
  return {
    goals: sortById(source.goals.map(serializeGoalRecord)),
    savingsPositions: sortById((source.savingsPositions ?? []).map((position) => ({
      id: position.id,
      goalId: position.goalId,
      amount: position.amount,
      currency: position.currency,
      location: position.location ?? null,
    }))),
    investmentPositions: sortById((source.investmentPositions ?? []).map((position) => ({
      id: position.id,
      goalId: position.goalId,
      currentValue: position.currentValue,
      currency: position.currency,
      annualReturnRate: position.annualReturnRate ?? null,
      availability: position.availability ?? null,
      availableFrom: position.availableFrom ?? null,
    }))),
  }
}

export function serializeGoalPlanCollections(
  source: GoalsWorkspaceSource,
  pendingSnapshots: GoalsWorkspaceSource['snapshots'] = [],
  pendingAllocations: GoalsWorkspaceSource['allocations'] = [],
) {
  return {
    snapshots: sortById((source.snapshots ?? []).map(serializeSnapshot)),
    allocations: sortById((source.allocations ?? []).map(serializeAllocation)),
    pendingSnapshots: sortById(pendingSnapshots.map(serializeSnapshot)),
    pendingAllocations: sortById(pendingAllocations.map(serializeAllocation)),
  }
}

export function serializeGoalSourceCollections(
  source: GoalsWorkspaceSource,
  pendingSnapshots: GoalsWorkspaceSource['snapshots'] = [],
  pendingAllocations: GoalsWorkspaceSource['allocations'] = [],
) {
  return {
    ...serializeGoalCoreCollections(source),
    ...serializeGoalPlanCollections(source, pendingSnapshots, pendingAllocations),
  }
}

export function serializeAllocationEntries(
  entries: ReadonlyArray<{ goalId: string; percentage: string }>,
) {
  return entries
    .map((entry) => ({
      goalId: entry.goalId,
      percentage: new BigNumber((entry.percentage || '0').replace(',', '.')).toFixed(2),
    }))
    .sort((a, b) => a.goalId.localeCompare(b.goalId))
}

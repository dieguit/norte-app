import BigNumber from 'bignumber.js'
import {
  type CurrencyCode,
  type GoalCreationAllocationEntry,
  type Money,
  recalculateAllocationAmounts,
} from '@repo/finance-utils'
import type { GoalsWorkspaceSource } from '../finances/goals.engine'

export type { GoalCreationAllocationEntry }

type AllocationEntry = { goalId: string; percentage: string }
type Goal = { id: string; name: string }

export function overlayGoalAllocationPercentages(
  entries: GoalCreationAllocationEntry[],
  submittedEntries: ReadonlyArray<AllocationEntry> | undefined,
  strict: boolean,
): GoalCreationAllocationEntry[] {
  if (!submittedEntries || submittedEntries.length === 0) return entries
  const expectedIds = new Set(entries.map((entry) => entry.goalId))
  const submittedIds = new Set(submittedEntries.map((entry) => entry.goalId))
  const matches =
    submittedIds.size === expectedIds.size &&
    submittedEntries.length === expectedIds.size &&
    [...expectedIds].every((id) => submittedIds.has(id))
  if (!matches) {
    if (strict) throw new Error('Allocation draft must contain exactly the active goals')
    return entries
  }
  return entries.map((entry) => {
    const submittedEntry = submittedEntries.find((candidate) => candidate.goalId === entry.goalId)
    if (!submittedEntry) return entry
    return {
      ...entry,
      percentage: new BigNumber((submittedEntry.percentage || '0').replace(',', '.')).toFixed(2),
    }
  })
}

export function addGoalAllocationAmounts(input: {
  entries: GoalCreationAllocationEntry[]
  monthlyContribution?: Money
  currencies: ReadonlyMap<string, CurrencyCode>
}): GoalCreationAllocationEntry[] {
  if (!input.monthlyContribution) return input.entries
  const amounts = recalculateAllocationAmounts({
    monthlyContribution: input.monthlyContribution,
    entries: input.entries.map((entry) => ({
      goalId: entry.goalId,
      percentage: entry.percentage,
      currency: input.currencies.get(entry.goalId) ?? 'ARS',
    })),
  })
  return input.entries.map((entry) => ({
    ...entry,
    allocatedBaseAmount: amounts.get(entry.goalId)?.allocatedBaseAmount,
    allocatedDestinationAmount: amounts.get(entry.goalId)?.allocatedDestinationAmount,
  }))
}

export function buildGoalAllocationEntries(input: {
  sourceAllocs: GoalsWorkspaceSource['allocations']
  activeGoals: Goal[]
  fallbackPercentage?: string
  renamedGoalId?: string
  renamedGoalName?: string
}): GoalCreationAllocationEntry[] {
  const fallbackPercentage = input.fallbackPercentage ?? '0.00'
  const activeGoalById = new Map(input.activeGoals.map((goal) => [goal.id, goal]))
  const allocatedGoalIds = new Set<string>()
  const entries: GoalCreationAllocationEntry[] = []
  for (const allocation of input.sourceAllocs) {
    const goal = activeGoalById.get(allocation.goalId)
    if (!goal) continue
    allocatedGoalIds.add(goal.id)
    entries.push({
      goalId: goal.id,
      goalName: goal.id === input.renamedGoalId ? input.renamedGoalName! : goal.name,
      percentage: new BigNumber(allocation.percentage).toFixed(2),
      pending: false,
    })
  }
  for (const goal of input.activeGoals) {
    if (allocatedGoalIds.has(goal.id)) continue
    entries.push({
      goalId: goal.id,
      goalName: goal.id === input.renamedGoalId ? input.renamedGoalName! : goal.name,
      percentage: fallbackPercentage,
      pending: false,
    })
  }
  return entries
}

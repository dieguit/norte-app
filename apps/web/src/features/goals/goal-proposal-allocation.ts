import BigNumber from 'bignumber.js'
import {
  type CurrencyCode,
  type Money,
  calculateAllocationAmounts,
  createMoney,
} from '../../lib/money'
import { convertCommitmentToDestination } from '../financial/financial'
import type { GoalsWorkspaceSource } from './goals'

export interface GoalCreationAllocationEntry {
  goalId: string
  goalName: string
  percentage: string
  allocatedBaseAmount?: Money
  allocatedDestinationAmount?: Money
  pending: boolean
}

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

export function calculatePercentageSum(entries: Array<{ percentage: string }>): BigNumber {
  return entries.reduce((sum, entry) => {
    try {
      const normalized = (entry.percentage || '0').trim().replace(',', '.')
      const percentage = new BigNumber(normalized)
      return percentage.isFinite() && !percentage.isNaN() ? sum.plus(percentage) : sum.plus(NaN)
    } catch {
      return sum.plus(NaN)
    }
  }, new BigNumber(0))
}

function emptyAllocationAmounts(
  entries: AllocationEntry[],
): Map<string, { allocatedBaseAmount?: Money; allocatedDestinationAmount?: Money }> {
  return new Map(entries.map((entry) => [entry.goalId, {}]))
}

function calculateCompleteAllocationAmounts(input: {
  monthlyContribution: Money
  entries: Array<AllocationEntry & { currency: CurrencyCode }>
}): Map<string, { allocatedBaseAmount?: Money; allocatedDestinationAmount?: Money }> {
  const arithmeticEntries = [...input.entries].sort((a, b) => a.goalId.localeCompare(b.goalId))
  const amounts = calculateAllocationAmounts(
    input.monthlyContribution,
    arithmeticEntries.map((entry) => ({
      id: entry.goalId,
      percentage: (entry.percentage || '0').replace(',', '.'),
    })),
  )
  return new Map(
    input.entries.map((entry) => {
      const allocated = amounts.find((amount) => amount.id === entry.goalId)
      if (!allocated) return [entry.goalId, {}]
      const allocatedDestinationAmount = convertCommitmentToDestination(
        allocated.amount,
        entry.currency,
      )
      return [entry.goalId, { allocatedBaseAmount: allocated.amount, allocatedDestinationAmount }]
    }),
  )
}

function calculatePartialAllocationAmounts(input: {
  monthlyContribution: Money
  entries: Array<AllocationEntry & { currency: CurrencyCode }>
}): Map<string, { allocatedBaseAmount?: Money; allocatedDestinationAmount?: Money }> {
  return new Map(
    input.entries.map((entry) => {
      let percentage: BigNumber | undefined
      try {
        const candidate = new BigNumber((entry.percentage || '0').trim().replace(',', '.'))
        if (candidate.isFinite() && !candidate.isNaN() && candidate.isGreaterThanOrEqualTo(0)) {
          percentage = candidate
        }
      } catch {
        percentage = undefined
      }
      if (!percentage) return [entry.goalId, {}]
      const allocatedBaseAmount = createMoney(
        new BigNumber(input.monthlyContribution.amount).times(percentage).dividedBy(100).toFixed(2),
        input.monthlyContribution.currency,
      )
      return [
        entry.goalId,
        {
          allocatedBaseAmount,
          allocatedDestinationAmount: convertCommitmentToDestination(
            allocatedBaseAmount,
            entry.currency,
          ),
        },
      ]
    }),
  )
}

export function recalculateAllocationAmounts(input: {
  monthlyContribution?: Money
  entries: Array<AllocationEntry & { currency: CurrencyCode }>
}): Map<string, { allocatedBaseAmount?: Money; allocatedDestinationAmount?: Money }> {
  if (!input.monthlyContribution) return emptyAllocationAmounts(input.entries)
  return calculatePercentageSum(input.entries).isEqualTo(100)
    ? calculateCompleteAllocationAmounts({ monthlyContribution: input.monthlyContribution, entries: input.entries })
    : calculatePartialAllocationAmounts({ monthlyContribution: input.monthlyContribution, entries: input.entries })
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

export function buildGoalAllocationDisplayEntries(input: {
  goals: Array<{ id: string; name: string; currency?: CurrencyCode }>
  entries: ReadonlyArray<{ goalId: string; percentage: string }>
  monthlyContribution?: Money
}) {
  const displayEntries = input.goals.map((goal) => ({
    goalId: goal.id,
    goalName: goal.name,
    percentage: input.entries.find((entry) => entry.goalId === goal.id)?.percentage ?? '0.00',
    pending: false,
  }))
  const amounts = recalculateAllocationAmounts({
    monthlyContribution: input.monthlyContribution,
    entries: displayEntries.map((entry) => ({
      goalId: entry.goalId,
      percentage: entry.percentage,
      currency: input.goals.find((goal) => goal.id === entry.goalId)?.currency ?? 'ARS',
    })),
  })
  const entriesWithAmounts = displayEntries.map((entry) => ({
    ...entry,
    allocatedBaseAmount: amounts.get(entry.goalId)?.allocatedBaseAmount,
    allocatedDestinationAmount: amounts.get(entry.goalId)?.allocatedDestinationAmount,
  }))
  return {
    displayEntries: entriesWithAmounts,
    total: calculatePercentageSum(entriesWithAmounts),
  }
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

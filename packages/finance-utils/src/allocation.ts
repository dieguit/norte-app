import BigNumber from 'bignumber.js'
import {
  type CurrencyCode,
  type Money,
  calculateAllocationAmounts,
  createMoney,
} from './money'
import { convertCommitmentToDestination } from './planning'

export interface GoalCreationAllocationEntry {
  goalId: string
  goalName: string
  percentage: string
  allocatedBaseAmount?: Money
  allocatedDestinationAmount?: Money
  pending: boolean
}

type AllocationEntry = { goalId: string; percentage: string }

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

export function allocationEntriesMatch(
  draftEntries: ReadonlyArray<{ goalId: string; percentage: string }>,
  proposalEntries: ReadonlyArray<{ goalId: string; percentage: string }>,
): boolean {
  if (draftEntries.length !== proposalEntries.length) return false
  const draftIds = new Set(draftEntries.map((entry) => entry.goalId))
  const proposalIds = new Set(proposalEntries.map((entry) => entry.goalId))
  if (draftIds.size !== draftEntries.length || proposalIds.size !== proposalEntries.length) return false
  if (![...draftIds].every((goalId) => proposalIds.has(goalId))) return false

  return draftEntries.every((draftEntry) => {
    const proposalEntry = proposalEntries.find((entry) => entry.goalId === draftEntry.goalId)
    if (!proposalEntry) return false

    try {
      const draftPercentage = new BigNumber(
        (draftEntry.percentage || '0').trim().replace(',', '.'),
      )
      const proposalPercentage = new BigNumber(
        (proposalEntry.percentage || '0').trim().replace(',', '.'),
      )
      if (
        !draftPercentage.isFinite() ||
        draftPercentage.isNaN() ||
        !proposalPercentage.isFinite() ||
        proposalPercentage.isNaN()
      ) {
        return false
      }
      return draftPercentage.toFixed(2) === proposalPercentage.toFixed(2)
    } catch {
      return false
    }
  })
}

function parseRebalancePercentage(nextPercentage: string): BigNumber | null {
  const normalizedInput = (nextPercentage ?? '').trim().replace(',', '.')
  if (normalizedInput === '') return null
  try {
    const percentage = new BigNumber(normalizedInput)
    return percentage.isFinite() && !percentage.isNaN() && percentage.isGreaterThanOrEqualTo(0) &&
      percentage.isLessThanOrEqualTo(100)
      ? percentage
      : null
  } catch {
    return null
  }
}

function rebalanceOtherEntries<T extends { goalId: string; percentage: string }>(
  others: T[],
  remaining: BigNumber,
): Map<string, string> {
  const arithmeticEntries = [...others].sort((a, b) => a.goalId.localeCompare(b.goalId))
  const percentageOf = (entry: { percentage: string }) => {
    try {
      const bn = new BigNumber((entry.percentage || '0').replace(',', '.'))
      return bn.isFinite() && !bn.isNaN() && bn.isGreaterThanOrEqualTo(0) ? bn : new BigNumber(0)
    } catch {
      return new BigNumber(0)
    }
  }
  const previousTotal = arithmeticEntries.reduce((sum, e) => sum.plus(percentageOf(e)), new BigNumber(0))
  const shares = previousTotal.isZero()
    ? arithmeticEntries.map(() => new BigNumber(1).dividedBy(arithmeticEntries.length))
    : arithmeticEntries.map((entry) => percentageOf(entry).dividedBy(previousTotal))

  const allocatedOthersMap = new Map<string, string>()
  let accumulatedBn = new BigNumber(0)

  for (let i = 0; i < arithmeticEntries.length; i++) {
    const other = arithmeticEntries[i]
    if (i === arithmeticEntries.length - 1) {
      const lastAmountBn = remaining.minus(accumulatedBn)
      allocatedOthersMap.set(other.goalId, lastAmountBn.toFixed(2))
    } else {
      const amountBn = remaining.times(shares[i])
      const roundedStr = amountBn.toFixed(2)
      accumulatedBn = accumulatedBn.plus(new BigNumber(roundedStr))
      allocatedOthersMap.set(other.goalId, roundedStr)
    }
  }
  return allocatedOthersMap
}

export function rebalanceAllocationEntries<T extends { goalId: string; percentage: string }>(
  entries: T[],
  selectedGoalId: string,
  nextPercentage: string,
): T[] {
  const selected = parseRebalancePercentage(nextPercentage)
  if (selected === null) {
    return entries.map((entry) =>
      entry.goalId === selectedGoalId ? { ...entry, percentage: nextPercentage } : entry,
    )
  }
  const others = entries.filter((entry) => entry.goalId !== selectedGoalId)
  if (others.length === 0) {
    return entries.map((entry) =>
      entry.goalId === selectedGoalId ? { ...entry, percentage: '100.00' } : entry,
    )
  }
  const allocatedOthersMap = rebalanceOtherEntries(others, new BigNumber(100).minus(selected))

  return entries.map((entry) => {
    if (entry.goalId === selectedGoalId) {
      return { ...entry, percentage: selected.toFixed(2) }
    }
    return { ...entry, percentage: allocatedOthersMap.get(entry.goalId)! }
  })
}

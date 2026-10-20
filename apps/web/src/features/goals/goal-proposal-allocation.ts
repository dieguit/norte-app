import BigNumber from 'bignumber.js'
import {
  type CurrencyCode,
  type Money,
  calculateAllocationAmounts,
  createMoney,
} from '../../lib/money'
import { convertCommitmentToDestination } from '../financial/financial'

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

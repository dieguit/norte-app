import BigNumber from 'bignumber.js'
import type { Money } from '../../lib/money'
import type {
  GoalStatus,
  GoalCreationContext,
} from '@repo/shared-types'
import type { GoalCreationDraft } from './goal-creation.schema'
import type { GoalCreationAllocationEntry } from './goal-proposal-allocation'

export type { GoalCreationAllocationEntry } from './goal-proposal-allocation'
export { calculatePercentageSum, recalculateAllocationAmounts } from './goal-proposal-allocation'
export type { GoalCreationContext, GoalCreationPreviewResult } from '@repo/shared-types'

export const PENDING_GOAL_ID = 'pending-goal'

export interface GoalEditContext {
  goalId: string
  status?: GoalStatus
  draft: GoalCreationDraft
  context: GoalCreationContext
}

export interface GoalCreationAllocation {
  monthlyContribution?: Money
  effectiveMonth: string
  entries: GoalCreationAllocationEntry[]
  totalPercentage: string
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

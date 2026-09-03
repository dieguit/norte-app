import BigNumber from 'bignumber.js'
import {
  calculatePercentageSum,
  recalculateAllocationAmounts,
  type GoalCreationAllocation,
  type GoalCreationAllocationEntry,
  type GoalCreationPreviewResult,
} from '../../../../features/goals/goal-creation'
import type { GoalImpactTransition } from './GoalImpact'

export interface GoalImpactDisplay {
  baseEntries: GoalCreationAllocationEntry[]
  allocation: GoalCreationAllocation
  impacts: GoalCreationPreviewResult['proposal']['impacts']
  isAllocationsValid: boolean
  isPreviewOutdated: boolean
  pausedGoalName: string
}

function applyDraftPercentages(
  preview: GoalCreationPreviewResult | null,
  draftAllocations: Array<{ goalId: string; percentage: string }>,
) {
  return (preview?.proposal.allocation.entries ?? []).map((entry) => ({
    ...entry,
    percentage:
      draftAllocations.find((draft) => draft.goalId === entry.goalId)?.percentage ??
      entry.percentage,
  }))
}

function withRecalculatedAmounts(
  preview: GoalCreationPreviewResult | null,
  entries: GoalCreationAllocationEntry[],
) {
  const amountsMap = recalculateAllocationAmounts({
    monthlyContribution: preview?.proposal.allocation.monthlyContribution,
    entries: entries.map((entry) => {
      const original = preview?.proposal.allocation.entries.find(
        (candidate) => candidate.goalId === entry.goalId,
      )
      return {
        goalId: entry.goalId,
        percentage: entry.percentage,
        currency: original?.allocatedDestinationAmount?.currency ?? 'ARS',
      }
    }),
  })

  return entries.map((entry) => ({
    ...entry,
    allocatedBaseAmount: amountsMap.get(entry.goalId)?.allocatedBaseAmount,
    allocatedDestinationAmount: amountsMap.get(entry.goalId)?.allocatedDestinationAmount,
  }))
}

function orderEntries(
  entries: GoalCreationAllocationEntry[],
  transition?: GoalImpactTransition,
) {
  const isPaused = transition?.status === 'paused' || transition?.editable === false
  const displayed = isPaused
    ? entries.filter((entry) => entry.goalId !== transition?.goalId)
    : [...entries]
  if (transition?.goalId && !isPaused) {
    const index = displayed.findIndex((entry) => entry.goalId === transition.goalId)
    if (index > 0) displayed.unshift(...displayed.splice(index, 1))
  }
  return { displayed, isPaused }
}

function isPercentageChanged(current: string, original: string) {
  try {
    const currentValue = new BigNumber((current || '0').trim().replace(',', '.'))
    const originalValue = new BigNumber((original || '0').trim().replace(',', '.'))
    if (
      !currentValue.isFinite() ||
      currentValue.isNaN() ||
      !originalValue.isFinite() ||
      originalValue.isNaN()
    ) {
      return true
    }
    return currentValue.toFixed(2) !== originalValue.toFixed(2)
  } catch {
    return true
  }
}

function hasOutdatedAllocation(
  preview: GoalCreationPreviewResult | null,
  entries: GoalCreationAllocationEntry[],
) {
  return (
    !preview ||
    entries.some((entry) => {
      const original = preview.proposal.allocation.entries.find(
        (candidate) => candidate.goalId === entry.goalId,
      )
      return !original || isPercentageChanged(entry.percentage, original.percentage)
    })
  )
}

function orderImpacts(
  preview: GoalCreationPreviewResult | null,
  transition?: GoalImpactTransition,
) {
  const impacts = [...(preview?.proposal.impacts ?? [])]
  if (transition?.goalId) {
    const index = impacts.findIndex((impact) => impact.goalId === transition.goalId)
    if (index > 0) impacts.unshift(...impacts.splice(index, 1))
  }
  return impacts
}

export function getGoalImpactDisplay(
  preview: GoalCreationPreviewResult | null,
  draftAllocations: Array<{ goalId: string; percentage: string }>,
  transition?: GoalImpactTransition,
): GoalImpactDisplay {
  const baseEntries = applyDraftPercentages(preview, draftAllocations)
  const entries = withRecalculatedAmounts(preview, baseEntries)
  const { displayed, isPaused } = orderEntries(entries, transition)
  const totalPercentage = calculatePercentageSum(displayed)
  const allocation = {
    monthlyContribution: preview?.proposal.allocation.monthlyContribution,
    effectiveMonth: preview?.proposal.allocation.effectiveMonth ?? '',
    entries: displayed,
    totalPercentage: totalPercentage.toFixed(2),
  }
  const pausedImpact = preview?.proposal.impacts.find(
    (impact) => impact.goalId === transition?.goalId,
  )

  return {
    baseEntries,
    allocation,
    impacts: orderImpacts(preview, transition),
    isAllocationsValid: displayed.length === 0 ? isPaused : totalPercentage.isEqualTo(100),
    isPreviewOutdated: hasOutdatedAllocation(preview, displayed),
    pausedGoalName:
      pausedImpact?.goalName ?? preview?.proposal.normalizedGoal?.name ?? 'Objetivo',
  }
}

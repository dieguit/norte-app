import { useMemo } from 'react'
import { useStore } from '@tanstack/react-form'
import BigNumber from 'bignumber.js'
import { Badge } from '../../../../components/ui/badge'
import { PlanAllocationEditor } from '../../../../features/goals/PlanAllocationEditor'
import {
  calculatePercentageSum,
  recalculateAllocationAmounts,
  rebalanceAllocationEntries,
  type GoalCreationAllocation,
  type GoalCreationContext,
  type GoalCreationPreviewResult,
} from '../../../../features/goals/goal-creation'
import { AllocationImpactComparison } from '../../../../features/goals/AllocationImpactComparison'
import type { GoalCreationFormApi } from './useGoalCreationForm'

export const impactLabels = {
  before: 'Antes',
  after: 'Con este cambio',
  pendingGoalBefore: 'Objetivo todavía no creado',
  invalid: 'Completá la distribución para calcular el impacto',
}

export interface GoalImpactTransition {
  goalId: string
  label?: string
  status?: 'active' | 'paused' | 'editing'
  editable?: boolean
}

export interface GoalImpactProps {
  form: GoalCreationFormApi
  context: GoalCreationContext
  preview: GoalCreationPreviewResult | null
  isPreviewPending: boolean
  onPercentageCommit: () => void
  transition?: GoalImpactTransition
}

export function GoalImpact({
  form,
  preview,
  isPreviewPending,
  onPercentageCommit,
  transition,
}: GoalImpactProps) {
  const values = useStore(form.store, (state) => state.values)
  const draftAllocations = values.allocations ?? []

  const isPausedTransition = transition?.status === 'paused' || transition?.editable === false

  const baseEntries = (preview?.proposal.allocation.entries ?? []).map((entry) => {
    const draftEntry = draftAllocations.find((e) => e.goalId === entry.goalId)
    return {
      ...entry,
      percentage: draftEntry ? draftEntry.percentage : entry.percentage,
    }
  })

  const amountsMap = recalculateAllocationAmounts({
    monthlyContribution: preview?.proposal.allocation.monthlyContribution,
    entries: baseEntries.map((entry) => {
      const origEntry = preview?.proposal.allocation.entries.find((e) => e.goalId === entry.goalId)
      const currency = origEntry?.allocatedDestinationAmount?.currency ?? 'ARS'
      return {
        goalId: entry.goalId,
        percentage: entry.percentage,
        currency,
      }
    }),
  })

  const entries = baseEntries.map((entry) => {
    const amounts = amountsMap.get(entry.goalId)
    return {
      ...entry,
      allocatedBaseAmount: amounts?.allocatedBaseAmount,
      allocatedDestinationAmount: amounts?.allocatedDestinationAmount,
    }
  })

  let displayedEntries = isPausedTransition
    ? entries.filter((e) => e.goalId !== transition?.goalId)
    : [...entries]
  if (transition?.goalId && !isPausedTransition) {
    const targetIdx = displayedEntries.findIndex((e) => e.goalId === transition.goalId)
    if (targetIdx > 0) {
      const [targetEntry] = displayedEntries.splice(targetIdx, 1)
      displayedEntries.unshift(targetEntry)
    }
  }

  const totalBn = calculatePercentageSum(displayedEntries)

  const allocationToDisplay: GoalCreationAllocation = {
    monthlyContribution: preview?.proposal.allocation.monthlyContribution,
    effectiveMonth: preview?.proposal.allocation.effectiveMonth ?? '',
    entries: displayedEntries,
    totalPercentage: totalBn.toFixed(2),
  }

  const handlePercentageChange = (goalId: string, percentage: string) => {
    const currentEntries = baseEntries.map((e) => ({
      goalId: e.goalId,
      percentage: e.percentage,
    }))
    const rebalanced = rebalanceAllocationEntries(currentEntries, goalId, percentage)
    form.setFieldValue(
      'allocations',
      rebalanced.map((r) => ({ goalId: r.goalId, percentage: r.percentage })),
    )
  }

  const isAllocationsValid =
    allocationToDisplay.entries.length === 0
      ? Boolean(isPausedTransition)
      : calculatePercentageSum(allocationToDisplay.entries).isEqualTo(100)

  const isPreviewOutdated =
    !preview ||
    allocationToDisplay.entries.some((e) => {
      const propEntry = preview.proposal.allocation.entries.find((pe) => pe.goalId === e.goalId)
      if (!propEntry) return true
      try {
        const eBn = new BigNumber((e.percentage || '0').trim().replace(',', '.'))
        const propBn = new BigNumber((propEntry.percentage || '0').trim().replace(',', '.'))
        if (!eBn.isFinite() || eBn.isNaN() || !propBn.isFinite() || propBn.isNaN()) return true
        return eBn.toFixed(2) !== propBn.toFixed(2)
      } catch {
        return true
      }
    })

  const pausedGoalName =
    preview?.proposal.impacts.find((i) => i.goalId === transition?.goalId)?.goalName ??
    (preview?.proposal as any)?.normalizedGoal?.name ??
    values.name ??
    'Objetivo'

  const impactsToDisplay = useMemo(() => {
    if (!preview?.proposal.impacts) return []
    const impacts = [...preview.proposal.impacts]
    if (transition?.goalId) {
      const targetIdx = impacts.findIndex((i) => i.goalId === transition.goalId)
      if (targetIdx > 0) {
        const [targetImpact] = impacts.splice(targetIdx, 1)
        impacts.unshift(targetImpact)
      }
    }
    return impacts
  }, [preview?.proposal.impacts, transition?.goalId])

  return (
    <div className="flex flex-col gap-6">
      {/* Allocation Editor */}
      <section aria-label="Distribución del Plan" className="flex flex-col gap-3">
        {isPausedTransition && (
          <div
            data-testid="allocation-row"
            className="flex items-center justify-between gap-4 rounded-xl border border-[var(--line)] bg-[var(--foam)]/30 p-4 sm:p-5"
          >
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-sm font-medium text-[var(--sea-ink)]">
                {pausedGoalName}
              </span>
              <span className="text-xs text-[var(--sea-ink-soft)] font-normal">
                Sin asignación de aporte mensual
              </span>
            </div>
            <Badge variant="secondary">
              {transition.label ?? 'Pausado'}
            </Badge>
          </div>
        )}
        <PlanAllocationEditor
          allocation={allocationToDisplay}
          disabled={isPreviewPending}
          onPercentageChange={handlePercentageChange}
          onPercentageCommit={onPercentageCommit}
        />
      </section>

      {/* Trajectories / Impact comparison */}
      <section aria-label="Impacto en objetivos" className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-[var(--sea-ink)]">
            Impacto en las fechas
          </h3>
          {(isPreviewPending || isPreviewOutdated) && (
            <span className="text-xs text-[var(--sea-ink-soft)] animate-pulse">
              {isPreviewPending
                ? 'Actualizando impacto...'
                : 'Proyección pendiente de actualización'}
            </span>
          )}
        </div>

        {!isAllocationsValid && (
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-muted)]/50 p-4 text-center">
            <p className="text-sm text-[var(--sea-ink-soft)] font-medium">
              {impactLabels.invalid}
            </p>
          </div>
        )}

        {impactsToDisplay.length > 0 && (
          <div
            className={`transition-opacity ${
              isPreviewPending ? 'opacity-50' : 'opacity-100'
            }`}
          >
            <AllocationImpactComparison
              impacts={impactsToDisplay}
              beforeNotCreatedLabel={impactLabels.pendingGoalBefore}
            />
          </div>
        )}
      </section>
    </div>
  )
}

import { useStore } from '@tanstack/react-form'
import BigNumber from 'bignumber.js'
import { PlanAllocationEditor } from '../../../../features/goals/PlanAllocationEditor'
import {
  calculatePercentageSum,
  recalculateAllocationAmounts,
  rebalanceAllocationEntries,
  type GoalCreationAllocation,
  type GoalCreationContext,
  type GoalCreationPreviewResult,
} from '../../../../features/goals/goal-creation'
import {
  AllocationImpactComparison,
  formatGoalProjection,
} from './AllocationImpactComparison'
import type { GoalCreationFormApi } from './useGoalCreationForm'

export { formatGoalProjection }

export const impactLabels = {
  before: 'Antes',
  after: 'Con este cambio',
  pendingGoalBefore: 'Objetivo todavía no creado',
  invalid: 'Completá la distribución para calcular el impacto',
}

export interface GoalImpactProps {
  form: GoalCreationFormApi
  context: GoalCreationContext
  preview: GoalCreationPreviewResult | null
  isPreviewPending: boolean
  onPercentageCommit: () => void
}

export function GoalImpact({
  form,
  preview,
  isPreviewPending,
  onPercentageCommit,
}: GoalImpactProps) {
  const values = useStore(form.store, (state) => state.values)
  const draftAllocations = values.allocations ?? []

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

  const totalBn = calculatePercentageSum(entries)

  const allocationToDisplay: GoalCreationAllocation = {
    monthlyContribution: preview?.proposal.allocation.monthlyContribution,
    effectiveMonth: preview?.proposal.allocation.effectiveMonth ?? '',
    entries,
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
    allocationToDisplay.entries.length > 0 &&
    calculatePercentageSum(allocationToDisplay.entries).isEqualTo(100)

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

  return (
    <div className="flex flex-col gap-6">
      {/* Allocation Editor */}
      <section aria-label="Distribución del Plan" className="flex flex-col gap-3">
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

        {!isAllocationsValid ? (
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-muted)]/50 p-4 text-center">
            <p className="text-sm text-[var(--sea-ink-soft)] font-medium">
              {impactLabels.invalid}
            </p>
          </div>
        ) : preview?.proposal.impacts && preview.proposal.impacts.length > 0 ? (
          <div
            className={`transition-opacity ${
              isPreviewPending ? 'opacity-50' : 'opacity-100'
            }`}
          >
            <AllocationImpactComparison
              impacts={preview.proposal.impacts}
              beforeNotCreatedLabel={impactLabels.pendingGoalBefore}
            />
          </div>
        ) : null}
      </section>
    </div>
  )
}

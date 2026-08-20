import { useStore } from '@tanstack/react-form'
import BigNumber from 'bignumber.js'
import { formatCalendarMonth } from '../../../../lib/format'
import { PlanAllocationEditor } from '../../../../features/goals/PlanAllocationEditor'
import type { GoalProjection } from '../../../../features/goals/goals'
import {
  calculatePercentageSum,
  recalculateAllocationAmounts,
  rebalanceAllocationEntries,
  type GoalCreationAllocation,
  type GoalCreationContext,
  type GoalCreationPreviewResult,
} from '../../../../features/goals/goal-creation'
import type { GoalCreationFormApi } from './useGoalCreationForm'

export const impactLabels = {
  before: 'Antes',
  after: 'Con este cambio',
  pendingGoalBefore: 'Objetivo todavía no creado',
  invalid: 'Completá la distribución para calcular el impacto',
}

export function formatGoalProjection(projection: GoalProjection): string {
  switch (projection.status) {
    case 'available':
      return formatCalendarMonth(projection.completionMonth)
    case 'target_unavailable':
      return 'Objetivo por calcular'
    case 'plan_paused':
      return 'Proyección pausada'
    case 'commitment_absent':
      return 'Sin aporte mensual'
    case 'no_future_allocation':
      return 'Sin asignación futura'
    case 'investment_assumption_unavailable':
      return 'Supuesto de inversión no disponible'
    case 'outside_horizon':
      return 'No alcanzado dentro del horizonte'
  }
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
            className={`flex flex-col gap-3 transition-opacity ${
              isPreviewPending ? 'opacity-50' : 'opacity-100'
            }`}
          >
            {preview.proposal.impacts.map((impact) => {
              return (
                <div
                  key={impact.goalId}
                  className="flex flex-col gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--foam)]/20 p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[var(--sea-ink)]">
                      {impact.goalName}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {/* Before */}
                    <div className="flex flex-col gap-0.5 rounded-lg bg-[var(--surface)] p-2.5 border border-[var(--line)]">
                      <span className="text-xs font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wider">
                        {impactLabels.before}
                      </span>
                      <p className="text-sm font-medium text-[var(--sea-ink-soft)]">
                        {impact.before.status === 'not_created'
                          ? impactLabels.pendingGoalBefore
                          : formatGoalProjection(impact.before.projection)}
                      </p>
                    </div>

                    {/* After */}
                    <div className="flex flex-col gap-0.5 rounded-lg bg-[var(--foam)]/60 p-2.5 border border-[var(--line)]">
                      <span className="text-xs font-semibold text-[var(--pine)] uppercase tracking-wider">
                        {impactLabels.after}
                      </span>
                      <p className="text-sm font-semibold text-[var(--sea-ink)]">
                        {formatGoalProjection(impact.after)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}
      </section>
    </div>
  )
}

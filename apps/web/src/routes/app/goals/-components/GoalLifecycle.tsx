import { useEffect, useMemo, useRef, useState } from 'react'
import { usePostHog } from '@posthog/react'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import BigNumber from 'bignumber.js'
import { Badge } from '../../../../components/ui/badge'
import { Button } from '../../../../components/ui/button'
import { PlanAllocationEditor } from '../../../../features/goals/PlanAllocationEditor'
import {
  calculatePercentageSum,
  rebalanceAllocationEntries,
  recalculateAllocationAmounts,
  type GoalCreationAllocation,
  type GoalCreationAllocationEntry,
} from '../../../../features/goals/goal-creation'
import {
  confirmGoalLifecycle,
  previewGoalLifecycle,
} from '../../../../features/goals/goals.functions'
import type {
  GoalLifecycleContext,
  GoalLifecyclePreviewResult,
} from '../../../../features/goals/goal-lifecycle'
import type { GoalLifecycle as GoalLifecycleType } from '../../../../features/goals/goal-lifecycle.schema'
import { AllocationImpactComparison } from '../../../../features/goals/AllocationImpactComparison'

export interface GoalLifecycleProps {
  lifecycle: GoalLifecycleType
  context: GoalLifecycleContext
  onCancel: () => void
  onUpdated: () => void
}

export function GoalLifecycle({
  lifecycle,
  context,
  onCancel,
  onUpdated,
}: GoalLifecycleProps) {
  const router = useRouter()
  const posthog = usePostHog()
  const serverErrorRef = useRef<HTMLDivElement>(null)

  const [entries, setEntries] = useState<
    Array<{ goalId: string; percentage: string }>
  >(() => {
    const allocationSource =
      context.pendingAllocation ?? context.currentAllocation
    const sourceMap = new Map(
      allocationSource?.entries.map((e) => [e.goalId, e.percentage]),
    )

    if (lifecycle === 'pause') {
      if (context.activeGoals.length <= 1) {
        return [{ goalId: context.goalId, percentage: '0.00' }]
      }
      const base = context.activeGoals.map((g) => ({
        goalId: g.id,
        percentage: sourceMap.get(g.id) ?? '0.00',
      }))
      return rebalanceAllocationEntries(base, context.goalId, '0.00')
    } else {
      // Resume
      const defaultTargetPct =
        context.activeGoals.length === 0 ? '100.00' : '0.00'
      const targetEntry = {
        goalId: context.goalId,
        percentage: defaultTargetPct,
      }
      const otherEntries = context.activeGoals.map((g) => ({
        goalId: g.id,
        percentage:
          sourceMap.get(g.id) ??
          (context.activeGoals.length === 1 ? '100.00' : '0.00'),
      }))
      return [targetEntry, ...otherEntries]
    }
  })

  const [preview, setPreview] = useState<GoalLifecyclePreviewResult | null>(null)
  const [isPreviewPending, setIsPreviewPending] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  useEffect(() => {
    if (serverError) {
      serverErrorRef.current?.focus()
    }
  }, [serverError])

  useEffect(() => {
    let active = true
    setIsPreviewPending(true)
    previewGoalLifecycle({
      data: {
        goalId: context.goalId,
        lifecycle,
        allocations: entries,
      },
    })
      .then((res) => {
        if (active) {
          setPreview(res)
        }
      })
      .catch((err) => {
        if (active) {
          setServerError(
            err?.message ?? 'Ocurrió un error al calcular la proyección.',
          )
        }
      })
      .finally(() => {
        if (active) {
          setIsPreviewPending(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const allGoalsList = useMemo(() => {
    if (lifecycle === 'pause') {
      return context.activeGoals
    } else {
      return [
        { id: context.goalId, name: context.goalName, currency: 'ARS' as const },
        ...context.activeGoals,
      ]
    }
  }, [context, lifecycle])

  const editorGoalsList = useMemo(() => {
    if (lifecycle === 'pause') {
      return context.activeGoals.filter((g) => g.id !== context.goalId)
    }
    return allGoalsList
  }, [lifecycle, context, allGoalsList])

  const baseEntries: GoalCreationAllocationEntry[] = useMemo(() => {
    return editorGoalsList.map((goal) => {
      const draftEntry = entries.find((e) => e.goalId === goal.id)
      return {
        goalId: goal.id,
        goalName: goal.name,
        percentage: draftEntry ? draftEntry.percentage : '0.00',
        pending: false,
      }
    })
  }, [editorGoalsList, entries])

  const amountsMap = useMemo(() => {
    return recalculateAllocationAmounts({
      monthlyContribution: context.plannedMonthlyContribution,
      entries: baseEntries.map((entry) => {
        const goal = editorGoalsList.find((g) => g.id === entry.goalId)
        return {
          goalId: entry.goalId,
          percentage: entry.percentage,
          currency: goal?.currency ?? 'ARS',
        }
      }),
    })
  }, [context.plannedMonthlyContribution, editorGoalsList, baseEntries])

  const displayEntries: GoalCreationAllocationEntry[] = useMemo(() => {
    return baseEntries.map((entry) => {
      const amounts = amountsMap.get(entry.goalId)
      return {
        ...entry,
        allocatedBaseAmount: amounts?.allocatedBaseAmount,
        allocatedDestinationAmount: amounts?.allocatedDestinationAmount,
      }
    })
  }, [baseEntries, amountsMap])

  const totalBn = useMemo(
    () => calculatePercentageSum(displayEntries),
    [displayEntries],
  )

  const isAllocationsValid = useMemo(() => {
    if (lifecycle === 'pause') {
      if (context.activeGoals.length <= 1) return true
      return displayEntries.length > 0 && totalBn.isEqualTo(100)
    } else {
      // Resume
      const targetEntry = entries.find((e) => e.goalId === context.goalId)
      const targetPctBn = new BigNumber(
        (targetEntry?.percentage || '0').trim().replace(',', '.'),
      )
      if (
        context.activeGoals.length > 0 &&
        (!targetPctBn.isFinite() ||
          targetPctBn.isNaN() ||
          targetPctBn.isLessThanOrEqualTo(0))
      ) {
        return false
      }
      return displayEntries.length > 0 && totalBn.isEqualTo(100)
    }
  }, [lifecycle, context, displayEntries.length, totalBn, entries])

  const isPreviewSynced = useMemo(() => {
    if (!preview) return false
    if (entries.length === 0) return true
    return entries.every((draftEntry) => {
      const propEntry = preview.proposal.allocation.entries.find(
        (e) => e.goalId === draftEntry.goalId,
      )
      if (!propEntry) return false
      try {
        const dPct = new BigNumber(
          (draftEntry.percentage || '0').trim().replace(',', '.'),
        )
        const pPct = new BigNumber(
          (propEntry.percentage || '0').trim().replace(',', '.'),
        )
        if (!dPct.isFinite() || dPct.isNaN() || !pPct.isFinite() || pPct.isNaN())
          return false
        return dPct.toFixed(2) === pPct.toFixed(2)
      } catch {
        return false
      }
    })
  }, [preview, entries])

  const isPreviewOutdated = !preview || !isPreviewSynced

  const handlePercentageChange = (goalId: string, nextPercentage: string) => {
    if (lifecycle === 'pause') {
      const remainingEntries = entries.filter((e) => e.goalId !== context.goalId)
      const rebalanced = rebalanceAllocationEntries(
        remainingEntries,
        goalId,
        nextPercentage,
      )
      const targetEntry = { goalId: context.goalId, percentage: '0.00' }
      setEntries([targetEntry, ...rebalanced])
    } else {
      const rebalanced = rebalanceAllocationEntries(
        entries,
        goalId,
        nextPercentage,
      )
      setEntries(rebalanced)
    }
  }

  const handlePercentageCommit = async () => {
    const validSum =
      lifecycle === 'pause' && context.activeGoals.length <= 1
        ? true
        : calculatePercentageSum(displayEntries).isEqualTo(100)

    if (!validSum) return

    setIsPreviewPending(true)
    setServerError(null)
    try {
      const previewResult = await previewGoalLifecycle({
        data: {
          goalId: context.goalId,
          lifecycle,
          allocations: entries,
        },
      })
      setPreview(previewResult)
    } catch (err: any) {
      setPreview(null)
      setServerError(
        err?.message ?? 'Ocurrió un error al actualizar el impacto.',
      )
      setTimeout(() => serverErrorRef.current?.focus(), 0)
    } finally {
      setIsPreviewPending(false)
    }
  }

  const handleConfirm = async () => {
    if (!preview || !isPreviewSynced || !isAllocationsValid) return
    setIsSubmitting(true)
    setServerError(null)

    try {
      const result = await confirmGoalLifecycle({
        data: {
          goalId: context.goalId,
          lifecycle,
          allocations: entries,
          previewToken: preview.previewToken,
        },
      })

      if (result.status === 'stale') {
        const refreshedEntries =
          result.preview.proposal.allocation.entries.map((e) => ({
            goalId: e.goalId,
            percentage: e.percentage,
          }))
        setEntries(refreshedEntries)
        setPreview(result.preview)
        setServerError(
          'Tu Plan cambió. Revisá la distribución actualizada antes de confirmar.',
        )
        setTimeout(() => serverErrorRef.current?.focus(), 0)
        return
      }

      posthog?.capture(lifecycle === 'pause' ? 'goal_paused' : 'goal_resumed')
      await router.invalidate()
      toast.success(
        lifecycle === 'pause' ? 'Objetivo pausado.' : 'Objetivo reanudado.',
      )
      onUpdated()
    } catch (err: any) {
      setServerError(err?.message ?? 'Ocurrió un error al guardar.')
      setTimeout(() => serverErrorRef.current?.focus(), 0)
    } finally {
      setIsSubmitting(false)
    }
  }

  const allocationToDisplay: GoalCreationAllocation = {
    monthlyContribution: context.plannedMonthlyContribution,
    effectiveMonth: preview?.proposal.allocation.effectiveMonth ?? '',
    entries: displayEntries,
    totalPercentage: totalBn.toFixed(2),
  }

  const copy =
    lifecycle === 'pause'
      ? {
          title: 'Pausar objetivo',
          description: 'Redistribuí tu Plan y revisá el impacto antes de pausar.',
          confirm: 'Pausar objetivo',
          submitting: 'Pausando...',
        }
      : {
          title: 'Reanudar objetivo',
          description: 'Definí su lugar en tu Plan y revisá el impacto antes de reanudar.',
          confirm: 'Reanudar objetivo',
          submitting: 'Reanudando...',
        }

  const pausedGoalName = context.goalName || 'Objetivo'

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Scrollable Stage Body */}
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
        {/* Step progress heading */}
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
          <h3 className="text-base font-semibold text-[var(--sea-ink)]">
            Distribución e impacto
          </h3>
        </div>

        {/* Server error summary */}
        {serverError && (
          <div
            ref={serverErrorRef}
            tabIndex={-1}
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive outline-none focus:ring-2 focus:ring-destructive"
          >
            {serverError}
          </div>
        )}

        {/* Allocation Editor */}
        <section
          aria-label="Distribución del Plan"
          className="flex flex-col gap-3"
        >
          {lifecycle === 'pause' && (
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
              <Badge variant="secondary">Pausado</Badge>
            </div>
          )}

          {editorGoalsList.length > 0 && (
            <PlanAllocationEditor
              allocation={allocationToDisplay}
              disabled={isPreviewPending || isSubmitting}
              onPercentageChange={handlePercentageChange}
              onPercentageCommit={handlePercentageCommit}
            />
          )}
        </section>

        {/* Trajectories / Impact comparison */}
        <section
          aria-label="Impacto en objetivos"
          className="flex flex-col gap-4"
        >
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
                Completá la distribución para calcular el impacto
              </p>
            </div>
          ) : preview?.proposal.impacts &&
            preview.proposal.impacts.length > 0 ? (
            <div
              className={`transition-opacity ${
                isPreviewPending ? 'opacity-50' : 'opacity-100'
              }`}
            >
              <AllocationImpactComparison impacts={preview.proposal.impacts} />
            </div>
          ) : null}
        </section>
      </div>

      {/* Sticky Actions Footer */}
      <div className="sticky bottom-0 border-t border-[var(--line)] bg-popover px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          disabled={
            !isAllocationsValid ||
            isPreviewPending ||
            isSubmitting ||
            !preview ||
            !isPreviewSynced
          }
          onClick={handleConfirm}
        >
          {isSubmitting ? copy.submitting : copy.confirm}
        </Button>
      </div>
    </div>
  )
}

import { useMemo } from 'react'
import { usePostHog } from '@posthog/react'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import BigNumber from 'bignumber.js'
import { Badge } from '../../../../components/ui/badge'
import { PlanAllocationEditor } from '../../../../features/goals/PlanAllocationEditor'
import {
  calculatePercentageSum,
  allocationEntriesMatch,
  rebalanceAllocationEntries,
  type GoalCreationAllocation,
  type GoalCreationAllocationEntry,
} from '../../../../features/goals/goal-creation'
import { buildGoalAllocationDisplayEntries } from '../../../../features/goals/goal-proposal-allocation'
import {
  confirmGoalLifecycle,
  previewGoalLifecycle,
} from '../../../../features/goals/goals.functions'
import type {
  GoalLifecycleContext,
  GoalLifecyclePreviewResult,
} from '../../../../features/goals/goal-lifecycle'
import type { GoalLifecycle as GoalLifecycleType } from '../../../../features/goals/goal-lifecycle.schema'
import { goalErrorMessage, reportGoalError, reportGoalPreviewError } from './goal-error'
import {
  GoalAllocationBody,
  GoalAllocationFooter,
  GoalAllocationImpactSection,
  applyStaleGoalAllocationPreview,
  type GoalAllocationState,
  useGoalAllocationState,
} from './GoalAllocationPrimitives'

export interface GoalLifecycleProps {
  lifecycle: GoalLifecycleType
  context: GoalLifecycleContext
  onCancel: () => void
  onUpdated: () => void
}

function lifecycleInitialEntries(
  lifecycle: GoalLifecycleType,
  context: GoalLifecycleContext,
) {
  const source = context.pendingAllocation ?? context.currentAllocation
  const sourceMap = new Map(source?.entries.map((entry) => [entry.goalId, entry.percentage]))
  if (lifecycle === 'pause') {
    if (context.activeGoals.length <= 1) return [{ goalId: context.goalId, percentage: '0.00' }]
    const base = context.activeGoals.map((goal) => ({
      goalId: goal.id,
      percentage: sourceMap.get(goal.id) ?? '0.00',
    }))
    return rebalanceAllocationEntries(base, context.goalId, '0.00')
  }
  const target = {
    goalId: context.goalId,
    percentage: context.activeGoals.length === 0 ? '100.00' : '0.00',
  }
  const others = context.activeGoals.map((goal) => ({
    goalId: goal.id,
    percentage: sourceMap.get(goal.id) ?? (context.activeGoals.length === 1 ? '100.00' : '0.00'),
  }))
  return [target, ...others]
}

type GoalLifecycleEntry = { goalId: string; percentage: string }
type GoalLifecycleState = GoalAllocationState<GoalLifecycleEntry, GoalLifecyclePreviewResult>

function useGoalLifecycleState(
  lifecycle: GoalLifecycleType,
  context: GoalLifecycleContext,
) : GoalLifecycleState {
  const initialEntries = lifecycleInitialEntries(lifecycle, context)
  return useGoalAllocationState({
    initialEntries,
    loadPreview: () => previewGoalLifecycle({ data: { goalId: context.goalId, lifecycle, allocations: initialEntries } }),
    getErrorMessage: (error) => goalErrorMessage(error, 'Ocurrió un error al calcular la proyección.'),
  })
}

function useGoalLifecycleDisplay(
  lifecycle: GoalLifecycleType,
  context: GoalLifecycleContext,
  state: GoalLifecycleState,
) {
  const goals = useGoalLifecycleGoals(lifecycle, context)
  const allocation = useGoalLifecycleAllocationDisplay(context, goals.editorGoals, state)
  const isAllocationsValid = lifecycleAllocationsValid(lifecycle, context, state.entries, allocation.displayEntries, allocation.total)
  const isPreviewSynced = state.preview !== null && allocationEntriesMatch(state.entries, state.preview.proposal.allocation.entries)

  return {
    ...goals,
    ...allocation,
    isAllocationsValid,
    isPreviewSynced,
    allocation: {
      monthlyContribution: context.plannedMonthlyContribution,
      effectiveMonth: state.preview?.proposal.allocation.effectiveMonth ?? '',
      entries: allocation.displayEntries,
      totalPercentage: allocation.total.toFixed(2),
    } satisfies GoalCreationAllocation,
  }
}

function useGoalLifecycleGoals(lifecycle: GoalLifecycleType, context: GoalLifecycleContext) {
  const allGoals = useMemo(
    () => lifecycle === 'pause'
      ? context.activeGoals
      : [{ id: context.goalId, name: context.goalName, currency: context.goalCurrency }, ...context.activeGoals],
    [context, lifecycle],
  )
  const editorGoals = useMemo(
    () => lifecycle === 'pause'
      ? context.activeGoals.filter((goal) => goal.id !== context.goalId)
      : allGoals,
    [allGoals, context, lifecycle],
  )
  return { editorGoals }
}

function useGoalLifecycleAllocationDisplay(
  context: GoalLifecycleContext,
  editorGoals: GoalLifecycleContext['activeGoals'],
  state: GoalLifecycleState,
) {
  return useMemo(
    () => buildGoalAllocationDisplayEntries({
      goals: editorGoals,
      entries: state.entries,
      monthlyContribution: context.plannedMonthlyContribution,
    }),
    [context.plannedMonthlyContribution, editorGoals, state.entries],
  )
}

function lifecycleAllocationsValid(
  lifecycle: GoalLifecycleType,
  context: GoalLifecycleContext,
  entries: GoalLifecycleState['entries'],
  displayEntries: GoalCreationAllocationEntry[],
  total: BigNumber,
) {
  if (lifecycle === 'pause' && context.activeGoals.length <= 1) return true
  if (lifecycle === 'resume' && !resumeTargetIsValid(context, entries)) return false
  return displayEntries.length > 0 && total.isEqualTo(100)
}

function resumeTargetIsValid(
  context: GoalLifecycleContext,
  entries: GoalLifecycleState['entries'],
) {
  if (context.activeGoals.length === 0) return true
  const target = entries.find((entry) => entry.goalId === context.goalId)
  const percentage = new BigNumber((target?.percentage ?? '0').trim().replace(',', '.'))
  return percentage.isFinite() && !percentage.isNaN() && percentage.isGreaterThan(0)
}

function useGoalLifecyclePercentageChange(
  lifecycle: GoalLifecycleType,
  context: GoalLifecycleContext,
  state: GoalLifecycleState,
) {
  return (goalId: string, nextPercentage: string) => {
    const source = lifecycle === 'pause'
      ? state.entries.filter((entry) => entry.goalId !== context.goalId)
      : state.entries
    const rebalanced = rebalanceAllocationEntries(source, goalId, nextPercentage)
    state.setEntries(lifecycle === 'pause'
      ? [{ goalId: context.goalId, percentage: '0.00' }, ...rebalanced]
      : rebalanced)
  }
}

function useGoalLifecyclePreviewAction(
  lifecycle: GoalLifecycleType,
  context: GoalLifecycleContext,
  state: GoalLifecycleState,
  display: ReturnType<typeof useGoalLifecycleDisplay>,
) {
  return async () => {
    const validSum = lifecycle === 'pause' && context.activeGoals.length <= 1
      ? true
      : calculatePercentageSum(display.displayEntries).isEqualTo(100)
    if (!validSum) return
    state.setIsPreviewPending(true)
    state.setServerError(null)
    try {
      state.setPreview(await previewGoalLifecycle({
        data: { goalId: context.goalId, lifecycle, allocations: state.entries },
      }))
    } catch (error) {
      reportGoalPreviewError(error, 'Ocurrió un error al actualizar el impacto.', state.setPreview, state.setServerError, state.serverErrorRef)
    } finally {
      state.setIsPreviewPending(false)
    }
  }
}

function useGoalLifecycleConfirmAction(
  lifecycle: GoalLifecycleType,
  context: GoalLifecycleContext,
  state: GoalLifecycleState,
  display: ReturnType<typeof useGoalLifecycleDisplay>,
  onUpdated: () => void,
) {
  const router = useRouter()
  const posthog = usePostHog()
  return async () => {
    if (!state.preview || !display.isPreviewSynced || !display.isAllocationsValid) return
    state.setIsSubmitting(true)
    state.setServerError(null)
    try {
      const result = await confirmGoalLifecycle({
        data: {
          goalId: context.goalId,
          lifecycle,
          allocations: state.entries,
          previewToken: state.preview.previewToken,
        },
      })
      if (result.status === 'stale') {
        applyStaleGoalAllocationPreview(state, result.preview)
        return
      }
      posthog?.capture(lifecycle === 'pause' ? 'goal_paused' : 'goal_resumed')
      await router.invalidate()
      toast.success(lifecycle === 'pause' ? 'Objetivo pausado.' : 'Objetivo reanudado.')
      onUpdated()
    } catch (error) {
      reportGoalError(error, 'Ocurrió un error al guardar.', state.setServerError, state.serverErrorRef)
    } finally {
      state.setIsSubmitting(false)
    }
  }
}

function GoalLifecycleAllocationSection({
  lifecycle,
  context,
  display,
  state,
  onPercentageChange,
  onPercentageCommit,
}: {
  lifecycle: GoalLifecycleType
  context: GoalLifecycleContext
  display: ReturnType<typeof useGoalLifecycleDisplay>
  state: GoalLifecycleState
  onPercentageChange: (goalId: string, percentage: string) => void
  onPercentageCommit: () => void
}) {
  return (
    <section aria-label="Distribución del Plan" className="flex flex-col gap-3">
      {lifecycle === 'pause' && (
        <div data-testid="allocation-row" className="flex items-center justify-between gap-4 rounded-xl border border-[var(--line)] bg-[var(--foam)]/30 p-4 sm:p-5">
          <div className="flex flex-col items-start gap-0.5">
            <span className="text-sm font-medium text-[var(--sea-ink)]">{context.goalName || 'Objetivo'}</span>
            <span className="text-xs text-[var(--sea-ink-soft)] font-normal">Sin asignación de aporte mensual</span>
          </div>
          <Badge variant="secondary">Pausado</Badge>
        </div>
      )}
      {display.editorGoals.length > 0 && (
        <PlanAllocationEditor
          allocation={display.allocation}
          disabled={state.isPreviewPending || state.isSubmitting}
          onPercentageChange={onPercentageChange}
          onPercentageCommit={onPercentageCommit}
        />
      )}
    </section>
  )
}

function GoalLifecycleBody({
  lifecycle,
  context,
  state,
  display,
  onPercentageChange,
  onPercentageCommit,
}: {
  lifecycle: GoalLifecycleType
  context: GoalLifecycleContext
  state: GoalLifecycleState
  display: ReturnType<typeof useGoalLifecycleDisplay>
  onPercentageChange: (goalId: string, percentage: string) => void
  onPercentageCommit: () => void
}) {
  return (
    <GoalAllocationBody serverError={state.serverError} serverErrorRef={state.serverErrorRef}>
      <GoalLifecycleAllocationSection
        lifecycle={lifecycle}
        context={context}
        display={display}
        state={state}
        onPercentageChange={onPercentageChange}
        onPercentageCommit={onPercentageCommit}
      />
      <GoalAllocationImpactSection
        isPreviewPending={state.isPreviewPending}
        isPreviewSynced={display.isPreviewSynced}
        isAllocationsValid={display.isAllocationsValid}
        impacts={state.preview?.proposal.impacts ?? []}
        showImpacts={display.isAllocationsValid && Boolean(state.preview?.proposal.impacts.length)}
      />
    </GoalAllocationBody>
  )
}

export function GoalLifecycle({ lifecycle, context, onCancel, onUpdated }: GoalLifecycleProps) {
  const state = useGoalLifecycleState(lifecycle, context)
  const display = useGoalLifecycleDisplay(lifecycle, context, state)
  const onPercentageChange = useGoalLifecyclePercentageChange(lifecycle, context, state)
  const onPercentageCommit = useGoalLifecyclePreviewAction(lifecycle, context, state, display)
  const onConfirm = useGoalLifecycleConfirmAction(lifecycle, context, state, display, onUpdated)

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <GoalLifecycleBody
        lifecycle={lifecycle}
        context={context}
        state={state}
        display={display}
        onPercentageChange={onPercentageChange}
        onPercentageCommit={onPercentageCommit}
      />
      <GoalAllocationFooter
        isSubmitting={state.isSubmitting}
        disabled={!display.isAllocationsValid || state.isPreviewPending || state.isSubmitting || !state.preview || !display.isPreviewSynced}
        onCancel={onCancel}
        onConfirm={onConfirm}
        confirmLabel={lifecycle === 'pause' ? 'Pausar objetivo' : 'Reanudar objetivo'}
        savingLabel={lifecycle === 'pause' ? 'Pausando...' : 'Reanudando...'}
      />
    </div>
  )
}

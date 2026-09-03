import { useCallback } from 'react'
import { SheetLoadingState, useSheetLoader } from '../../../../components/SheetLoadingState'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../../../../components/ui/sheet'
import { getGoalLifecycleContext } from '../../../../features/goals/goals.functions'
import type { GoalLifecycleContext } from '../../../../features/goals/goal-lifecycle'
import type { GoalLifecycle as GoalLifecycleType } from '../../../../features/goals/goal-lifecycle.schema'
import { GoalLifecycle } from './GoalLifecycle'

export interface GoalLifecycleSheetProps {
  open: boolean
  goalId: string | null
  lifecycle: GoalLifecycleType | null
  onOpenChange: (open: boolean) => void
}

function GoalLifecycleSheetBody({
  lifecycle,
  context,
  loading,
  error,
  onOpenChange,
}: {
  lifecycle: GoalLifecycleType | null
  context: GoalLifecycleContext | null
  loading: boolean
  error: string | null
  onOpenChange: (open: boolean) => void
}) {
  const copy =
    lifecycle === 'pause'
      ? {
          title: 'Pausar objetivo',
          description: 'Redistribuí tu Plan y revisá el impacto antes de pausar.',
        }
      : {
          title: 'Reanudar objetivo',
          description: 'Definí su lugar en tu Plan y revisá el impacto antes de reanudar.',
        }

  return (
    <SheetContent
      side="right"
      className="flex flex-col gap-0 p-0 data-[side=right]:w-full data-[side=right]:max-w-none data-[side=right]:sm:w-[450px] data-[side=right]:sm:max-w-[450px]"
    >
      <SheetHeader className="border-b border-[var(--line)] px-6 py-5">
        <SheetTitle className="font-serif text-2xl font-bold text-[var(--sea-ink)]">
          {copy.title}
        </SheetTitle>
        <SheetDescription className="text-sm text-[var(--sea-ink-soft)]">
          {copy.description}
        </SheetDescription>
      </SheetHeader>

      {loading ? (
        <SheetLoadingState />
      ) : error ? (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <p role="alert" className="text-sm text-destructive">{error}</p>
        </div>
      ) : context && lifecycle ? (
        <GoalLifecycle
          lifecycle={lifecycle}
          context={context}
          onCancel={() => onOpenChange(false)}
          onUpdated={() => onOpenChange(false)}
        />
      ) : null}
    </SheetContent>
  )
}

export function GoalLifecycleSheet({
  open,
  goalId,
  lifecycle,
  onOpenChange,
}: GoalLifecycleSheetProps) {
  const load = useCallback(async () => {
    if (!goalId || !lifecycle) throw new Error('No pudimos cargar los datos.')
    const result = await getGoalLifecycleContext({ data: { goalId, lifecycle } })
    if (result.profile === 'missing') {
      throw new Error('Completá tu perfil financiero antes de pausar o reanudar un objetivo.')
    }
    return {
      goalId: result.goalId,
      lifecycle: result.lifecycle,
      goalName: result.goalName,
      goalCurrency: result.goalCurrency,
      currentMonth: result.currentMonth,
      plannedMonthlyContribution: result.plannedMonthlyContribution,
      activeGoals: result.activeGoals,
      currentAllocation: result.currentAllocation,
      pendingAllocation: result.pendingAllocation,
    }
  }, [goalId, lifecycle])
  const { data: context, loading, error } = useSheetLoader({ open: open && Boolean(goalId && lifecycle), load })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <GoalLifecycleSheetBody lifecycle={lifecycle} context={context} loading={loading} error={error} onOpenChange={onOpenChange} />
    </Sheet>
  )
}

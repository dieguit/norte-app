import { useEffect, useState } from 'react'
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

export function GoalLifecycleSheet({
  open,
  goalId,
  lifecycle,
  onOpenChange,
}: GoalLifecycleSheetProps) {
  const [context, setContext] = useState<GoalLifecycleContext | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setContext(null)
    setError(null)

    if (!open || !goalId || !lifecycle) return
    let active = true
    setLoading(true)

    getGoalLifecycleContext({ data: { goalId, lifecycle } })
      .then((res) => {
        if (!active) return
        if (res.profile === 'missing') {
          setError('Completá tu perfil financiero antes de pausar o reanudar un objetivo.')
        } else {
          setContext({
            goalId: res.goalId,
            lifecycle: res.lifecycle,
            goalName: res.goalName,
            currentMonth: res.currentMonth,
            plannedMonthlyContribution: res.plannedMonthlyContribution,
            activeGoals: res.activeGoals,
            currentAllocation: res.currentAllocation,
            pendingAllocation: res.pendingAllocation,
          })
        }
      })
      .catch((err) => {
        if (!active) return
        setError(err?.message ?? 'No pudimos cargar los datos.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [open, goalId, lifecycle])

  const copy =
    lifecycle === 'pause'
      ? {
          title: 'Pausar objetivo',
          description: 'Redistribuí tu Plan y revisá el impacto antes de pausar.',
          confirm: 'Pausar objetivo',
        }
      : {
          title: 'Reanudar objetivo',
          description: 'Definí su lugar en tu Plan y revisá el impacto antes de reanudar.',
          confirm: 'Reanudar objetivo',
        }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
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
          <div className="flex flex-1 flex-col gap-4 p-6" role="status">
            <div className="h-6 w-32 animate-pulse rounded bg-[var(--surface-strong)]" />
            <div className="h-10 w-full animate-pulse rounded-lg bg-[var(--surface-strong)]" />
            <div className="h-10 w-full animate-pulse rounded-lg bg-[var(--surface-strong)]" />
            <div className="h-24 w-full animate-pulse rounded-xl bg-[var(--surface-strong)]" />
            <p className="sr-only">Cargando...</p>
          </div>
        ) : error ? (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <p className="text-sm text-destructive">{error}</p>
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
    </Sheet>
  )
}

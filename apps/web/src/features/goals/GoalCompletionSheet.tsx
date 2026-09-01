import { useEffect, useRef, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../../components/ui/sheet'
import { getGoalCompletionContext } from './goals.functions'
import type { GoalCompletionContext } from './goal-completion'
import { GoalCompletion } from './GoalCompletion'

export interface GoalCompletionSheetProps {
  open: boolean
  goalId: string | null
  onOpenChange: (open: boolean) => void
}

export function GoalCompletionSheet({ open, goalId, onOpenChange }: GoalCompletionSheetProps) {
  const [context, setContext] = useState<GoalCompletionContext | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestGeneration = useRef(0)

  async function loadContext(generation: number, requestedGoalId: string) {
    setLoading(true)
    setError(null)
    const isCurrent = () =>
      generation === requestGeneration.current && open && goalId === requestedGoalId
    try {
      const result = await getGoalCompletionContext({ data: { goalId: requestedGoalId } })
      if (!isCurrent()) return
      if (result.profile === 'missing') {
        setContext(null)
        setError('Completá tu perfil financiero antes de completar un objetivo.')
      } else {
        setContext(result.context)
      }
    } catch (requestError: any) {
      if (isCurrent()) {
        setContext(null)
        setError(requestError?.message ?? 'No pudimos cargar el objetivo.')
      }
    } finally {
      if (isCurrent()) setLoading(false)
    }
  }

  useEffect(() => {
    const generation = ++requestGeneration.current
    if (!open || !goalId) {
      setContext(null)
      setError(null)
      setLoading(false)
      return
    }

    if (context && context.goalId !== goalId) setContext(null)
    void loadContext(generation, goalId)

    return () => {
      requestGeneration.current += 1
    }
  }, [open, goalId])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 p-0 data-[side=right]:w-full data-[side=right]:max-w-none data-[side=right]:sm:w-[450px] data-[side=right]:sm:max-w-[450px]"
      >
        <SheetHeader className="border-b border-[var(--line)] px-6 py-5">
          <SheetTitle className="font-serif text-2xl font-bold text-[var(--sea-ink)]">
            Completar objetivo
          </SheetTitle>
          <SheetDescription className="text-sm text-[var(--sea-ink-soft)]">
            Usá los ahorros acumulados para completarlo y revisá cómo cambian las deducciones de tu Plan.
          </SheetDescription>
        </SheetHeader>

        {context ? (
          <GoalCompletion
            context={context}
            onCancel={() => onOpenChange(false)}
            onUpdated={() => onOpenChange(false)}
            onContextInvalid={async () => {
              const generation = ++requestGeneration.current
              await loadContext(generation, goalId!)
            }}
          />
        ) : loading ? (
          <div className="flex flex-1 flex-col gap-4 p-6" role="status">
            <div className="h-6 w-40 animate-pulse rounded bg-[var(--surface-strong)]" />
            <div className="h-12 w-full animate-pulse rounded-xl bg-[var(--surface-strong)]" />
            <div className="h-12 w-full animate-pulse rounded-xl bg-[var(--surface-strong)]" />
            <div className="h-28 w-full animate-pulse rounded-xl bg-[var(--surface-strong)]" />
            <p className="sr-only">Cargando...</p>
          </div>
        ) : error ? (
          <div className="flex flex-1 items-center justify-center p-6 text-center">
            <p role="alert" className="text-sm text-destructive">{error}</p>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

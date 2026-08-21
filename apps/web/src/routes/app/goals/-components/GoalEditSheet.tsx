import { useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../../../../components/ui/sheet'
import { getGoalEditContext } from '../../../../features/goals/goals.functions'
import type { GoalCreationDraft } from '../../../../features/goals/goal-creation.schema'
import type { GoalCreationContext } from '../../../../features/goals/goal-creation'
import type { GoalStatus } from '../../../../features/goals/goals'
import { GoalCreation } from './GoalCreation'

export interface GoalEditSheetProps {
  open: boolean
  goalId: string | null
  onOpenChange: (open: boolean) => void
}

interface GoalEditContextData {
  goalId: string
  status?: GoalStatus
  draft: GoalCreationDraft
  context: GoalCreationContext
}

export function GoalEditSheet({ open, goalId, onOpenChange }: GoalEditSheetProps) {
  const [context, setContext] = useState<GoalEditContextData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setContext(null)
    setError(null)

    if (!open || !goalId) return
    let active = true
    setLoading(true)

    getGoalEditContext({ data: { goalId } })
      .then((res) => {
        if (!active) return
        if (res.profile === 'missing') {
          setError('Completá tu perfil financiero antes de editar un objetivo.')
        } else {
          setContext({
            goalId: res.goalId,
            status: res.status,
            draft: res.draft,
            context: res.context,
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
  }, [open, goalId])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 p-0 data-[side=right]:w-full data-[side=right]:max-w-none data-[side=right]:sm:w-[450px] data-[side=right]:sm:max-w-[450px]"
      >
        <SheetHeader className="border-b border-[var(--line)] px-6 py-5">
          <SheetTitle className="font-serif text-2xl font-bold text-[var(--sea-ink)]">
            Editar objetivo
          </SheetTitle>
          <SheetDescription className="text-sm text-[var(--sea-ink-soft)]">
            Actualizá el objetivo, su Plan y revisá el impacto antes de confirmar.
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
        ) : context ? (
          <GoalCreation
            context={context.context}
            edit={{ goalId: context.goalId, status: context.status, initialDraft: context.draft }}
            onCancel={() => onOpenChange(false)}
            onCreated={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

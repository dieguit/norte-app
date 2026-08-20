import { useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../../../../components/ui/sheet'
import { getGoalCreationContext } from '../../../../features/goals/goals.functions'
import type { GoalCreationContext } from '../../../../features/goals/goal-creation'
import { GoalCreation } from './GoalCreation'

export interface GoalCreationSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GoalCreationSheet({ open, onOpenChange }: GoalCreationSheetProps) {
  const [context, setContext] = useState<GoalCreationContext | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let active = true
    setLoading(true)
    setError(null)

    getGoalCreationContext()
      .then((res) => {
        if (!active) return
        if (res.profile === 'missing') {
          setError('Completá tu perfil financiero antes de crear un objetivo.')
        } else {
          setContext(res.context)
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
  }, [open])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 p-0 data-[side=right]:w-full data-[side=right]:max-w-none data-[side=right]:sm:w-[450px] data-[side=right]:sm:max-w-[450px]"
      >
        <SheetHeader className="border-b border-[var(--line)] px-6 py-5">
          <SheetTitle className="font-serif text-2xl font-bold text-[var(--sea-ink)]">
            Nuevo objetivo
          </SheetTitle>
          <SheetDescription className="text-sm text-[var(--sea-ink-soft)]">
            Definí el objetivo, su Plan y revisá el impacto antes de confirmar.
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
            context={context}
            onCancel={() => onOpenChange(false)}
            onCreated={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

import { useCallback, useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../../../components/ui/sheet'
import { Button } from '../../../components/ui/button'
import { getSavingContributionContext } from '../../../features/contributions/saving-contribution.functions'
import type {
  ContributionKind,
  SavingContributionContext,
} from '../../../features/contributions/saving-contribution'
import { SavingContribution } from './SavingContribution'

export interface SavingContributionSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind?: ContributionKind
  currency?: 'ARS' | 'USD'
}

export function SavingContributionSheet({
  open,
  onOpenChange,
  kind,
  currency,
}: SavingContributionSheetProps) {
  const [context, setContext] = useState<SavingContributionContext | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchContext = useCallback(() => {
    let active = true
    setLoading(true)
    setError(null)

    getSavingContributionContext()
      .then((res) => {
        if (!active) return
        if (res.profile === 'missing') {
          setError(
            kind === 'investment'
              ? 'Completá tu perfil financiero antes de registrar una inversión.'
              : 'Completá tu perfil financiero antes de registrar un ahorro.',
          )
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
  }, [kind])

  useEffect(() => {
    if (!open) return
    const cleanup = fetchContext()
    return cleanup
  }, [open, fetchContext])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 p-0 data-[side=right]:w-full data-[side=right]:max-w-none data-[side=right]:sm:w-[450px] data-[side=right]:sm:max-w-[450px]"
      >
        <SheetHeader className="border-b border-[var(--line)] px-6 py-5">
          <SheetTitle className="font-serif text-2xl font-bold text-[var(--sea-ink)]">
            {kind === 'investment' ? 'Registrar inversión' : 'Registrar ahorro'}
          </SheetTitle>
          <SheetDescription className="text-sm text-[var(--sea-ink-soft)]">
            {kind === 'investment'
              ? 'Registrá una inversión en ARS o USD y mirá cómo se distribuye en tus objetivos.'
              : 'Registrá un ahorro en ARS o USD y mirá cómo se distribuye en tus objetivos.'}
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
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchContext}>
              Reintentar
            </Button>
          </div>
        ) : context ? (
          <SavingContribution
            kind={kind}
            currency={currency}
            context={context}
            onCancel={() => onOpenChange(false)}
            onSuccess={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

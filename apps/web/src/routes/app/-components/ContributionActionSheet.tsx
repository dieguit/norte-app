import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, PiggyBank, TrendingUp } from 'lucide-react'
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

export interface ContributionActionSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface SelectedAction {
  kind: ContributionKind
  currency: 'ARS' | 'USD'
}

export function ContributionActionSheet({
  open,
  onOpenChange,
}: ContributionActionSheetProps) {
  const [selectedAction, setSelectedAction] = useState<SelectedAction | null>(null)
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
          setError('Completá tu perfil financiero antes de registrar un aporte.')
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
  }, [])

  useEffect(() => {
    if (!open) {
      setSelectedAction(null)
      return
    }
    const cleanup = fetchContext()
    return cleanup
  }, [open, fetchContext])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedAction(null)
    }
    onOpenChange(nextOpen)
  }

  const getHeaderTitle = () => {
    if (!selectedAction) return 'Registrar aporte'
    return selectedAction.kind === 'investment' ? 'Registrar inversión' : 'Registrar ahorro'
  }

  const getHeaderDescription = () => {
    if (!selectedAction) {
      return 'Elegí qué tipo de aporte querés registrar para asignarlo a tus objetivos.'
    }
    const actionLabel = selectedAction.kind === 'investment' ? 'inversión' : 'ahorro'
    return `Registrá tu ${actionLabel} en ${selectedAction.currency} y mirá cómo se distribuye en tus objetivos.`
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 p-0 data-[side=right]:w-full data-[side=right]:max-w-none data-[side=right]:sm:w-[450px] data-[side=right]:sm:max-w-[450px]"
      >
        <SheetHeader className="border-b border-[var(--line)] px-6 py-5">
          <div className="flex items-center gap-3">
            {selectedAction && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Volver a opciones de aporte"
                onClick={() => setSelectedAction(null)}
                className="-ml-2 h-8 w-8 p-0 text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
              >
                <ArrowLeft className="size-4" />
              </Button>
            )}
            <SheetTitle className="font-serif text-2xl font-bold text-[var(--sea-ink)]">
              {getHeaderTitle()}
            </SheetTitle>
          </div>
          <SheetDescription className="text-sm text-[var(--sea-ink-soft)]">
            {getHeaderDescription()}
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
        ) : context && !selectedAction ? (
          <div className="flex flex-1 flex-col justify-between overflow-y-auto p-6">
            <div className="flex flex-col gap-6">
              {/* Savings Actions */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--palm)]">
                  <PiggyBank className="size-4 text-[var(--palm)]" />
                  <span>Ahorro</span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    aria-label="Ahorré ARS"
                    onClick={() => setSelectedAction({ kind: 'saving', currency: 'ARS' })}
                    className="flex flex-col gap-1.5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 text-left shadow-sm transition-all hover:border-[var(--palm)] hover:shadow-md active:scale-[0.98]"
                  >
                    <span className="text-base font-bold text-[var(--sea-ink)]">
                      Ahorré ARS
                    </span>
                    <span className="text-xs text-[var(--sea-ink-soft)]">
                      Ahorro guardado en pesos argentinos
                    </span>
                  </button>

                  <button
                    type="button"
                    aria-label="Ahorré USD"
                    onClick={() => setSelectedAction({ kind: 'saving', currency: 'USD' })}
                    className="flex flex-col gap-1.5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 text-left shadow-sm transition-all hover:border-[var(--palm)] hover:shadow-md active:scale-[0.98]"
                  >
                    <span className="text-base font-bold text-[var(--sea-ink)]">
                      Ahorré USD
                    </span>
                    <span className="text-xs text-[var(--sea-ink-soft)]">
                      Compra o ahorro en dólares
                    </span>
                  </button>
                </div>
              </div>

              {/* Investment Actions */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--lagoon-deep)]">
                  <TrendingUp className="size-4 text-[var(--lagoon-deep)]" />
                  <span>Inversión</span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    aria-label="Invertí ARS"
                    onClick={() => setSelectedAction({ kind: 'investment', currency: 'ARS' })}
                    className="flex flex-col gap-1.5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 text-left shadow-sm transition-all hover:border-[var(--lagoon-deep)] hover:shadow-md active:scale-[0.98]"
                  >
                    <span className="text-base font-bold text-[var(--sea-ink)]">
                      Invertí ARS
                    </span>
                    <span className="text-xs text-[var(--sea-ink-soft)]">
                      Aporte a inversiones en pesos (CEDEARs, FCI)
                    </span>
                  </button>

                  <button
                    type="button"
                    aria-label="Invertí USD"
                    onClick={() => setSelectedAction({ kind: 'investment', currency: 'USD' })}
                    className="flex flex-col gap-1.5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 text-left shadow-sm transition-all hover:border-[var(--lagoon-deep)] hover:shadow-md active:scale-[0.98]"
                  >
                    <span className="text-base font-bold text-[var(--sea-ink)]">
                      Invertí USD
                    </span>
                    <span className="text-xs text-[var(--sea-ink-soft)]">
                      Aporte a inversiones en dólares
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-[var(--line)] pt-4">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => handleOpenChange(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : context && selectedAction ? (
          <SavingContribution
            kind={selectedAction.kind}
            currency={selectedAction.currency}
            fixedCurrency={selectedAction.currency}
            context={context}
            onCancel={() => handleOpenChange(false)}
            onSuccess={() => handleOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '../../../../components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../../../../components/ui/sheet'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../../../components/ui/popover'
import { formatDate, formatMoney } from '../../../../lib/format'
import { createMoney } from '../../../../lib/money'
import { deleteSavingContribution } from '../../../../features/contributions/saving-contribution.functions'
import type { SavingContributionSummary } from '../../../../features/goals/goals'
import { SavingContribution } from '../../-components/SavingContribution'

export interface SavingContributionActionsProps {
  goalId: string
  contributions: SavingContributionSummary[]
}

export function SavingContributionActions({
  goalId: _goalId,
  contributions,
}: SavingContributionActionsProps) {
  const router = useRouter()
  const [editingContribution, setEditingContribution] = useState<SavingContributionSummary | null>(null)
  const [deletingContributionId, setDeletingContributionId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  if (!contributions || contributions.length === 0) {
    return null
  }

  const handleDelete = async (contributionId: string) => {
    setIsDeleting(true)
    try {
      await deleteSavingContribution({
        data: {
          contributionId,
        },
      })
      await router.invalidate()
      toast.success('Ahorro eliminado.')
      setDeletingContributionId(null)
    } catch (err: any) {
      toast.error(err?.message ?? 'Ocurrió un error al eliminar el ahorro.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-[var(--line)] pt-3">
      <h5 className="text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)]">
        Historial de aportes
      </h5>
      <ul className="flex flex-col divide-y divide-[var(--line)] rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-1 shadow-sm">
        {contributions.map((item) => {
          const money = createMoney(item.amount, item.currency)
          const formattedDate = formatDate(item.createdAt, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })

          return (
            <li
              key={item.id}
              className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-[var(--sea-ink)]">
                    {formatMoney(money)}
                  </span>
                  {item.location && (
                    <span className="text-xs text-[var(--sea-ink-soft)]">
                      {item.location}
                    </span>
                  )}
                </div>
                <span className="text-xs text-[var(--sea-ink-soft)]">
                  {formattedDate}
                </span>
              </div>

              <div className="flex items-center gap-1 self-end sm:self-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Corregir aporte del ${formattedDate}`}
                  onClick={() => setEditingContribution(item)}
                >
                  <Pencil data-icon="inline-start" className="size-3.5" aria-hidden="true" />
                  Corregir aporte
                </Button>

                <Popover
                  open={deletingContributionId === item.id}
                  onOpenChange={(open) => setDeletingContributionId(open ? item.id : null)}
                >
                  <PopoverTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Eliminar aporte del ${formattedDate}`}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 data-icon="inline-start" className="size-3.5" aria-hidden="true" />
                        Eliminar aporte
                      </Button>
                    }
                  />
                  <PopoverContent align="end" className="w-80 p-4">
                    <div className="flex flex-col gap-3">
                      <div>
                        <h4 className="font-semibold text-sm text-[var(--sea-ink)]">
                          ¿Estás seguro de que querés eliminar este aporte?
                        </h4>
                        <p className="mt-1 text-xs text-[var(--sea-ink-soft)]">
                          Se descontará de los objetivos en los que fue asignado.
                        </p>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setDeletingContributionId(null)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={isDeleting}
                          onClick={() => handleDelete(item.id)}
                        >
                          {isDeleting ? 'Eliminando...' : 'Eliminar aporte'}
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </li>
          )
        })}
      </ul>

      {editingContribution && (
        <Sheet
          open={Boolean(editingContribution)}
          onOpenChange={(open) => {
            if (!open) setEditingContribution(null)
          }}
        >
          <SheetContent
            side="right"
            className="flex flex-col gap-0 p-0 data-[side=right]:w-full data-[side=right]:max-w-none data-[side=right]:sm:w-[450px] data-[side=right]:sm:max-w-[450px]"
          >
            <SheetHeader className="border-b border-[var(--line)] px-6 py-5">
              <SheetTitle className="font-serif text-2xl font-bold text-[var(--sea-ink)]">
                Corregir ahorro
              </SheetTitle>
              <SheetDescription className="text-sm text-[var(--sea-ink-soft)]">
                Modificá los datos de este ahorro manteniendo la distribución original entre objetivos.
              </SheetDescription>
            </SheetHeader>

            <SavingContribution
              initialContribution={editingContribution}
              onCancel={() => setEditingContribution(null)}
              onSuccess={() => setEditingContribution(null)}
            />
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}

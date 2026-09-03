import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '../../../../components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '../../../../components/ui/popover'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../../../components/ui/sheet'
import { formatDate, formatMoney } from '../../../../lib/format'
import { createMoney } from '../../../../lib/money'
import type { ContributionSummary } from '../../../../features/goals/goals'
import { SavingContribution } from '../../-components/SavingContribution'

function ContributionDeletePopover({
  item,
  formattedDate,
  open,
  isDeleting,
  onOpenChange,
  onDelete,
}: {
  item: ContributionSummary
  formattedDate: string
  open: boolean
  isDeleting: boolean
  onOpenChange: (open: boolean) => void
  onDelete: () => void
}) {
  const isInvestment = item.kind === 'investment'
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger render={<Button type="button" variant="ghost" size="sm" aria-label={`Eliminar aporte de ${isInvestment ? 'inversión' : 'ahorro'} del ${formattedDate}`} className="text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 data-icon="inline-start" className="size-3.5" aria-hidden="true" />Eliminar aporte</Button>} />
      <PopoverContent align="end" className="w-80 p-4">
        <div className="flex flex-col gap-3">
          <div>
            <h4 className="text-sm font-semibold text-[var(--sea-ink)]">{isInvestment ? '¿Estás seguro de que querés eliminar esta inversión?' : '¿Estás seguro de que querés eliminar este aporte?'}</h4>
            <p className="mt-1 text-xs text-[var(--sea-ink-soft)]">Se descontará de los objetivos en los que fue {isInvestment ? 'asignada' : 'asignado'}.</p>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="button" variant="destructive" size="sm" disabled={isDeleting} onClick={onDelete}>{isDeleting ? 'Eliminando...' : isInvestment ? 'Eliminar inversión' : 'Eliminar aporte'}</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function ContributionHistoryActions({ item, formattedDate, onEdit, onDeleteOpen, onDelete, deleting, isDeleting }: { item: ContributionSummary; formattedDate: string; onEdit: () => void; onDeleteOpen: (open: boolean) => void; onDelete: () => void; deleting: boolean; isDeleting: boolean }) {
  const isInvestment = item.kind === 'investment'
  return (
    <div className="flex items-center gap-1 self-end sm:self-center">
      <Button type="button" variant="ghost" size="sm" aria-label={`Corregir aporte de ${isInvestment ? 'inversión' : 'ahorro'} del ${formattedDate}`} onClick={onEdit}><Pencil data-icon="inline-start" className="size-3.5" aria-hidden="true" />Corregir aporte</Button>
      <ContributionDeletePopover item={item} formattedDate={formattedDate} open={deleting} isDeleting={isDeleting} onOpenChange={onDeleteOpen} onDelete={onDelete} />
    </div>
  )
}

export function ContributionHistoryItem({ item, readOnly, deleting, isDeleting, onEdit, onDeleteOpen, onDelete }: { item: ContributionSummary; readOnly: boolean; deleting: boolean; isDeleting: boolean; onEdit: () => void; onDeleteOpen: (open: boolean) => void; onDelete: () => void }) {
  const isInvestment = item.kind === 'investment'
  const formattedDate = formatDate(item.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })
  return (
    <li className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--sea-ink)]">{formatMoney(createMoney(item.amount, item.currency))}</span>
          <span className="rounded-md border border-[var(--line)] bg-[var(--foam)] px-2 py-0.5 text-xs font-semibold text-[var(--sea-ink)]">{isInvestment ? 'Inversión' : 'Ahorro'}</span>
          {item.placeName && <span className="text-xs text-[var(--sea-ink-soft)]">{item.placeName}</span>}
        </div>
        <span className="text-xs text-[var(--sea-ink-soft)]">{formattedDate}</span>
      </div>
      {!readOnly && <ContributionHistoryActions item={item} formattedDate={formattedDate} onEdit={onEdit} onDeleteOpen={onDeleteOpen} onDelete={onDelete} deleting={deleting} isDeleting={isDeleting} />}
    </li>
  )
}

export function ContributionEditSheet({ item, onClose }: { item: ContributionSummary; onClose: () => void }) {
  const isInvestment = item.kind === 'investment'
  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="flex flex-col gap-0 p-0 data-[side=right]:w-full data-[side=right]:max-w-none data-[side=right]:sm:w-[450px] data-[side=right]:sm:max-w-[450px]">
        <SheetHeader className="border-b border-[var(--line)] px-6 py-5">
          <SheetTitle className="font-serif text-2xl font-bold text-[var(--sea-ink)]">{isInvestment ? 'Corregir inversión' : 'Corregir ahorro'}</SheetTitle>
          <SheetDescription className="text-sm text-[var(--sea-ink-soft)]">{isInvestment ? 'Modificá los datos de esta inversión manteniendo la distribución original entre objetivos.' : 'Modificá los datos de este ahorro manteniendo la distribución original entre objetivos.'}</SheetDescription>
        </SheetHeader>
        <SavingContribution initialContribution={item} onCancel={onClose} onSuccess={onClose} />
      </SheetContent>
    </Sheet>
  )
}

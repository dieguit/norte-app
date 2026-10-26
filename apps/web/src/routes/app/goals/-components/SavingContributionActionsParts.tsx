import { useState } from 'react'
import { Ellipsis, Pencil, Trash2 } from 'lucide-react'
import { Money } from '../../../../components/norte/Money'
import { Button } from '../../../../components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '../../../../components/ui/popover'
import { Sheet } from '../../../../components/ui/sheet'
import { SidePanelContent, SidePanelHeader } from '../../../../components/norte/SidePanel'
import { formatDate } from '../../../../lib/format'
import { createMoney } from '../../../../lib/money'
import type { ContributionSummary } from '../../../../features/goals/goals'
import { SavingContribution } from '../../-components/SavingContribution'
import { MenuItem } from './GoalsWorkspaceParts'

function DeleteConfirmView({ isInvestment, isDeleting, onCancel, onDelete }: { isInvestment: boolean; isDeleting: boolean; onCancel: () => void; onDelete: () => void }) {
  const label = isDeleting ? 'Eliminando...' : isInvestment ? 'Eliminar inversión' : 'Eliminar aporte'
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h4 className="m-0 text-body-sm font-semibold text-foreground">{isInvestment ? '¿Estás seguro de que querés eliminar esta inversión?' : '¿Estás seguro de que querés eliminar este aporte?'}</h4>
        <p className="m-0 mt-1 text-caption text-muted-foreground">Se descontará de los objetivos en los que fue {isInvestment ? 'asignada' : 'asignado'}.</p>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button type="button" variant="destructive" size="sm" disabled={isDeleting} onClick={onDelete}>{label}</Button>
      </div>
    </div>
  )
}

function ContributionMenu({ item, date, open, isDeleting, onOpenChange, onEdit, onDelete }: { item: ContributionSummary; date: string; open: boolean; isDeleting: boolean; onOpenChange: (open: boolean) => void; onEdit: () => void; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const isInvestment = item.kind === 'investment'
  const kind = isInvestment ? 'inversión' : 'ahorro'

  const handleOpenChange = (next: boolean) => {
    if (!next) setConfirming(false)
    onOpenChange(next)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={`Acciones del aporte de ${kind} del ${date}`}
            className="relative flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors after:absolute after:-inset-2 hover:bg-muted data-[popup-open]:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring motion-reduce:transition-none"
          />
        }
      >
        <Ellipsis className="size-4" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="end" className={confirming ? 'w-80 rounded-lg p-4 shadow-float' : 'flex w-55 flex-col gap-0 rounded-lg p-1.5 shadow-float'}>
        {confirming ? (
          <DeleteConfirmView isInvestment={isInvestment} isDeleting={isDeleting} onCancel={() => handleOpenChange(false)} onDelete={onDelete} />
        ) : (
          <>
            <MenuItem icon={Pencil} label="Corregir aporte" aria-label={`Corregir aporte de ${kind} del ${date}`} onClick={() => { handleOpenChange(false); onEdit() }} />
            <MenuItem icon={Trash2} label="Eliminar aporte" aria-label={`Eliminar aporte de ${kind} del ${date}`} destructive onClick={() => setConfirming(true)} />
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}

export function ContributionHistoryItem({ item, readOnly, menuOpen, isDeleting, onEdit, onMenuOpenChange, onDelete }: { item: ContributionSummary; readOnly: boolean; menuOpen: boolean; isDeleting: boolean; onEdit: () => void; onMenuOpenChange: (open: boolean) => void; onDelete: () => void }) {
  const amount = createMoney(item.amount, item.currency)
  return (
    <li className="flex min-h-10 items-center gap-3 py-1.5">
      <span className="w-11 shrink-0 text-caption text-subtle-foreground">{formatDate(item.createdAt, { day: '2-digit', month: 'short' }).replace('-', ' ')}</span>
      <span className="min-w-0 flex-1 truncate text-[14px] text-foreground">{[item.kind === 'investment' ? 'Inversión' : 'Ahorro', item.placeName].filter(Boolean).join(' · ')}</span>
      <Money value={amount} size="sm" sign="always" tone={Number(item.amount) < 0 ? 'negative' : 'positive'} />
      {!readOnly && (
        <ContributionMenu
          item={item}
          date={formatDate(item.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}
          open={menuOpen}
          isDeleting={isDeleting}
          onOpenChange={onMenuOpenChange}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
    </li>
  )
}

export function ContributionEditSheet({ item, onClose }: { item: ContributionSummary; onClose: () => void }) {
  const isInvestment = item.kind === 'investment'
  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SidePanelContent>
        <SidePanelHeader
          title={isInvestment ? 'Corregir inversión' : 'Corregir ahorro'}
          description={
            isInvestment
              ? 'Modificá los datos de esta inversión manteniendo la distribución original entre objetivos.'
              : 'Modificá los datos de este ahorro manteniendo la distribución original entre objetivos.'
          }
        />
        <SavingContribution initialContribution={item} onCancel={onClose} onSuccess={onClose} />
      </SidePanelContent>
    </Sheet>
  )
}

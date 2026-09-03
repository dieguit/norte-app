import { ArrowLeft } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import type { ContributionKind } from '../../../features/contributions/saving-contribution'
import { SheetDescription, SheetTitle } from '../../../components/ui/sheet'

interface ContributionActionHeaderProps {
  selectedAction: { kind: ContributionKind; currency: 'ARS' | 'USD' } | null
  onBack: () => void
}

export function ContributionActionHeader({ selectedAction, onBack }: ContributionActionHeaderProps) {
  const title = !selectedAction
    ? 'Registrar aporte'
    : selectedAction.kind === 'investment'
      ? 'Registrar inversión'
      : 'Registrar ahorro'
  const description = !selectedAction
    ? 'Elegí qué tipo de aporte querés registrar para asignarlo a tus objetivos.'
    : `Registrá tu ${selectedAction.kind === 'investment' ? 'inversión' : 'ahorro'} en ${selectedAction.currency} y mirá cómo se distribuye en tus objetivos.`
  return (
    <>
      <div className="flex items-center gap-3">
        {selectedAction && (
          <Button type="button" variant="ghost" size="sm" aria-label="Volver a opciones de aporte" onClick={onBack} className="-ml-2 h-8 w-8 p-0 text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]">
            <ArrowLeft className="size-4" />
          </Button>
        )}
        <SheetTitle className="font-serif text-2xl font-bold text-[var(--sea-ink)]">{title}</SheetTitle>
      </div>
      <SheetDescription className="text-sm text-[var(--sea-ink-soft)]">{description}</SheetDescription>
    </>
  )
}

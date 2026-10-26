import { SheetLoadingState } from '../../../components/SheetLoadingState'
import { Sheet } from '../../../components/ui/sheet'
import { SidePanelContent, SidePanelHeader } from '../../../components/norte/SidePanel'
import { Button } from '../../../components/ui/button'
import type {
  ContributionKind,
} from '../../../features/contributions/saving-contribution'
import { SavingContribution } from './SavingContribution'
import { useSavingContributionContext } from './useSavingContributionContext'

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
  const contributionContext = useSavingContributionContext({
    open,
    missingProfileMessage:
      kind === 'investment'
        ? 'Completá tu perfil financiero antes de registrar una inversión.'
        : 'Completá tu perfil financiero antes de registrar un ahorro.',
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SidePanelContent>
        <SidePanelHeader
          title={kind === 'investment' ? 'Registrar inversión' : 'Registrar ahorro'}
          description={
            kind === 'investment'
              ? 'Registrá una inversión en ARS o USD y mirá cómo se distribuye en tus objetivos.'
              : 'Registrá un ahorro en ARS o USD y mirá cómo se distribuye en tus objetivos.'
          }
        />

        {contributionContext.loading ? (
          <SheetLoadingState />
        ) : contributionContext.error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
            <p className="text-sm text-destructive">{contributionContext.error}</p>
            <Button variant="outline" size="sm" onClick={contributionContext.fetchContext}>
              Reintentar
            </Button>
          </div>
        ) : contributionContext.context ? (
          <SavingContribution
            kind={kind}
            currency={currency}
            context={contributionContext.context}
            onCancel={() => onOpenChange(false)}
            onSuccess={() => onOpenChange(false)}
          />
        ) : null}
      </SidePanelContent>
    </Sheet>
  )
}

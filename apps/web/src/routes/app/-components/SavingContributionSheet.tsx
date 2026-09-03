import { SheetLoadingState } from '../../../components/SheetLoadingState'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../../../components/ui/sheet'
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
      </SheetContent>
    </Sheet>
  )
}

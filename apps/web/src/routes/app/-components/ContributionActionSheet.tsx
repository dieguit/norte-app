import { Sheet, SheetContent, SheetHeader } from '../../../components/ui/sheet'
import { useSavingContributionContext } from './useSavingContributionContext'
import { ContributionActionContent } from './ContributionActionContent'
import { ContributionActionHeader } from './ContributionActionHeader'
import { useContributionActionSelection } from './useContributionActionSelection'
import type { CatchUpContribution } from './contribution-action-types'

export type { CatchUpContribution } from './contribution-action-types'

export interface ContributionActionSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  catchUpContribution?: CatchUpContribution | null
}

export function ContributionActionSheet({
  open,
  onOpenChange,
  catchUpContribution,
}: ContributionActionSheetProps) {
  const selection = useContributionActionSelection(open, catchUpContribution)
  const contextState = useSavingContributionContext({
    open,
    missingProfileMessage: 'Completá tu perfil financiero antes de registrar un aporte.',
  })
  const isContextual = Boolean(
    catchUpContribution &&
      selection.selectedAction?.kind === catchUpContribution.kind &&
      selection.selectedAction.currency === catchUpContribution.currency,
  )
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) selection.setSelectedAction(null)
    onOpenChange(nextOpen)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="flex flex-col gap-0 p-0 data-[side=right]:w-full data-[side=right]:max-w-none data-[side=right]:sm:w-[450px] data-[side=right]:sm:max-w-[450px]">
        <SheetHeader className="border-b border-[var(--line)] px-6 py-5">
          <ContributionActionHeader selectedAction={selection.selectedAction} onBack={() => selection.setSelectedAction(null)} />
        </SheetHeader>
        <ContributionActionContent
          loading={contextState.loading}
          error={contextState.error}
          context={contextState.context}
          selectedAction={selection.selectedAction}
          catchUpContribution={catchUpContribution}
          isContextual={isContextual}
          onRetry={contextState.fetchContext}
          onSelect={selection.setSelectedAction}
          onCancel={() => handleOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  )
}

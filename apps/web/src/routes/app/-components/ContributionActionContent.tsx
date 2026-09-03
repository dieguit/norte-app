import { SheetLoadingState } from '../../../components/SheetLoadingState'
import { Button } from '../../../components/ui/button'
import type { SavingContributionContext } from '../../../features/contributions/saving-contribution'
import { SavingContribution } from './SavingContribution'
import { ContributionActionChoices } from './ContributionActionChoices'
import type { CatchUpContribution } from './contribution-action-types'
import type { SelectedContributionAction } from './useContributionActionSelection'

interface ContributionActionContentProps {
  loading: boolean
  error: string | null
  context: SavingContributionContext | null
  selectedAction: SelectedContributionAction | null
  catchUpContribution?: CatchUpContribution | null
  isContextual: boolean
  onRetry: () => void
  onSelect: (action: SelectedContributionAction) => void
  onCancel: () => void
}

export function ContributionActionContent({
  loading,
  error,
  context,
  selectedAction,
  catchUpContribution,
  isContextual,
  onRetry,
  onSelect,
  onCancel,
}: ContributionActionContentProps) {
  if (loading) return <SheetLoadingState />
  if (error) return <ContributionActionError error={error} onRetry={onRetry} />
  if (!context) return null
  if (!selectedAction) return <ContributionActionChooser onSelect={onSelect} onCancel={onCancel} />
  return <SavingContributionForm action={selectedAction} context={context} catchUpContribution={catchUpContribution} isContextual={isContextual} onCancel={onCancel} />
}

function ContributionActionError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center"><p className="text-sm text-destructive">{error}</p><Button variant="outline" size="sm" onClick={onRetry}>Reintentar</Button></div>
}

function ContributionActionChooser({ onSelect, onCancel }: { onSelect: (action: SelectedContributionAction) => void; onCancel: () => void }) {
  return <div className="flex flex-1 flex-col justify-between overflow-y-auto p-6"><ContributionActionChoices onSelect={onSelect} /><div className="mt-8 border-t border-[var(--line)] pt-4"><Button type="button" variant="outline" className="w-full" onClick={onCancel}>Cancelar</Button></div></div>
}

function SavingContributionForm({ action, context, catchUpContribution, isContextual, onCancel }: { action: SelectedContributionAction; context: SavingContributionContext; catchUpContribution?: CatchUpContribution | null; isContextual: boolean; onCancel: () => void }) {
  return <SavingContribution kind={action.kind} currency={action.currency} {...getCatchUpProps(isContextual, catchUpContribution)} context={context} onCancel={onCancel} onSuccess={onCancel} />
}

function getCatchUpProps(isContextual: boolean, contribution?: CatchUpContribution | null) {
  if (!isContextual) return {}
  return { initialAmount: contribution?.amount, catchUpMonth: contribution?.month }
}

import { useEffect, useState } from 'react'
import type { ContributionKind } from '../../../features/contributions/saving-contribution'
import type { CatchUpContribution } from './contribution-action-types'

export type SelectedContributionAction = { kind: ContributionKind; currency: 'ARS' | 'USD' }

export function useContributionActionSelection(open: boolean, catchUpContribution?: CatchUpContribution | null) {
  const [selectedAction, setSelectedAction] = useState<SelectedContributionAction | null>(null)

  useEffect(() => {
    if (!open) {
      setSelectedAction(null)
      return
    }
    setSelectedAction(catchUpContribution ? {
      kind: catchUpContribution.kind,
      currency: catchUpContribution.currency,
    } : null)
  }, [open, catchUpContribution])

  return { selectedAction, setSelectedAction }
}

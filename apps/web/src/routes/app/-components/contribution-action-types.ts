import type { ContributionKind } from '../../../features/contributions/saving-contribution'

export interface CatchUpContribution {
  kind: ContributionKind
  currency: 'ARS' | 'USD'
  amount: string
  month: string
}

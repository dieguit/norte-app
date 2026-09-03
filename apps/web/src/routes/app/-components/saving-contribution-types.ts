import type {
  ContributionKind,
  SavingContributionContext,
} from '../../../features/contributions/saving-contribution'
import type { SavingContributionSummary } from '../../../features/goals/goals'

export interface SavingContributionProps {
  kind?: ContributionKind
  currency?: 'ARS' | 'USD'
  initialAmount?: string
  catchUpMonth?: string
  context?: SavingContributionContext
  initialContribution?: SavingContributionSummary | null
  onCancel: () => void
  onSuccess: () => void
}

import type { CurrencyCode, Money } from '../../lib/money'
import type { ContributionKind, GoalProjection } from '../goals/goals'

export type { ContributionKind } from '../goals/goals'

export interface SavingDraftInput {
  kind?: ContributionKind
  currency: CurrencyCode
  amount: string
  place?: { kind: 'existing'; placeId: string } | { kind: 'new'; name: string }
  arsSpent?: string | null
  effectiveRate?: string | null
}

export interface EligibleGoal {
  id: string
  name: string
  percentage: string | number
}

export interface SavingDraft {
  kind?: ContributionKind
  currency: CurrencyCode
  amount: Money
  place?: { kind: 'existing'; placeId: string } | { kind: 'new'; name: string }
  arsSpent?: Money
  effectiveRate?: string
}

export interface SavingAllocationPreview {
  goalId: string
  goalName: string
  percentage: string
  amount: Money
  progressBefore?: string
  progressAfter?: string
  projectionBefore?: GoalProjection
  projectionAfter?: GoalProjection
}

export interface SavingPreviewResult {
  draft: SavingDraft
  allocations: SavingAllocationPreview[]
}

export interface SavingContributionPreviewResult {
  preview: SavingPreviewResult
  previewToken?: string
}

export interface SavingContributionContext {
  currentMonth: string
  eligibleGoals: EligibleGoal[]
  eligibleGoalsUsd: EligibleGoal[]
  eligibleInvestmentGoals?: EligibleGoal[]
  eligibleInvestmentGoalsUsd?: EligibleGoal[]
  monthlyTargetArs?: Money | null
  monthlyTargetUsd?: Money | null
  monthlyInvestmentTargetArs?: Money | null
  monthlyInvestmentTargetUsd?: Money | null
  places: Array<{ id: string; name: string }>
  investmentState: InvestmentContributionDataState
}

export type InvestmentContributionCurrencyState =
  | { status: 'ready' }
  | { status: 'incomplete'; reason: 'missing_investment_position' }

export interface InvestmentContributionDataState {
  ars: InvestmentContributionCurrencyState
  usd: InvestmentContributionCurrencyState
}

export interface PreviousMonthShortfall {
  kind: ContributionKind
  currency: CurrencyCode
  amount: Money
}

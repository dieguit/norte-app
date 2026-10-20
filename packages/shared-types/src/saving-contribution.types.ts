import type { CurrencyCode, Money } from '@repo/finance-utils'
import type { ContributionKind, GoalProjection } from './goals.schema'

export interface EligibleGoal {
  id: string
  name: string
  percentage: string | number
}

export interface SavingDraftInput {
  kind?: ContributionKind
  currency: CurrencyCode
  amount: string
  place?: { kind: 'existing'; placeId: string } | { kind: 'new'; name: string }
  arsSpent?: string | null
  effectiveRate?: string | null
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

import { useState } from 'react'
import type { SavingContributionSummary } from '../../../features/goals/goals'
import type { ContributionKind } from '../../../features/contributions/saving-contribution'
import { PLANNING_ARS_PER_USD } from '../../../features/financial/financial'
import { formatMoneyInput } from '../../../lib/money'
import {
  formatDerivedMoney,
  resolveUsdInputChange,
  type DerivedContributionField,
} from './saving-contribution-inputs'

export type ContributionPlace =
  | { kind: 'existing'; placeId: string }
  | { kind: 'new'; name: string }
  | null

export interface SavingContributionDraftState {
  currency: 'ARS' | 'USD'
  amount: string
  arsSpent: string
  effectiveRate: string
  derivedField: DerivedContributionField
  place: ContributionPlace
}

interface UseSavingContributionDraftOptions {
  kind: ContributionKind
  initialCurrency: 'ARS' | 'USD'
  initialAmount?: string
  initialContribution?: SavingContributionSummary | null
  onDraftChange: () => void
}

function createInitialDraft({
  kind,
  initialCurrency,
  initialAmount,
  initialContribution,
}: Omit<UseSavingContributionDraftOptions, 'onDraftChange'>): SavingContributionDraftState {
  return {
    currency: initialCurrency,
    amount: getInitialAmount(initialContribution, initialAmount),
    arsSpent: getInitialArsSpent(initialContribution),
    effectiveRate: getInitialRate(initialContribution, initialCurrency),
    derivedField: initialCurrency === 'USD' ? 'arsSpent' : null,
    place: getInitialPlace(initialContribution, kind),
  }
}

function getInitialAmount(initialContribution?: SavingContributionSummary | null, initialAmount?: string) {
  const value = initialContribution?.amount ?? initialAmount
  return value ? formatDerivedMoney(value) : ''
}

function getInitialArsSpent(initialContribution?: SavingContributionSummary | null) {
  return initialContribution?.arsSpent ? formatDerivedMoney(initialContribution.arsSpent) : ''
}

function getInitialRate(initialContribution: SavingContributionSummary | null | undefined, currency: 'ARS' | 'USD') {
  if (initialContribution?.effectiveRate) return formatDerivedMoney(initialContribution.effectiveRate)
  return currency === 'USD' ? formatDerivedMoney(PLANNING_ARS_PER_USD) : ''
}

function getInitialPlace(initialContribution: SavingContributionSummary | null | undefined, kind: ContributionKind) {
  return initialContribution?.placeId && kind === 'saving'
    ? { kind: 'existing' as const, placeId: initialContribution.placeId }
    : null
}

export function useSavingContributionDraft(
  options: UseSavingContributionDraftOptions,
) {
  const [draft, setDraft] = useState(() => createInitialDraft(options))

  const updateInput = (
    field: 'amount' | 'arsSpent' | 'effectiveRate',
    raw: string,
  ) => {
    options.onDraftChange()
    setDraft((current) => {
      const change =
        current.currency === 'USD'
          ? resolveUsdInputChange(field, raw, current)
          : { [field]: formatMoneyInput(raw) }
      return { ...current, ...change }
    })
  }

  const handleCurrencyChange = (currency: 'ARS' | 'USD') => {
    if (currency === draft.currency) return
    options.onDraftChange()
    setDraft((current) => ({
      ...current,
      currency,
      amount: '',
      arsSpent: '',
      effectiveRate: currency === 'USD' ? formatDerivedMoney(PLANNING_ARS_PER_USD) : '',
      derivedField: currency === 'USD' ? 'arsSpent' : null,
    }))
  }

  return {
    ...draft,
    handleAmountChange: (raw: string) => updateInput('amount', raw),
    handleArsSpentChange: (raw: string) => updateInput('arsSpent', raw),
    handleRateChange: (raw: string) => updateInput('effectiveRate', raw),
    handleCurrencyChange,
    setPlace: (place: ContributionPlace) => setDraft((current) => ({ ...current, place })),
  }
}

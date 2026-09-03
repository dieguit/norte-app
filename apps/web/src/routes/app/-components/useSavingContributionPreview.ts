import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { parseMoneyInput } from '../../../lib/money'
import {
  buildSavingPreview,
  deriveUsdPurchase,
  type ContributionKind,
  type EligibleGoal,
  type SavingContributionContext,
  type SavingContributionPreviewResult,
  type SavingDraftInput,
} from '../../../features/contributions/saving-contribution'
import { previewSavingContribution } from '../../../features/contributions/saving-contribution.functions'
import type { SavingContributionSummary } from '../../../features/goals/goals'
import type { SavingContributionDraftState } from './useSavingContributionDraft'

interface UseSavingContributionPreviewOptions {
  kind: ContributionKind
  context?: SavingContributionContext
  draft: SavingContributionDraftState
  isEdit: boolean
  initialContribution?: SavingContributionSummary | null
}

interface PreviewState {
  preview: SavingContributionPreviewResult | null
  isPreviewPending: boolean
  serverError: string | null
  validationError: string | null
}

interface PreviewPlan {
  draft: SavingDraftInput
  validationError?: string
}

function getEditGoals(initialContribution: SavingContributionSummary): EligibleGoal[] {
  return initialContribution.allocations.map((allocation) => ({
      id: allocation.goalId,
      name: allocation.goalName,
      percentage: allocation.percentage,
  }))
}

function getContextGoals(kind: ContributionKind, context?: SavingContributionContext) {
  return kind === 'investment' ? getInvestmentGoals(context) : getSavingGoals(context)
}

function getInvestmentGoals(context?: SavingContributionContext) {
  return {
    ARS: context?.eligibleInvestmentGoals ?? [],
    USD: context?.eligibleInvestmentGoalsUsd ?? [],
  }
}

function getSavingGoals(context?: SavingContributionContext) {
  return {
    ARS: context?.eligibleGoals ?? [],
    USD: context?.eligibleGoalsUsd ?? [],
  }
}

function getEligibleGoals(options: UseSavingContributionPreviewOptions): EligibleGoal[] {
  const { kind, context, draft, isEdit, initialContribution } = options
  if (isEdit && initialContribution) return getEditGoals(initialContribution)
  return getContextGoals(kind, context)[draft.currency]
}

function getUsdValues(draft: SavingContributionDraftState) {
  try {
    return deriveUsdPurchase({
      usdAmount: draft.amount,
      arsSpent: draft.arsSpent || null,
      effectiveRate: draft.effectiveRate || null,
    })
  } catch {
    return null
  }
}

function createValidUsdPlan(kind: ContributionKind, draft: SavingContributionDraftState, values: NonNullable<ReturnType<typeof getUsdValues>>): PreviewPlan {
  return {
    draft: {
      kind,
      currency: 'USD',
      amount: draft.amount,
      arsSpent: values?.arsSpent ?? (draft.arsSpent || null),
      effectiveRate: values?.effectiveRate ?? (draft.effectiveRate || null),
      ...(kind === 'saving' && draft.place ? { place: draft.place } : {}),
    },
  }
}

function createInvalidUsdPlan(kind: ContributionKind, draft: SavingContributionDraftState): PreviewPlan {
  return {
    draft: { kind, currency: 'USD', amount: draft.amount },
    validationError: draft.amount && draft.arsSpent && draft.effectiveRate
      ? 'Los valores en USD, ARS gastados y tipo de cambio no coinciden.'
      : undefined,
  }
}

function buildUsdDraft(kind: ContributionKind, draft: SavingContributionDraftState): PreviewPlan | null {
  if (!parseMoneyInput(draft.amount, 'USD')) return null
  const values = getUsdValues(draft)
  if (values) return createValidUsdPlan(kind, draft, values)
  return hasCompleteUsdDraft(draft) ? createInvalidUsdPlan(kind, draft) : null
}

function hasCompleteUsdDraft(draft: SavingContributionDraftState) {
  return Boolean(draft.amount && draft.arsSpent && draft.effectiveRate)
}

function buildPreviewPlan(
  kind: ContributionKind,
  draft: SavingContributionDraftState,
): PreviewPlan | null {
  if (kind === 'saving' && draft.place?.kind === 'new' && !draft.place.name.trim()) {
    return null
  }
  if (draft.currency === 'USD') return buildUsdDraft(kind, draft)
  if (!parseMoneyInput(draft.amount, 'ARS')) return null
  return {
    draft: {
      kind,
      currency: 'ARS',
      amount: draft.amount,
      ...(kind === 'saving' && draft.place ? { place: draft.place } : {}),
    },
  }
}

function toPreviewResult(
  kind: ContributionKind,
  plan: PreviewPlan,
  eligibleGoals: EligibleGoal[],
  isEdit: boolean,
): SavingContributionPreviewResult | null {
  if (!isEdit) return null
  try {
    return { preview: buildSavingPreview({ kind, draft: plan.draft, eligibleGoals }), previewToken: '' }
  } catch {
    return null
  }
}

function getSafePreviewErrorMessage(error: any) {
  const message = error?.message
  if (message && !message.includes('{') && !message.includes('Zod')) {
    return message
  }
  return 'No pudimos calcular la vista previa.'
}

function scheduleRemotePreview(
  plan: PreviewPlan,
  setState: Dispatch<SetStateAction<PreviewState>>,
) {
  let active = true
  setState((current) => ({ ...current, isPreviewPending: true, validationError: null }))
  const timer = setTimeout(() => {
    previewSavingContribution({ data: plan.draft })
      .then((preview) => active && setState({ preview, isPreviewPending: false, serverError: null, validationError: null }))
      .catch((error: any) => active && setState((current) => ({ ...current, preview: null, isPreviewPending: false, serverError: getSafePreviewErrorMessage(error) })))
  }, 250)
  return () => {
    active = false
    clearTimeout(timer)
  }
}

function usePreviewCalculation(
  options: UseSavingContributionPreviewOptions,
  eligibleGoals: EligibleGoal[],
  hasEligibleGoals: boolean,
  hasIncompleteInvestmentData: boolean,
) {
  const [state, setState] = useState<PreviewState>({
    preview: null,
    isPreviewPending: false,
    serverError: null,
    validationError: null,
  })
  useEffect(() => {
    const { draft, kind, isEdit, initialContribution } = options
    if (!hasEligibleGoals || hasIncompleteInvestmentData || (kind === 'saving' && !draft.place)) {
      setState((current) => ({ ...current, preview: null, isPreviewPending: false }))
      return
    }

    const plan = buildPreviewPlan(kind, draft)
    if (!plan) return setState((current) => ({ ...current, preview: null, isPreviewPending: false }))
    if (plan.validationError) return setState((current) => ({ ...current, preview: null, validationError: plan.validationError ?? null }))
    const localPreview = toPreviewResult(kind, plan, eligibleGoals, isEdit && !!initialContribution)
    if (localPreview) return setState({ preview: localPreview, isPreviewPending: false, serverError: null, validationError: null })
    return scheduleRemotePreview(plan, setState)
  }, [
    options.kind,
    options.context,
    options.draft.currency,
    options.draft.amount,
    options.draft.arsSpent,
    options.draft.effectiveRate,
    options.draft.place?.kind,
    options.draft.place?.kind === 'existing' ? options.draft.place.placeId : options.draft.place?.name,
    options.isEdit,
    options.initialContribution,
    hasEligibleGoals,
    hasIncompleteInvestmentData,
    eligibleGoals,
  ])

  return { state, setState }
}

export function useSavingContributionPreview(
  options: UseSavingContributionPreviewOptions,
) {
  const eligibleGoals = useMemo(
    () => getEligibleGoals(options),
    [options.kind, options.context, options.draft.currency, options.isEdit, options.initialContribution],
  )
  const hasEligibleGoals = eligibleGoals.length > 0
  const investmentState = options.draft.currency === 'ARS'
    ? options.context?.investmentState.ars
    : options.context?.investmentState.usd
  const hasIncompleteInvestmentData = options.kind === 'investment' && investmentState?.status === 'incomplete'
  const calculatedState = usePreviewCalculation(options, eligibleGoals, hasEligibleGoals, hasIncompleteInvestmentData)
  const { state, setState } = calculatedState

  return {
    ...state,
    eligibleGoals,
    hasEligibleGoals,
    hasIncompleteInvestmentData,
    clearPreview: () =>
      setState((current) => ({ ...current, preview: null })),
    setServerError: (message: string | null) =>
      setState((current) => ({ ...current, serverError: message })),
    setPreview: (preview: SavingContributionPreviewResult | null) =>
      setState((current) => ({ ...current, preview })),
    clearErrors: () =>
      setState((current) => ({ ...current, serverError: null, validationError: null })),
  }
}

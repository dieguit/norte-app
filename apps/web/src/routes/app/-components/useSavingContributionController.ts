import { useRef, useState } from 'react'
import type { SavingContributionSummary } from '../../../features/goals/goals'
import type { ContributionKind } from '../../../features/contributions/saving-contribution'
import type { SavingContributionProps } from './saving-contribution-types'
import { useSavingContributionConfirmation } from './useSavingContributionConfirmation'
import { useSavingContributionDraft } from './useSavingContributionDraft'
import { useSavingContributionPreview } from './useSavingContributionPreview'

function getContributionKind(
  initialContribution: SavingContributionSummary | null | undefined,
  propKind?: ContributionKind,
): ContributionKind {
  if (initialContribution && 'kind' in initialContribution && (initialContribution as any).kind) {
    return (initialContribution as any).kind as ContributionKind
  }
  return propKind ?? 'saving'
}

function getPlaceError(error: string | null) {
  return error === 'Elegí un lugar para tu ahorro.' || error === 'Escribí un nombre para el lugar.'
    ? error
    : undefined
}

export function useSavingContributionController(props: SavingContributionProps) {
  const { kind: propKind, currency: propCurrency, initialContribution } = props
  const kind = getContributionKind(initialContribution, propKind)
  const isEdit = Boolean(initialContribution)
  const initialCurrency = initialContribution?.currency ?? propCurrency ?? 'ARS'
  const [staleMessage, setStaleMessage] = useState<string | null>(null)
  const alertRef = useRef<HTMLDivElement>(null)
  const clearDraftFeedback = () => {
    previewState.clearPreview()
    previewState.clearErrors()
    setStaleMessage(null)
  }
  const draft = useSavingContributionDraft({
    kind,
    initialCurrency,
    initialAmount: props.initialAmount,
    initialContribution,
    onDraftChange: clearDraftFeedback,
  })
  const previewState = useSavingContributionPreview({
    kind,
    context: props.context,
    draft,
    isEdit,
    initialContribution,
  })
  const confirmation = useSavingContributionConfirmation({
    kind,
    draft,
    preview: previewState.preview,
    catchUpMonth: props.catchUpMonth,
    isEdit,
    initialContribution,
    hasEligibleGoals: previewState.hasEligibleGoals,
    hasIncompleteInvestmentData: previewState.hasIncompleteInvestmentData,
    setPreview: previewState.setPreview,
    setServerError: previewState.setServerError,
    setStaleMessage,
    alertRef,
    onSuccess: props.onSuccess,
  })
  return {
    ...props,
    kind,
    isEdit,
    draft,
    previewState,
    confirmation,
    staleMessage,
    alertRef,
    placeError: getPlaceError(previewState.serverError),
    actionNoun: kind === 'investment' ? 'inversión' : 'ahorro',
    isFormValid: Boolean(previewState.preview && !previewState.isPreviewPending && !confirmation.isSubmitting && previewState.hasEligibleGoals && !previewState.hasIncompleteInvestmentData && !previewState.validationError),
  }
}

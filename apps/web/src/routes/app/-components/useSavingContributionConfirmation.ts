import { useState, type RefObject } from 'react'
import { usePostHog } from '@posthog/react'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  confirmSavingContribution,
  updateSavingContribution,
} from '../../../features/contributions/saving-contribution.functions'
import type {
  ContributionKind,
  SavingContributionPreviewResult,
} from '../../../features/contributions/saving-contribution'
import type { SavingContributionSummary } from '../../../features/goals/goals'
import type { SavingContributionDraftState } from './useSavingContributionDraft'

interface UseSavingContributionConfirmationOptions {
  kind: ContributionKind
  draft: SavingContributionDraftState
  preview: SavingContributionPreviewResult | null
  catchUpMonth?: string
  isEdit: boolean
  initialContribution?: SavingContributionSummary | null
  hasEligibleGoals: boolean
  hasIncompleteInvestmentData: boolean
  setPreview: (preview: SavingContributionPreviewResult | null) => void
  setServerError: (message: string | null) => void
  setStaleMessage: (message: string | null) => void
  alertRef: RefObject<HTMLDivElement | null>
  onSuccess: () => void
}

function canConfirm(options: UseSavingContributionConfirmationOptions) {
  return Boolean(options.preview && options.hasEligibleGoals && !options.hasIncompleteInvestmentData)
}

function buildDraftPayload(draft: SavingContributionDraftState, kind: ContributionKind) {
  return {
    kind,
    currency: draft.currency,
    amount: draft.amount,
    ...(kind === 'saving' && draft.place ? { place: draft.place } : {}),
    arsSpent: draft.currency === 'USD' ? draft.arsSpent || null : null,
    effectiveRate: draft.currency === 'USD' ? draft.effectiveRate || null : null,
  }
}

async function updateContribution(
  options: UseSavingContributionConfirmationOptions,
  draftPayload: ReturnType<typeof buildDraftPayload>,
  onUpdated: () => Promise<void>,
) {
  await updateSavingContribution({
    data: { contributionId: options.initialContribution!.id, draft: draftPayload },
  })
  await onUpdated()
}

async function recordContribution(
  options: UseSavingContributionConfirmationOptions,
  draftPayload: ReturnType<typeof buildDraftPayload>,
  onRecorded: () => Promise<void>,
) {
  const result = await confirmSavingContribution({
    data: {
      draft: draftPayload,
      previewToken: options.preview!.previewToken,
      catchUpMonth: options.catchUpMonth,
    },
  })
  if (result.status === 'stale') {
    options.setPreview(result.preview)
    options.setStaleMessage('Tu Plan cambió. Revisá la distribución actualizada antes de confirmar.')
    setTimeout(() => options.alertRef.current?.focus(), 0)
    return false
  }
  await onRecorded()
  return true
}

function getSafeServerErrorMessage(error: any) {
  const message = error?.message
  if (message && !message.includes('{') && !message.includes('Zod')) {
    return message
  }
  return 'Ocurrió un error al guardar.'
}

export function useSavingContributionConfirmation(
  options: UseSavingContributionConfirmationOptions,
) {
  const router = useRouter()
  const posthog = usePostHog()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirm = async () => {
    if (!canConfirm(options)) return

    setIsSubmitting(true)
    options.setServerError(null)
    options.setStaleMessage(null)
    try {
      const draftPayload = buildDraftPayload(options.draft, options.kind)
      if (options.isEdit && options.initialContribution) {
        await updateContribution(options, draftPayload, async () => {
          posthog?.capture('contribution_corrected', { kind: options.kind, currency: options.draft.currency })
          await router.invalidate()
          toast.success(options.kind === 'investment' ? 'Inversión actualizada.' : 'Ahorro actualizado.')
        })
      } else {
        const completed = await recordContribution(options, draftPayload, async () => {
          posthog?.capture('contribution_recorded', {
            kind: options.kind,
            currency: options.draft.currency,
            period: options.catchUpMonth ? 'catch_up' : 'current',
          })
          await router.invalidate()
          toast.success(options.kind === 'investment' ? 'Inversión registrada.' : 'Ahorro registrado.')
        })
        if (!completed) return
      }
      options.onSuccess()
    } catch (error: any) {
      options.setServerError(getSafeServerErrorMessage(error))
      setTimeout(() => options.alertRef.current?.focus(), 0)
    } finally {
      setIsSubmitting(false)
    }
  }

  return { isSubmitting, handleConfirm }
}

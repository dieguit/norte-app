import '@tanstack/react-start/server-only'
import { getDraft, markDraftCtaClicked } from '@/features/onboarding/repository.server'

export async function getPublicReportServer(deviceId: string) {
  const draft = await getDraft(deviceId)
  return draft?.report
    ? { report: draft.report, ctaClickedOn: draft.ctaClickedOn }
    : null
}

export async function markPublicReportCtaClickedServer(deviceId: string) {
  const draft = await markDraftCtaClicked(deviceId)
  if (!draft?.report || !draft.ctaClickedOn) throw new Error('Report not found')
  return { ctaClickedOn: draft.ctaClickedOn }
}

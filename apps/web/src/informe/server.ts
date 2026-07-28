import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getDraft, markDraftCtaClicked } from '../onboarding/repository'

export const getPublicReport = createServerFn({ method: 'GET' })
  .validator((input: unknown) => z.object({ deviceId: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const draft = await getDraft(data.deviceId)
    return draft?.report
      ? { report: draft.report, ctaClickedOn: draft.ctaClickedOn }
      : null
  })

export const markPublicReportCtaClicked = createServerFn({ method: 'POST' })
  .validator((input: unknown) => z.object({ deviceId: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const draft = await markDraftCtaClicked(data.deviceId)
    if (!draft?.report || !draft.ctaClickedOn) throw new Error('Report not found')
    return { ctaClickedOn: draft.ctaClickedOn }
  })

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { filterAnswersForActiveSteps, saveDraftInput } from './definition'
import { getDraft, saveDraft } from './repository'

const getDraftInput = z.object({ deviceId: z.uuid() })

export const getOnboardingDraft = createServerFn({ method: 'GET' })
  .validator((input: unknown) => getDraftInput.parse(input))
  .handler(({ data }) => getDraft(data.deviceId))

export const saveOnboardingDraft = createServerFn({ method: 'POST' })
  .validator((input: unknown) => saveDraftInput.parse(input))
  .handler(({ data }) => saveDraft({
    ...data,
    answers: filterAnswersForActiveSteps(data.answers),
  }))

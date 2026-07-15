import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { filterAnswersForActiveSteps, saveDraftInput } from './definition'
import { getDraft, saveDraft } from './repository'
import { createUploadKey, isOwnedUploadKey, parseUploadRequest } from './uploads'
import { deleteUpload, signUpload } from './r2'

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

export const createOnboardingUpload = createServerFn({ method: 'POST' })
  .validator((input: unknown) => parseUploadRequest(input))
  .handler(async ({ data }) => {
    const key = createUploadKey(data.deviceId, data.fieldId)
    return { key, url: await signUpload(key, data.contentType) }
  })

export const deleteOnboardingUpload = createServerFn({ method: 'POST' })
  .validator((input: unknown) => z.object({ deviceId: z.uuid(), key: z.string() }).parse(input))
  .handler(async ({ data }) => {
    if (!isOwnedUploadKey(data.key, data.deviceId)) throw new Error('Invalid upload key.')
    await deleteUpload(data.key)
  })


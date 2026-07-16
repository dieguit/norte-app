import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { filterAnswersForActiveSteps, saveDraftInput } from './definition'
import { getDraft, saveDraft } from './repository'
import { createUploadKey, isOwnedUploadKey, parseUploadRequest } from './uploads'
import { deleteUpload, signUpload } from './r2'
import { getPostHogClient } from '../utils/posthog-server'

const getDraftInput = z.object({ deviceId: z.uuid() })

export const getOnboardingDraft = createServerFn({ method: 'GET' })
  .validator((input: unknown) => getDraftInput.parse(input))
  .handler(({ data }) => getDraft(data.deviceId))

export const saveOnboardingDraft = createServerFn({ method: 'POST' })
  .validator((input: unknown) => saveDraftInput.parse(input))
  .handler(async ({ data }) => {
    const result = await saveDraft({
      ...data,
      answers: filterAnswersForActiveSteps(data.answers),
    })
    try {
      const posthog = getPostHogClient()
      posthog.capture({
        distinctId: data.deviceId,
        event: 'onboarding_draft_saved',
        properties: {
          completed: data.completed,
        },
      })
      await posthog.flush().catch((err) => console.error('PostHog flush failed:', err))
    } catch (err) {
      console.error('PostHog capture failed:', err)
    }
    return result
  })

export const createOnboardingUpload = createServerFn({ method: 'POST' })
  .validator((input: unknown) => parseUploadRequest(input))
  .handler(async ({ data }) => {
    const key = createUploadKey(data.deviceId, data.fieldId)
    const url = await signUpload(key, data.contentType)
    try {
      const posthog = getPostHogClient()
      posthog.capture({
        distinctId: data.deviceId,
        event: 'onboarding_upload_created',
        properties: {
          field_id: data.fieldId,
          content_type: data.contentType,
        },
      })
      await posthog.flush().catch((err) => console.error('PostHog flush failed:', err))
    } catch (err) {
      console.error('PostHog capture failed:', err)
    }
    return { key, url }
  })

export const deleteOnboardingUpload = createServerFn({ method: 'POST' })
  .validator((input: unknown) => z.object({ deviceId: z.uuid(), key: z.string() }).parse(input))
  .handler(async ({ data }) => {
    if (!isOwnedUploadKey(data.key, data.deviceId)) throw new Error('Invalid upload key.')
    await deleteUpload(data.key)
  })


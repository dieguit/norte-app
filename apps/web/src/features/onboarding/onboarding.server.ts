import '@tanstack/react-start/server-only'
import { filterAnswersForActiveSteps, saveDraftInput } from './definition'
import { getDraft, saveDraft } from './repository.server'
import { createUploadKey, isOwnedUploadKey, parseUploadRequest } from './uploads'
import { deleteUpload, signUpload } from './r2.server'
import { getPostHogClient } from '../../utils/posthog-server'

export async function getOnboardingDraftServer(deviceId: string) {
  return getDraft(deviceId)
}

export async function saveOnboardingDraftServer(data: typeof saveDraftInput._output) {
  const result = await saveDraft({
    ...data,
    answers: filterAnswersForActiveSteps(data.answers),
  })
  try {
    const posthog = getPostHogClient()
    posthog.capture({
      distinctId: data.deviceId,
      event: 'onboarding_draft_saved',
      properties: { completed: data.completed },
    })
    await posthog.flush().catch((err) => console.error('PostHog flush failed:', err))
  } catch (err) {
    console.error('PostHog capture failed:', err)
  }
  return result
}

export async function createOnboardingUploadServer(data: ReturnType<typeof parseUploadRequest>) {
  const key = createUploadKey(data.deviceId, data.fieldId)
  const url = await signUpload(key, data.contentType)
  try {
    const posthog = getPostHogClient()
    posthog.capture({
      distinctId: data.deviceId,
      event: 'onboarding_upload_created',
      properties: { field_id: data.fieldId, content_type: data.contentType },
    })
    await posthog.flush().catch((err) => console.error('PostHog flush failed:', err))
  } catch (err) {
    console.error('PostHog capture failed:', err)
  }
  return { key, url }
}

export async function deleteOnboardingUploadServer(data: { deviceId: string; key: string }) {
  if (!isOwnedUploadKey(data.key, data.deviceId)) throw new Error('Invalid upload key.')
  await deleteUpload(data.key)
}

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { saveDraftInput } from './definition'
import { parseUploadRequest } from './uploads'
import {
  createOnboardingUploadServer,
  deleteOnboardingUploadServer,
  getOnboardingDraftServer,
  saveOnboardingDraftServer,
} from './onboarding.server'

const getDraftInput = z.object({ deviceId: z.uuid() })

export const getOnboardingDraft = createServerFn({ method: 'GET' })
  .validator((input: unknown) => getDraftInput.parse(input))
  .handler(({ data }) => getOnboardingDraftServer(data.deviceId))

export const saveOnboardingDraft = createServerFn({ method: 'POST' })
  .validator((input: unknown) => saveDraftInput.parse(input))
  .handler(({ data }) => saveOnboardingDraftServer(data))

export const createOnboardingUpload = createServerFn({ method: 'POST' })
  .validator((input: unknown) => parseUploadRequest(input))
  .handler(({ data }) => createOnboardingUploadServer(data))

export const deleteOnboardingUpload = createServerFn({ method: 'POST' })
  .validator((input: unknown) => z.object({ deviceId: z.uuid(), key: z.string() }).parse(input))
  .handler(({ data }) => deleteOnboardingUploadServer(data))

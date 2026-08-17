import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createOnboardingUploadServer,
  deleteOnboardingUploadServer,
  getOnboardingDraftServer,
  saveOnboardingDraftServer,
} from './onboarding.server'
import { getDraft, saveDraft } from './repository.server'
import { createUploadKey, isOwnedUploadKey } from './uploads'
import { deleteUpload, signUpload } from './r2.server'

const posthogCapture = vi.fn()
const posthogFlush = vi.fn().mockResolvedValue(undefined)

vi.mock('./repository.server', () => ({
  getDraft: vi.fn(),
  saveDraft: vi.fn(),
}))

vi.mock('./uploads', () => ({
  createUploadKey: vi.fn(),
  isOwnedUploadKey: vi.fn(),
}))

vi.mock('./r2.server', () => ({
  deleteUpload: vi.fn(),
  signUpload: vi.fn(),
}))

vi.mock('../../utils/posthog-server', () => ({
  getPostHogClient: vi.fn(() => ({ capture: posthogCapture, flush: posthogFlush })),
}))

describe('onboarding server handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    posthogFlush.mockResolvedValue(undefined)
  })

  it('delegates draft loading to the repository', async () => {
    const draft = { deviceId: 'device-1', answers: {}, completed: false }
    vi.mocked(getDraft).mockResolvedValue(draft as never)

    await expect(getOnboardingDraftServer('device-1')).resolves.toBe(draft)
    expect(getDraft).toHaveBeenCalledWith('device-1')
  })

  it('normalizes answers before saving the draft', async () => {
    const data = {
      deviceId: '123e4567-e89b-12d3-a456-426614174000',
      answers: {
        p15_tarjetas: 1,
        t1_cuotas_modo: 'Subir foto o archivo',
        t1_postcierre: 5000,
        t1_postcierre_cuotas: 'Sí',
        t1_postcierre_cuotas_cantidad: '3',
        t1_resumen_ars: 100,
      },
      completed: false,
    }
    const saved = { deviceId: data.deviceId, answers: data.answers, completed: false }
    vi.mocked(saveDraft).mockResolvedValue(saved as never)

    await expect(saveOnboardingDraftServer(data)).resolves.toBe(saved)
    expect(saveDraft).toHaveBeenCalledWith({
      ...data,
      answers: {
        p15_tarjetas: 1,
        t1_cuotas_modo: 'Subir foto o archivo',
        t1_postcierre: 5000,
        t1_postcierre_cuotas: 'Sí',
        t1_postcierre_cuotas_cantidad: '3',
      },
    })
  })

  it('creates an upload key and signs it', async () => {
    vi.mocked(createUploadKey).mockReturnValue('onboarding/device-1/t1_upload_url/file-id')
    vi.mocked(signUpload).mockResolvedValue('https://upload.example')

    await expect(createOnboardingUploadServer({
      deviceId: 'device-1',
      fieldId: 't1_upload_url',
      contentType: 'application/pdf',
      size: 100,
    })).resolves.toEqual({
      key: 'onboarding/device-1/t1_upload_url/file-id',
      url: 'https://upload.example',
    })
    expect(createUploadKey).toHaveBeenCalledWith('device-1', 't1_upload_url')
    expect(signUpload).toHaveBeenCalledWith('onboarding/device-1/t1_upload_url/file-id', 'application/pdf')
  })

  it('deletes an owned upload', async () => {
    vi.mocked(isOwnedUploadKey).mockReturnValue(true)

    await expect(deleteOnboardingUploadServer({
      deviceId: 'device-1',
      key: 'onboarding/device-1/t1_upload_url/file-id',
    })).resolves.toBeUndefined()
    expect(deleteUpload).toHaveBeenCalledWith('onboarding/device-1/t1_upload_url/file-id')
  })

  it('rejects and does not delete an unowned upload', async () => {
    vi.mocked(isOwnedUploadKey).mockReturnValue(false)

    await expect(deleteOnboardingUploadServer({ deviceId: 'device-1', key: 'invalid' }))
      .rejects.toThrow('Invalid upload key.')
    expect(deleteUpload).not.toHaveBeenCalled()
  })
})

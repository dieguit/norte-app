import { describe, expect, it } from 'vitest'
import { createUploadKey, getFileValidationError, parseUploadRequest, isOwnedUploadKey } from './uploads'

describe('onboarding uploads', () => {
  it('accepts a 5 MB PDF for a statement field', () => {
    expect(getFileValidationError({ type: 'application/pdf', size: 5 * 1024 * 1024 })).toBeNull()
    expect(parseUploadRequest({
      deviceId: '6f0a7482-29a0-4c03-a3e1-256add2f91a8',
      fieldId: 't1_upload_url',
      contentType: 'application/pdf',
      size: 5 * 1024 * 1024,
    }).fieldId).toBe('t1_upload_url')
  })

  it('rejects oversized files, unsupported MIME types, and unknown fields', () => {
    expect(getFileValidationError({ type: 'application/pdf', size: 5 * 1024 * 1024 + 1 })).toMatch(/5 MB/)
    expect(getFileValidationError({ type: 'image/gif', size: 1 })).toMatch(/PDF, JPEG o PNG/)
    expect(() => parseUploadRequest({
      deviceId: '6f0a7482-29a0-4c03-a3e1-256add2f91a8',
      fieldId: 'email',
      contentType: 'application/pdf',
      size: 1,
    })).toThrow()
  })

  it('creates an opaque key scoped to the device and allowed field', () => {
    expect(createUploadKey('6f0a7482-29a0-4c03-a3e1-256add2f91a8', 't1_upload_url')).toMatch(
      /^onboarding\/6f0a7482-29a0-4c03-a3e1-256add2f91a8\/t1_upload_url\/[0-9a-f-]+$/,
    )
  })

  it('only permits deleting a key owned by the current device', () => {
    const deviceId = '6f0a7482-29a0-4c03-a3e1-256add2f91a8'
    expect(isOwnedUploadKey(`onboarding/${deviceId}/t1_upload_url/2e68e7ee-9e4d-423d-97f1-78b6588d9d1a`, deviceId)).toBe(true)
    expect(isOwnedUploadKey(`onboarding/${deviceId.toUpperCase()}/T1_UPLOAD_URL/2E68E7EE-9E4D-423D-97F1-78B6588D9D1A`, deviceId)).toBe(true)
    expect(isOwnedUploadKey(`onboarding/${deviceId}/t1_postcierre_upload/2e68e7ee-9e4d-423d-97f1-78b6588d9d1a`, deviceId)).toBe(true)
    expect(isOwnedUploadKey('onboarding/other-device/t1_upload_url/2e68e7ee-9e4d-423d-97f1-78b6588d9d1a', deviceId)).toBe(false)
    expect(isOwnedUploadKey(`onboarding/${deviceId}/incomeRange/2e68e7ee-9e4d-423d-97f1-78b6588d9d1a`, deviceId)).toBe(false)
  })
})

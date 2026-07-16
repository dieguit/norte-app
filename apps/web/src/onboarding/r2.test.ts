import { describe, expect, it, vi, beforeEach } from 'vitest'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { signDownload } from './r2'

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(),
}))

describe('onboarding r2 downloads', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    process.env.R2_ACCOUNT_ID = 'mock-account-id'
    process.env.R2_BUCKET = 'mock-bucket'
    process.env.R2_ACCESS_KEY_ID = 'mock-access-key-id'
    process.env.R2_SECRET_ACCESS_KEY = 'mock-secret-access-key'
  })

  it('signs download URL with GetObjectCommand for the given key expiring in 300s', async () => {
    const key = 'onboarding/some-device/t1_upload_url/some-uuid'
    const mockUrl = 'https://mocked-signed-url.com/download'
    vi.mocked(getSignedUrl).mockResolvedValue(mockUrl)

    const result = await signDownload(key)

    expect(result).toBe(mockUrl)
    expect(getSignedUrl).toHaveBeenCalledTimes(1)
    
    const [_, commandArg, optionsArg] = vi.mocked(getSignedUrl).mock.calls[0]
    expect(commandArg).toBeInstanceOf(GetObjectCommand)
    expect(commandArg.input).toEqual({
      Bucket: 'mock-bucket',
      Key: key,
    })
    expect(optionsArg).toEqual({
      expiresIn: 300,
    })
  })
})

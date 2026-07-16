import { describe, expect, it, vi, beforeEach } from 'vitest'
import { requireAdminSession } from './auth'
import { useSession } from '@tanstack/react-start/server'

vi.mock('@tanstack/react-start/server', () => ({
  useSession: vi.fn(),
}))

describe('requireAdminSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resolves when session is authenticated', async () => {
    vi.mocked(useSession).mockResolvedValue({
      data: { authenticated: true },
      update: vi.fn(),
      clear: vi.fn(),
    } as any)

    await expect(requireAdminSession()).resolves.toBeUndefined()
  })

  it('rejects with Unauthorized when session is not authenticated', async () => {
    vi.mocked(useSession).mockResolvedValue({
      data: {},
      update: vi.fn(),
      clear: vi.fn(),
    } as any)

    await expect(requireAdminSession()).rejects.toThrow('Unauthorized')
  })
})

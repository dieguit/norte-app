import { beforeEach, describe, expect, it, vi } from 'vitest'
import { auth } from '@clerk/tanstack-react-start/server'
import { callFinancialApi } from '../financial/financial.server'
import { claimWhatsappLinkServer } from './whatsapp-link.server'

vi.mock('@clerk/tanstack-react-start/server', () => ({ auth: vi.fn() }))
vi.mock('../financial/financial.server', () => ({ callFinancialApi: vi.fn() }))

const token = 'a'.repeat(43)

describe('claimWhatsappLinkServer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_1' } as never)
  })

  it('redirects to sign-in and back to the link when signed out', async () => {
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: false, userId: null } as never)
    await expect(claimWhatsappLinkServer(token)).rejects.toMatchObject({
      options: expect.objectContaining({
        to: '/sign-in/$',
        search: { redirect_url: `/link/whatsapp?token=${token}` },
      }),
    })
    expect(callFinancialApi).not.toHaveBeenCalled()
  })

  it('encodes special characters in redirect_url token when signed out', async () => {
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: false, userId: null } as never)
    const specialToken = 'tok&en#123'
    await expect(claimWhatsappLinkServer(specialToken)).rejects.toMatchObject({
      options: expect.objectContaining({
        to: '/sign-in/$',
        search: {
          redirect_url: `/link/whatsapp?token=${encodeURIComponent(specialToken)}`,
        },
      }),
    })
  })

  it.each([
    [200, 'linked'],
    [400, 'invalid'],
    [404, 'invalid'],
    [410, 'expired'],
    [409, 'conflict'],
  ] as const)('maps API %i to %s', async (status, expected) => {
    vi.mocked(callFinancialApi).mockResolvedValue(new Response('{}', { status }))
    await expect(claimWhatsappLinkServer(token)).resolves.toBe(expected)
    expect(callFinancialApi).toHaveBeenCalledWith(`/whatsapp/links/${token}/claim`, { method: 'POST' })
  })

  it('throws on unexpected API failures', async () => {
    vi.mocked(callFinancialApi).mockResolvedValue(new Response('{}', { status: 500 }))
    await expect(claimWhatsappLinkServer(token)).rejects.toThrow()
  })
})

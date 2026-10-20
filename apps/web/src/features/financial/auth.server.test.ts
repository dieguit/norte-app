import { beforeEach, describe, expect, it, vi } from 'vitest'
import { auth } from '@clerk/tanstack-react-start/server'
import { requireFinancialUser } from './auth.server'
import { getFinancialAppState } from './financial.functions'

vi.mock('@tanstack/react-start', () => ({
  createServerFn: vi.fn().mockImplementation(() => {
    const fnObj = {
      validator: vi.fn().mockReturnThis(),
      handler: vi
        .fn()
        .mockImplementation((fn) => vi.fn(async (arg) => fn(arg))),
    }
    return fnObj
  }),
}))

vi.mock('@clerk/tanstack-react-start/server', () => ({
  auth: vi.fn(),
}))

describe('financial access boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  describe('requireFinancialUser', () => {
    it('redirects when user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue({
        isAuthenticated: false,
        userId: null,
      } as never)

      await expect(requireFinancialUser()).rejects.toMatchObject({
        options: expect.objectContaining({ to: '/sign-in/$' }),
      })
    })

    it('redirects when authenticated user has no userId', async () => {
      vi.mocked(auth).mockResolvedValue({
        isAuthenticated: true,
        userId: null,
      } as never)

      await expect(requireFinancialUser()).rejects.toMatchObject({
        options: expect.objectContaining({ to: '/sign-in/$' }),
      })
    })

    it('returns the userId when authenticated', async () => {
      vi.mocked(auth).mockResolvedValue({
        isAuthenticated: true,
        userId: 'user_1',
      } as never)

      await expect(requireFinancialUser()).resolves.toBe('user_1')
    })
  })

  describe('getFinancialAppState', () => {
    it('redirects an anonymous financial request to Clerk sign-in with its return URL', async () => {
      vi.mocked(auth).mockResolvedValue({
        isAuthenticated: false,
        userId: null,
      } as never)

      await expect(getFinancialAppState()).rejects.toMatchObject({
        options: expect.objectContaining({ to: '/sign-in/$' }),
      })
    })

    it('returns missing when the authenticated user has no profile', async () => {
      vi.mocked(auth).mockResolvedValue({
        isAuthenticated: true,
        userId: 'user_1',
        getToken: vi.fn().mockResolvedValue('session-token'),
      } as never)
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ profile: 'missing' }), { status: 200 }),
      )

      await expect(getFinancialAppState()).resolves.toEqual({
        profile: 'missing',
      })
      expect(fetch).toHaveBeenCalledWith(
        `${process.env.API_BASE_URL ?? 'http://localhost:3001'}/me/profile`,
        expect.objectContaining({
          headers: expect.any(Headers),
          cache: 'no-store',
        }),
      )
      expect(
        new Headers(vi.mocked(fetch).mock.calls[0][1]?.headers).get(
          'Authorization',
        ),
      ).toBe('Bearer session-token')
    })

    it('returns present with home state when the authenticated user owns a profile', async () => {
      const mockHome = {
        income: { amount: '500000.00', currency: 'ARS' as const },
        expensesKnowledge: 'known' as const,
        expenses: { amount: '250000.00', currency: 'ARS' as const },
        plannedContribution: { amount: '50000.00', currency: 'ARS' as const },
        goal: {
          type: 'emergency_fund' as const,
          name: 'Colchón financiero',
          targetAmount: { amount: '1500000.00', currency: 'ARS' as const },
          emergencyFundMonths: 6,
        },
        projectionState: 'available' as const,
      }

      vi.mocked(auth).mockResolvedValue({
        isAuthenticated: true,
        userId: 'user_1',
        getToken: vi.fn().mockResolvedValue('session-token'),
      } as never)
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ profile: 'present', home: mockHome }), {
          status: 200,
        }),
      )

      await expect(getFinancialAppState()).resolves.toEqual({
        profile: 'present',
        home: mockHome,
      })
      expect(fetch).toHaveBeenCalledOnce()
    })

    it('redirects to sign-in when the API rejects the session token', async () => {
      vi.mocked(auth).mockResolvedValue({
        isAuthenticated: true,
        userId: 'user_1',
        getToken: vi.fn().mockResolvedValue('expired-token'),
      } as never)
      vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 401 }))

      await expect(getFinancialAppState()).rejects.toMatchObject({
        options: expect.objectContaining({ to: '/sign-in/$' }),
      })
    })
  })
})

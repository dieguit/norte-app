import { beforeEach, describe, expect, it, vi } from 'vitest'
import { auth } from '@clerk/tanstack-react-start/server'
import { getFinancialAppState, requireFinancialUser } from './access'
import { getInitialHomeState } from './repository'

vi.mock('@tanstack/react-start', () => ({
  createServerFn: vi.fn().mockImplementation(() => ({
    handler: vi.fn().mockImplementation((fn) => vi.fn(async (arg) => fn(arg))),
  })),
}))

vi.mock('@clerk/tanstack-react-start/server', () => ({
  auth: vi.fn(),
}))

vi.mock('./repository', () => ({
  getInitialHomeState: vi.fn(),
}))

describe('financial access boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('requireFinancialUser', () => {
    it('redirects when user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue({ isAuthenticated: false, userId: null } as never)

      await expect(requireFinancialUser()).rejects.toMatchObject({
        options: expect.objectContaining({ to: '/sign-in/$' }),
      })
    })

    it('redirects when authenticated user has no userId', async () => {
      vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: null } as never)

      await expect(requireFinancialUser()).rejects.toMatchObject({
        options: expect.objectContaining({ to: '/sign-in/$' }),
      })
    })

    it('returns the userId when authenticated', async () => {
      vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_1' } as never)

      await expect(requireFinancialUser()).resolves.toBe('user_1')
    })
  })

  describe('getFinancialAppState', () => {
    it('redirects an anonymous financial request to Clerk sign-in with its return URL', async () => {
      vi.mocked(auth).mockResolvedValue({ isAuthenticated: false, userId: null } as never)

      await expect(getFinancialAppState()).rejects.toMatchObject({
        options: expect.objectContaining({ to: '/sign-in/$' }),
      })
    })

    it('returns missing when the authenticated user has no profile', async () => {
      vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_1' } as never)
      vi.mocked(getInitialHomeState).mockResolvedValue(null)

      await expect(getFinancialAppState()).resolves.toEqual({ profile: 'missing' })
      expect(getInitialHomeState).toHaveBeenCalledWith('user_1')
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

      vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_1' } as never)
      vi.mocked(getInitialHomeState).mockResolvedValue(mockHome as never)

      await expect(getFinancialAppState()).resolves.toEqual({
        profile: 'present',
        home: mockHome,
      })
      expect(getInitialHomeState).toHaveBeenCalledWith('user_1')
    })
  })
})

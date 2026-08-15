import { beforeEach, describe, expect, it, vi } from 'vitest'
import { auth } from '@clerk/tanstack-react-start/server'
import { db } from '../db/client'
import { getFinancialAppState, requireFinancialUser } from './access'

vi.mock('@tanstack/react-start', () => ({
  createServerFn: vi.fn().mockImplementation(() => ({
    handler: vi.fn().mockImplementation((fn) => vi.fn(async (arg) => fn(arg))),
  })),
}))

vi.mock('@clerk/tanstack-react-start/server', () => ({
  auth: vi.fn(),
}))

vi.mock('../db/client', () => ({
  db: {
    query: {
      financialProfiles: {
        findFirst: vi.fn(),
      },
    },
  },
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
      vi.mocked(db.query.financialProfiles.findFirst).mockResolvedValue(undefined as never)

      await expect(getFinancialAppState()).resolves.toEqual({ profile: 'missing' })
    })

    it('returns present when the authenticated user owns a profile', async () => {
      vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_1' } as never)
      vi.mocked(db.query.financialProfiles.findFirst).mockResolvedValue({ userId: 'user_1' } as never)

      await expect(getFinancialAppState()).resolves.toEqual({ profile: 'present' })
    })
  })
})

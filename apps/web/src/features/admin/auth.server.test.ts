import { describe, expect, it, vi, beforeEach } from 'vitest'
import { loginAdminServer, requireAdminSession } from './auth.server'
import { getIronSession } from 'iron-session'

vi.mock('iron-session', () => ({
  getIronSession: vi.fn(),
}))

vi.mock('@tanstack/react-start/server', () => ({
  getCookie: vi.fn(),
  setCookie: vi.fn(),
}))

describe('requireAdminSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resolves when session is authenticated', async () => {
    vi.mocked(getIronSession).mockResolvedValue({ authenticated: true } as any)

    await expect(requireAdminSession()).resolves.toBeUndefined()
  })

  it('rejects with Unauthorized when session is not authenticated', async () => {
    vi.mocked(getIronSession).mockResolvedValue({} as any)

    await expect(requireAdminSession()).rejects.toThrow('Unauthorized')
  })
})

describe('loginAdminServer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('saves an authenticated session for valid credentials', async () => {
    const session = { save: vi.fn() } as any
    vi.mocked(getIronSession).mockResolvedValue(session)

    await expect(loginAdminServer({ username: 'admin', password: 'N0rt3!' })).resolves.toEqual({ ok: true })
    expect(session.authenticated).toBe(true)
    expect(session.save).toHaveBeenCalled()
  })

  it('rejects invalid credentials without touching the session', async () => {
    await expect(loginAdminServer({ username: 'admin', password: 'nope' })).resolves.toEqual({ ok: false })
    expect(getIronSession).not.toHaveBeenCalled()
  })
})

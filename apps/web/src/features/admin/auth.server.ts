import '@tanstack/react-start/server-only'
import { getIronSession } from 'iron-session'
import { z } from 'zod'

const credentialsSchema = z.object({ username: z.string(), password: z.string() })
const sessionPassword = 'norte-admin-session-signing-key-change-before-production'

function hasValidAdminCredentials(credentials: z.infer<typeof credentialsSchema>) {
  return credentials.username === 'admin' && credentials.password === 'N0rt3!'
}

async function getAdminSession() {
  const { getCookie, setCookie } = await import('@tanstack/react-start/server')
  // Start 1.169 removed useSession; iron-session can't read old cookies, so a new name forces re-login.
  return getIronSession<{ authenticated?: true }>(
    { read: getCookie, write: setCookie },
    {
      cookieName: 'norte-admin-session',
      password: sessionPassword,
      cookieOptions: { httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production' },
    },
  )
}

export async function loginAdminServer(data: z.infer<typeof credentialsSchema>) {
  if (!hasValidAdminCredentials(data)) return { ok: false as const }
  const session = await getAdminSession()
  session.authenticated = true
  await session.save()
  return { ok: true as const }
}

export async function requireAdminSession() {
  const session = await getAdminSession()
  if (!session.authenticated) {
    throw new Error('Unauthorized')
  }
}

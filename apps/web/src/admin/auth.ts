import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const credentialsSchema = z.object({ username: z.string(), password: z.string() })
const sessionPassword = 'norte-admin-session-signing-key-change-before-production'

export function hasValidAdminCredentials(credentials: z.infer<typeof credentialsSchema>) {
  return credentials.username === 'admin' && credentials.password === 'N0rt3!'
}

async function useAdminSession() {
  const { useSession } = await import('@tanstack/react-start/server')
  return useSession<{ authenticated?: true }>({
    name: 'norte-admin',
    password: sessionPassword,
    cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' },
  })
}

export async function requireAdminSession() {
  const session = await useAdminSession()
  if (!session.data.authenticated) {
    throw new Error('Unauthorized')
  }
}

export const loginAdmin = createServerFn({ method: 'POST' })
  .validator((input: unknown) => credentialsSchema.parse(input))
  .handler(async ({ data }) => {
    if (!hasValidAdminCredentials(data)) return { ok: false as const }
    const session = await useAdminSession()
    await session.update({ authenticated: true })
    return { ok: true as const }
  })

export const getAdminSession = createServerFn({ method: 'GET' })
  .handler(async () => Boolean((await useAdminSession()).data.authenticated))


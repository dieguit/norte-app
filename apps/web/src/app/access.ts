import { auth } from '@clerk/tanstack-react-start/server'
import { redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { db } from '../db/client'

export async function requireFinancialUser() {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw redirect({ to: '/sign-in/$', params: { _splat: '' } })
  }
  return userId
}

export const getFinancialAppState = createServerFn({ method: 'GET' }).handler(async () => {
  const userId = await requireFinancialUser()
  const profile = await db.query.financialProfiles.findFirst({
    where: (profiles, { eq }) => eq(profiles.userId, userId),
    columns: { userId: true },
  })
  return { profile: profile ? 'present' : 'missing' } as const
})

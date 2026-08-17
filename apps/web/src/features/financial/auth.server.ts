import '@tanstack/react-start/server-only'
import { auth } from '@clerk/tanstack-react-start/server'
import { redirect } from '@tanstack/react-router'

export async function requireFinancialUser() {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw redirect({ to: '/sign-in/$', params: { _splat: '' } })
  }
  return userId
}

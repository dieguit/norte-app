import { auth } from '@clerk/tanstack-react-start/server'
import { redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getInitialHomeState, type InitialHomeState } from './financial.server'

export async function requireFinancialUser() {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw redirect({ to: '/sign-in/$', params: { _splat: '' } })
  }
  return userId
}

export type FinancialAppState =
  | { profile: 'missing' }
  | { profile: 'present'; home: InitialHomeState }

export const getFinancialAppState = createServerFn({ method: 'GET' }).handler(
  async (): Promise<FinancialAppState> => {
    const userId = await requireFinancialUser()
    const home = await getInitialHomeState(userId)
    if (!home) {
      return { profile: 'missing' }
    }
    return { profile: 'present', home }
  },
)

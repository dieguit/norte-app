import '@tanstack/react-start/server-only'
import { deriveInitialGoal, parseInitialPlan, type InitialHomeState } from './financial'
import { requireFinancialUser } from './auth.server'
import { getInitialHomeState, persistInitialPlan } from './repository.server'

export type FinancialAppState =
  | { profile: 'missing' }
  | { profile: 'present'; home: InitialHomeState }

export async function getFinancialAppStateServer(): Promise<FinancialAppState> {
  const userId = await requireFinancialUser()
  const home = await getInitialHomeState(userId)
  if (!home) {
    return { profile: 'missing' }
  }
  return { profile: 'present', home }
}

export async function completeInitialPlanServer(input: Parameters<typeof parseInitialPlan>[0]) {
  const userId = await requireFinancialUser()
  const plan = parseInitialPlan(input)
  const goal = deriveInitialGoal(plan)

  return persistInitialPlan(userId, plan, goal)
}

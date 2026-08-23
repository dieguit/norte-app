import '@tanstack/react-start/server-only'
import {
  deriveInitialChannel,
  deriveInitialGoal,
  parseInitialPlan,
  type InitialHomeState,
} from './financial'
import { requireFinancialUser } from './auth.server'
import { getExpensesWorkspaceState } from './expenses.repository.server'
import type { ExpensesWorkspace } from './expenses'
import { getIncomesWorkspaceState } from './incomes.repository.server'
import type { IncomesWorkspace } from './incomes'
import { getInitialHomeState, persistInitialPlan } from './repository.server'

export type FinancialAppState =
  | { profile: 'missing' }
  | { profile: 'present'; home: InitialHomeState }

export interface FinancesWorkspaceState {
  incomes: IncomesWorkspace
  expenses: ExpensesWorkspace
}

export async function getFinancialAppStateServer(): Promise<FinancialAppState> {
  const userId = await requireFinancialUser()
  const home = await getInitialHomeState(userId)
  if (!home) {
    return { profile: 'missing' }
  }
  return { profile: 'present', home }
}

export async function getFinancesWorkspaceServer(): Promise<FinancesWorkspaceState | null> {
  const userId = await requireFinancialUser()
  const [incomes, expenses] = await Promise.all([
    getIncomesWorkspaceState(userId),
    getExpensesWorkspaceState(userId),
  ])
  if (!incomes || !expenses) {
    return null
  }
  return { incomes, expenses }
}

export async function completeInitialPlanServer(input: Parameters<typeof parseInitialPlan>[0]) {
  const userId = await requireFinancialUser()
  const plan = parseInitialPlan(input)

  return persistInitialPlan(
    userId,
    plan,
    deriveInitialGoal(plan),
    deriveInitialChannel(plan, new Date()),
  )
}


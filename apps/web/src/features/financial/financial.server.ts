import '@tanstack/react-start/server-only'
import type { InitialHomeState } from './financial'
import { requireFinancialUser } from './auth.server'
import { getExpensesWorkspaceState } from './expenses.repository.server'
import type { ExpensesWorkspace } from './expenses'
import { getIncomesWorkspaceState } from './incomes.repository.server'
import type { IncomesWorkspace } from './incomes'
import {
  getGoalDedicationPercentage,
  getInitialHomeState,
  persistFinancialOnboarding,
} from './repository.server'
import { parseGoalCreationSubmission } from '../goals/goal-creation.schema'
import { getSavingsPlacesWorkspaceState } from '../savings-places/savings-places.repository.server'
import type { SavingsPlacesWorkspace } from '../savings-places/savings-places'
import type { CompleteFinancialOnboardingInput } from './financial.functions'

export type FinancialAppState =
  | { profile: 'missing' }
  | { profile: 'present'; home: InitialHomeState }

export interface FinancesWorkspaceState {
  goalDedicationPercentage: string
  incomes: IncomesWorkspace
  expenses: ExpensesWorkspace
  savings: SavingsPlacesWorkspace
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
  const [incomes, expenses, goalDedicationPercentage, savings] = await Promise.all([
    getIncomesWorkspaceState(userId),
    getExpensesWorkspaceState(userId),
    getGoalDedicationPercentage(userId),
    getSavingsPlacesWorkspaceState(userId),
  ])
  if (!incomes || !expenses || goalDedicationPercentage === null) {
    return null
  }
  return { goalDedicationPercentage, incomes, expenses, savings }
}

export async function completeFinancialOnboardingServer(
  input: CompleteFinancialOnboardingInput,
) {
  const userId = await requireFinancialUser()
  const currentMonth = new Date().toISOString().slice(0, 7)
  const goal = parseGoalCreationSubmission(input.goal, currentMonth)
  return persistFinancialOnboarding(userId, { ...input, goal }, currentMonth)
}


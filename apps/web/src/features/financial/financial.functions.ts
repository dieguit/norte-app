import { createServerFn } from '@tanstack/react-start'
import { FinancialOnboardingSchema, type FinancialOnboardingInput } from '@repo/shared-types'
import {
  completeFinancialOnboardingServer,
  getFinancialAppStateServer,
  getFinancesWorkspaceServer,
} from './financial.server'
import { getHomeRoadmapServer } from '../home/home.server'
import {
  createExpenseServer,
  deleteExpenseServer,
  updateExpenseServer,
} from './expenses.server'
import {
  createExpenseSchema,
  deleteExpenseSchema,
  updateExpenseSchema,
} from './expenses.schema'
import {
  createIncomeServer,
  deleteIncomeServer,
  updateIncomeServer,
} from './incomes.server'
import {
  createIncomeSchema,
  deleteIncomeSchema,
  updateIncomeSchema,
} from './incomes.schema'

export const getFinancialAppState = createServerFn({ method: 'GET' }).handler(getFinancialAppStateServer)

export const getFinancesWorkspace = createServerFn({ method: 'GET' })
  .validator((input: { month?: string } | undefined) => input ?? {})
  .handler(({ data }) => getFinancesWorkspaceServer(data?.month))

export const getHomeRoadmap = createServerFn({ method: 'GET' })
  .validator((input: { currentMonth?: string } | undefined) => input ?? {})
  .handler(({ data }) => getHomeRoadmapServer(data?.currentMonth))

export const createIncome = createServerFn({ method: 'POST' })
  .validator((input: unknown) => createIncomeSchema.parse(input))
  .handler(createIncomeServer)

export const updateIncome = createServerFn({ method: 'POST' })
  .validator((input: unknown) => updateIncomeSchema.parse(input))
  .handler(updateIncomeServer)

export const deleteIncome = createServerFn({ method: 'POST' })
  .validator((input: unknown) => deleteIncomeSchema.parse(input))
  .handler(deleteIncomeServer)

export const createExpense = createServerFn({ method: 'POST' })
  .validator((input: unknown) => createExpenseSchema.parse(input))
  .handler(createExpenseServer)

export const updateExpense = createServerFn({ method: 'POST' })
  .validator((input: unknown) => updateExpenseSchema.parse(input))
  .handler(updateExpenseServer)

export const deleteExpense = createServerFn({ method: 'POST' })
  .validator((input: unknown) => deleteExpenseSchema.parse(input))
  .handler(deleteExpenseServer)

export type CompleteFinancialOnboardingInput = FinancialOnboardingInput

export const completeFinancialOnboarding = createServerFn({ method: 'POST' })
  .validator((input: unknown) => FinancialOnboardingSchema.parse(input))
  .handler(({ data }) => completeFinancialOnboardingServer(data))

import { z } from 'zod'
import { createServerFn } from '@tanstack/react-start'
import { goalCreationDraftSchema } from '../goals/goal-creation.schema'
import {
  completeFinancialOnboardingServer,
  getFinancialAppStateServer,
  getFinancesWorkspaceServer,
} from './financial.server'
import {
  createExpenseServer,
  deleteExpenseServer,
  updateExpenseServer,
} from './expenses.server'
import {
  createExpenseSchema,
  deleteExpenseSchema,
  expenseDraftSchema,
  updateExpenseSchema,
} from './expenses.schema'
import {
  createIncomeServer,
  deleteIncomeServer,
  getIncomesWorkspaceServer,
  updateIncomeServer,
} from './incomes.server'
import {
  createIncomeSchema,
  deleteIncomeSchema,
  incomeDraftSchema,
  updateIncomeSchema,
} from './incomes.schema'

export const getFinancialAppState = createServerFn({ method: 'GET' }).handler(getFinancialAppStateServer)

export const getIncomesWorkspace = createServerFn({ method: 'GET' }).handler(getIncomesWorkspaceServer)

export const getFinancesWorkspace = createServerFn({ method: 'GET' }).handler(getFinancesWorkspaceServer)

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

export const completeFinancialOnboardingInputSchema = z.object({
  goal: goalCreationDraftSchema,
  incomes: z.array(incomeDraftSchema).min(1, 'Agregá al menos un ingreso recurrente.'),
  expenses: z.array(expenseDraftSchema).min(1, 'Agregá al menos un gasto recurrente.'),
}).superRefine((input, context) => {
  if (input.incomes.some((income) => !income.recurring)) {
    context.addIssue({ code: 'custom', path: ['incomes'], message: 'Los ingresos deben ser recurrentes.' })
  }
  if (input.expenses.some((expense) => !expense.recurring)) {
    context.addIssue({ code: 'custom', path: ['expenses'], message: 'Los gastos deben ser recurrentes.' })
  }
})

export type CompleteFinancialOnboardingInput = z.infer<
  typeof completeFinancialOnboardingInputSchema
>

export const completeFinancialOnboarding = createServerFn({ method: 'POST' })
  .validator((input: unknown) => completeFinancialOnboardingInputSchema.parse(input))
  .handler(({ data }) => completeFinancialOnboardingServer(data))


import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { completeInitialPlanServer, getFinancialAppStateServer } from './financial.server'
import {
  createIncomeServer,
  deleteIncomeServer,
  getIncomesWorkspaceServer,
  updateIncomeServer,
} from './incomes.server'
import { createIncomeSchema, deleteIncomeSchema, updateIncomeSchema } from './incomes.schema'

export const initialPlanInputSchema = z.object({
  goalKind: z.string(),
  income: z.string(),
  expensesKnowledge: z.string(),
  expenses: z.string().optional(),
  plannedContribution: z.string(),
  fixedTarget: z.string().optional(),
})

export type InitialPlanRawInput = z.infer<typeof initialPlanInputSchema>

export const getFinancialAppState = createServerFn({ method: 'GET' }).handler(getFinancialAppStateServer)

export const completeInitialPlan = createServerFn({ method: 'POST' })
  .validator((input: unknown) => initialPlanInputSchema.parse(input))
  .handler(({ data }) => completeInitialPlanServer(data))

export const getIncomesWorkspace = createServerFn({ method: 'GET' }).handler(getIncomesWorkspaceServer)

export const createIncome = createServerFn({ method: 'POST' })
  .validator((input: unknown) => createIncomeSchema.parse(input))
  .handler(createIncomeServer)

export const updateIncome = createServerFn({ method: 'POST' })
  .validator((input: unknown) => updateIncomeSchema.parse(input))
  .handler(updateIncomeServer)

export const deleteIncome = createServerFn({ method: 'POST' })
  .validator((input: unknown) => deleteIncomeSchema.parse(input))
  .handler(deleteIncomeServer)

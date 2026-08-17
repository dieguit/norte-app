import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { completeInitialPlanServer, getFinancialAppStateServer } from './financial.server'

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

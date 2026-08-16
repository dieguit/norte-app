import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireFinancialUser } from './access'
import { deriveInitialGoal, parseInitialPlan } from './financial'
import { persistInitialPlan } from './repository'

export const initialPlanInputSchema = z.object({
  goalKind: z.string(),
  income: z.string(),
  expensesKnowledge: z.string(),
  expenses: z.string().optional(),
  plannedContribution: z.string(),
  fixedTarget: z.string().optional(),
})

export type InitialPlanRawInput = z.infer<typeof initialPlanInputSchema>

export const completeInitialPlan = createServerFn({ method: 'POST' })
  .validator((input: unknown) => initialPlanInputSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireFinancialUser()
    const plan = parseInitialPlan(data)
    const goal = deriveInitialGoal(plan)

    return persistInitialPlan(userId, plan, goal)
  })

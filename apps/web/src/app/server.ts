import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db } from '../db/client'
import { financialGoals, financialProfiles } from '../db/schema'
import { createMoney, type Money } from '../lib/money'
import { requireFinancialUser } from './access'
import { deriveInitialGoal, parseInitialPlan } from './financial'

export const initialPlanInputSchema = z.object({
  goalKind: z.string(),
  income: z.string(),
  expensesKnowledge: z.string(),
  expenses: z.string().optional(),
  plannedContribution: z.string(),
  fixedTarget: z.string().optional(),
})

export type InitialPlanRawInput = z.infer<typeof initialPlanInputSchema>

export interface InitialHomeState {
  income: Money
  expensesKnowledge: 'known' | 'unknown'
  expenses?: Money
  plannedContribution: Money
  goal: {
    type: string
    name: string
    targetAmount?: Money
    emergencyFundMonths?: number
  }
  projectionState: 'available' | 'unknown_expenses'
}

export const completeInitialPlan = createServerFn({ method: 'POST' })
  .validator((input: unknown) => initialPlanInputSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireFinancialUser()
    const plan = parseInitialPlan(data)
    const goal = deriveInitialGoal(plan)

    return db.transaction(async (tx) => {
      await tx
        .insert(financialProfiles)
        .values({
          userId,
          baseCurrency: 'ARS',
          approximateMonthlyIncome: plan.income.amount,
          approximateMonthlyExpenses: plan.expenses?.amount ?? null,
          expensesKnowledge: plan.expensesKnowledge,
          plannedMonthlyContribution: plan.plannedContribution.amount,
          onboardingCompleted: true,
        })
        .onConflictDoUpdate({
          target: financialProfiles.userId,
          set: {
            approximateMonthlyIncome: plan.income.amount,
            approximateMonthlyExpenses: plan.expenses?.amount ?? null,
            expensesKnowledge: plan.expensesKnowledge,
            plannedMonthlyContribution: plan.plannedContribution.amount,
            onboardingCompleted: true,
          },
        })

      const [insertedGoal] = await tx
        .insert(financialGoals)
        .values({
          userId,
          name: goal.name,
          type: goal.type,
          targetAmount: goal.targetAmount?.amount ?? null,
          currency: goal.targetAmount?.currency ?? 'ARS',
          emergencyFundMonths: goal.emergencyFundMonths ?? null,
        })
        .returning()

      return { goal: insertedGoal }
    })
  })

export async function getInitialHomeState(userId: string): Promise<InitialHomeState | null> {
  const profile = await db.query.financialProfiles.findFirst({
    where: (profiles, { eq }) => eq(profiles.userId, userId),
  })

  if (!profile) {
    return null
  }

  const firstGoal = await db.query.financialGoals.findFirst({
    where: (goals, { eq }) => eq(goals.userId, userId),
  })

  const expensesKnowledge = profile.expensesKnowledge === 'known' ? 'known' : 'unknown'
  const goalType = firstGoal?.type ?? 'emergency_fund'

  const projectionState =
    expensesKnowledge === 'unknown' && goalType === 'emergency_fund'
      ? 'unknown_expenses'
      : 'available'

  return {
    income: createMoney(profile.approximateMonthlyIncome, 'ARS'),
    expensesKnowledge,
    expenses: profile.approximateMonthlyExpenses
      ? createMoney(profile.approximateMonthlyExpenses, 'ARS')
      : undefined,
    plannedContribution: createMoney(profile.plannedMonthlyContribution, 'ARS'),
    goal: {
      type: goalType,
      name: firstGoal?.name ?? 'Colchón financiero',
      targetAmount: firstGoal?.targetAmount
        ? createMoney(firstGoal.targetAmount, (firstGoal.currency as 'ARS' | 'USD') ?? 'ARS')
        : undefined,
      emergencyFundMonths: firstGoal?.emergencyFundMonths ?? undefined,
    },
    projectionState,
  }
}

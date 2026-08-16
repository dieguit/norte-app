import '@tanstack/react-start/server-only'
import { db } from '../db/client'
import { financialGoals, financialProfiles } from '../db/schema'
import { createMoney } from '../lib/money'
import type { InitialHomeState, InitialPlan, DerivedInitialGoal } from './financial'

export async function persistInitialPlan(
  userId: string,
  plan: InitialPlan,
  goal: DerivedInitialGoal,
) {
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
}

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

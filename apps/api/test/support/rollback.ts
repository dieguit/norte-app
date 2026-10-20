import { and, eq } from 'drizzle-orm'
import type { Database } from '../../src/database/database.types'
import {
  allocationPlanEntries,
  allocationPlanSnapshots,
  financialGoals,
  financialProfiles,
} from '../../src/profile/profile.schema'

export async function seedProfileWithTwoGoals(
  outerTx: any,
  userId: string,
  currentMonth: string,
) {
  await outerTx.insert(financialProfiles).values({
    userId,
    baseCurrency: 'ARS',
    expensesKnowledge: 'known',
    plannedMonthlyContribution: '100.00',
    onboardingCompleted: true,
  })
  const [target, other] = await outerTx.insert(financialGoals).values([
    { userId, name: 'Target', type: 'purchase', targetAmount: '500.00', currency: 'ARS', priority: 'medium', strategy: 'save', status: 'active' },
    { userId, name: 'Other', type: 'purchase', targetAmount: '500.00', currency: 'ARS', priority: 'medium', strategy: 'save', status: 'active' },
  ]).returning({ id: financialGoals.id })
  const [snapshot] = await outerTx.insert(allocationPlanSnapshots).values({
    userId,
    effectiveMonth: `${currentMonth}-01`,
    plannedMonthlyContribution: '100.00',
  }).returning({ id: allocationPlanSnapshots.id })
  await outerTx.insert(allocationPlanEntries).values([
    { snapshotId: snapshot.id, goalId: target.id, percentage: '60.00' },
    { snapshotId: snapshot.id, goalId: other.id, percentage: '40.00' },
  ])
  return { target, other, snapshot }
}

export async function seedProfileWithSingleGoal(
  outerTx: any,
  userId: string,
  currentMonth: string,
  goalValues: typeof financialGoals.$inferInsert,
) {
  await outerTx.insert(financialProfiles).values({
    userId,
    baseCurrency: 'ARS',
    expensesKnowledge: 'known',
    plannedMonthlyContribution: '600.00',
    onboardingCompleted: true,
  })
  const [goal] = await outerTx.insert(financialGoals).values(goalValues).returning({ id: financialGoals.id })
  const [snapshot] = await outerTx.insert(allocationPlanSnapshots).values({
    userId,
    effectiveMonth: `${currentMonth}-01`,
    plannedMonthlyContribution: '600.00',
  }).returning({ id: allocationPlanSnapshots.id })
  await outerTx.insert(allocationPlanEntries).values({ snapshotId: snapshot.id, goalId: goal.id, percentage: '100.00' })
  return { goal, snapshot }
}

export async function selectGoalAndPlanState(
  outerTx: any,
  goalId: string,
  userId: string,
  snapshotId: string,
) {
  const [goalAfter] = await outerTx.select({ status: financialGoals.status }).from(financialGoals)
    .where(and(eq(financialGoals.id, goalId), eq(financialGoals.userId, userId)))
  const [snapshotAfter] = await outerTx.select({ plannedMonthlyContribution: allocationPlanSnapshots.plannedMonthlyContribution })
    .from(allocationPlanSnapshots).where(eq(allocationPlanSnapshots.id, snapshotId))
  const planAfter = await outerTx.select({ goalId: allocationPlanEntries.goalId, percentage: allocationPlanEntries.percentage })
    .from(allocationPlanEntries).where(eq(allocationPlanEntries.snapshotId, snapshotId))
  return { goalAfter, snapshotAfter, planAfter }
}

function createProxyDb(
  outerTx: any,
  interceptor: (targetTx: any, property: string | symbol) => any,
): Database {
  return {
    query: outerTx.query,
    transaction: (callback: (tx: any) => Promise<unknown>) => outerTx.transaction((tx: any) => {
      const executor = new Proxy(tx, {
        get(targetTx, property) {
          const custom = interceptor(targetTx, property)
          if (custom !== undefined) return custom
          const value = Reflect.get(targetTx, property, targetTx)
          return typeof value === 'function' ? value.bind(targetTx) : value
        },
      })
      return callback(executor)
    }),
  } as unknown as Database
}

function interceptGoalUpdate(
  targetTx: any,
  table: any,
  onCommitted: () => void,
) {
  const builder = targetTx.update(table)
  if (table !== financialGoals) return builder
  return {
    set: (values: any) => {
      const query = builder.set(values)
      return {
        where: (condition: any) => {
          const chain = query.where(condition)
          return {
            then: (resolve: any, reject: any) => chain.then((res: any) => {
              onCommitted()
              return resolve(res)
            }, reject),
            returning: async (fields: any) => {
              const rows = await chain.returning(fields)
              onCommitted()
              return rows
            },
          }
        },
      }
    },
  }
}

export function createFailingInsertDb(
  outerTx: any,
  failTable: any,
  errorMessage: string,
  onAttempt?: () => void,
): Database {
  return createProxyDb(outerTx, (targetTx, property) => {
    if (property === 'insert') {
      return (table: any) => {
        if (table === failTable) {
          return {
            values: async () => {
              onAttempt?.()
              throw new Error(errorMessage)
            },
          }
        }
        return targetTx.insert(table)
      }
    }
  })
}

export function createGoalRollbackDb(
  outerTx: any,
  onGoalUpdate: () => void,
  handleInsert: (table: any, targetTx: any) => any,
): Database {
  return createProxyDb(outerTx, (targetTx, property) => {
    if (property === 'update') {
      return (table: any) => interceptGoalUpdate(targetTx, table, onGoalUpdate)
    }
    if (property === 'insert') {
      return (table: any) => handleInsert(table, targetTx)
    }
  })
}

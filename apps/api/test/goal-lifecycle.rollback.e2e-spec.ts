import { randomUUID } from 'node:crypto'
import { drizzle } from 'drizzle-orm/node-postgres'
import { and, eq } from 'drizzle-orm'
import { Pool } from 'pg'
import { afterAll, describe, expect, it } from 'vitest'
import { confirmGoalLifecycleInRepository, createGoalLifecyclePreviewToken, getGoalLifecycleState } from '../src/goals/goal-creation.repository'
import { schema } from '../src/database/schema'
import type { Database } from '../src/database/database.types'
import { allocationPlanEntries, allocationPlanSnapshots, financialGoals, financialProfiles } from '../src/profile/profile.schema'

const databaseUrl = process.env.DATABASE_URL
const safeDatabaseUrl = databaseUrl && new URL(databaseUrl).pathname.replace(/^\//, '') === 'norte_test'
if (databaseUrl && !safeDatabaseUrl) throw new Error('Lifecycle rollback integration test only permits DATABASE_URL pathname norte_test')

const describeWhenSafe = safeDatabaseUrl ? describe : describe.skip

describeWhenSafe('goal lifecycle real database rollback', () => {
  const pool = new Pool({ connectionString: databaseUrl })

  afterAll(async () => pool.end())

  it('rolls back the real goal status and plan rows after a plan-write failure', async () => {
    const db = drizzle(pool, { schema })
    const userId = `task10-${randomUUID()}`
    const currentMonth = '2026-08'

    const rollback = new Error('always rollback lifecycle integration fixtures')
    await expect(db.transaction(async (outerTx) => {
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

      const state = await getGoalLifecycleState(outerTx as unknown as Database, userId, currentMonth)
      const previewToken = createGoalLifecyclePreviewToken('pause', target.id, state!, currentMonth)
      let goalUpdateCommittedInSavepoint = false

      const repositoryDb = {
        query: outerTx.query,
        transaction: (callback: (tx: any) => Promise<unknown>) => outerTx.transaction((tx) => {
          const executor = new Proxy(tx, {
            get(targetTx, property) {
              if (property === 'update') return (table: any) => {
                const builder = targetTx.update(table)
                if (table !== financialGoals) return builder
                return { set: (values: any) => {
                  const query = builder.set(values)
                  return { where: async (condition: any) => {
                    const result = await query.where(condition)
                    goalUpdateCommittedInSavepoint = true
                    return result
                  } }
                } }
              }
              if (property === 'insert') return (table: any) => {
                if (table === allocationPlanEntries) return {
                  values: async () => {
                    expect(goalUpdateCommittedInSavepoint).toBe(true)
                    throw new Error('injected lifecycle plan-write failure')
                  },
                }
                return targetTx.insert(table)
              }
              const value = Reflect.get(targetTx, property, targetTx)
              return typeof value === 'function' ? value.bind(targetTx) : value
            },
          })
          return callback(executor)
        }),
      } as unknown as Database

      await expect(confirmGoalLifecycleInRepository(repositoryDb, {
        userId,
        goalId: target.id,
        lifecycle: 'pause',
        currentMonth,
        previewToken,
      })).rejects.toThrow('injected lifecycle plan-write failure')
      expect(goalUpdateCommittedInSavepoint).toBe(true)

      const [goalAfter] = await outerTx.select({ status: financialGoals.status }).from(financialGoals)
        .where(and(eq(financialGoals.id, target.id), eq(financialGoals.userId, userId)))
      const [snapshotAfter] = await outerTx.select({ plannedMonthlyContribution: allocationPlanSnapshots.plannedMonthlyContribution })
        .from(allocationPlanSnapshots).where(eq(allocationPlanSnapshots.id, snapshot.id))
      const planAfter = await outerTx.select({ goalId: allocationPlanEntries.goalId, percentage: allocationPlanEntries.percentage })
        .from(allocationPlanEntries).where(eq(allocationPlanEntries.snapshotId, snapshot.id))
      expect(goalAfter.status).toBe('active')
      expect(snapshotAfter.plannedMonthlyContribution).toBe('100.00')
      expect(planAfter).toHaveLength(2)
      expect(planAfter).toEqual(expect.arrayContaining([
        { goalId: target.id, percentage: '60.00' },
        { goalId: other.id, percentage: '40.00' },
      ]))
      throw rollback
    })).rejects.toBe(rollback)
  })
})

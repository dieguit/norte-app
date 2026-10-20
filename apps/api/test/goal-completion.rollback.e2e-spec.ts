import { randomUUID } from 'node:crypto'
import { drizzle } from 'drizzle-orm/node-postgres'
import { and, eq } from 'drizzle-orm'
import { Pool } from 'pg'
import { afterAll, describe, expect, it } from 'vitest'
import { confirmGoalCompletionInRepository, createGoalCompletionPreviewToken, getGoalCompletionState } from '../src/goals/goal-creation.repository'
import { schema } from '../src/database/schema'
import type { Database } from '../src/database/database.types'
import { allocationPlanEntries, allocationPlanSnapshots, financialGoals, financialProfiles, goalCompletionWithdrawals, goalSavingsPositions, savingContributions, savingsPlaces } from '../src/profile/profile.schema'

const databaseUrl = process.env.DATABASE_URL
const safeDatabaseUrl = databaseUrl && new URL(databaseUrl).pathname.replace(/^\//, '') === 'norte_test'
if (databaseUrl && !safeDatabaseUrl) throw new Error('Completion rollback integration test only permits DATABASE_URL pathname norte_test')

const describeWhenSafe = safeDatabaseUrl ? describe : describe.skip

describeWhenSafe('goal completion real database rollback', () => {
  const pool = new Pool({ connectionString: databaseUrl })

  afterAll(async () => pool.end())

  it('rolls back the real withdrawals, goal status, and plan rows after a plan-write failure', async () => {
    const db = drizzle(pool, { schema })
    const userId = `task11-${randomUUID()}`
    const currentMonth = '2026-08'

    const rollback = new Error('always rollback completion integration fixtures')
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
      await outerTx.insert(goalSavingsPositions).values({ goalId: target.id, amount: '500.00', currency: 'ARS' })
      const [place] = await outerTx.insert(savingsPlaces).values({ userId, name: 'Banco', normalizedName: 'banco' }).returning({ id: savingsPlaces.id })
      await outerTx.insert(savingContributions).values({ id: randomUUID(), userId, amount: '500.00', currency: 'ARS', placeId: place.id, createdAt: new Date() })
      const [snapshot] = await outerTx.insert(allocationPlanSnapshots).values({
        userId,
        effectiveMonth: `${currentMonth}-01`,
        plannedMonthlyContribution: '100.00',
      }).returning({ id: allocationPlanSnapshots.id })
      await outerTx.insert(allocationPlanEntries).values([
        { snapshotId: snapshot.id, goalId: target.id, percentage: '60.00' },
        { snapshotId: snapshot.id, goalId: other.id, percentage: '40.00' },
      ])

      const draft = {
        goalId: target.id,
        withdrawals: [{ placeId: place.id, amount: '500.00' }],
        allocations: [{ goalId: other.id, percentage: '100.00' }],
      }
      const state = await getGoalCompletionState(outerTx as unknown as Database, userId, currentMonth, target.id)
      const previewToken = createGoalCompletionPreviewToken(state!, currentMonth, draft)
      let withdrawalCommittedInSavepoint = false
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
                  return { where: (condition: any) => {
                    const chain = query.where(condition)
                    return { returning: async (fields: any) => {
                      const rows = await chain.returning(fields)
                      goalUpdateCommittedInSavepoint = true
                      return rows
                    } }
                  } }
                } }
              }
              if (property === 'insert') return (table: any) => {
                if (table === goalCompletionWithdrawals) return {
                  values: async (values: any) => {
                    const result = await targetTx.insert(table).values(values)
                    withdrawalCommittedInSavepoint = true
                    return result
                  },
                }
                if (table === allocationPlanEntries) return {
                  values: async () => {
                    expect(withdrawalCommittedInSavepoint).toBe(true)
                    expect(goalUpdateCommittedInSavepoint).toBe(true)
                    throw new Error('injected completion plan-write failure')
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

      await expect(confirmGoalCompletionInRepository(repositoryDb, {
        userId,
        currentMonth,
        draft,
        previewToken,
      })).rejects.toThrow('injected completion plan-write failure')
      expect(withdrawalCommittedInSavepoint).toBe(true)
      expect(goalUpdateCommittedInSavepoint).toBe(true)

      const [goalAfter] = await outerTx.select({ status: financialGoals.status }).from(financialGoals)
        .where(and(eq(financialGoals.id, target.id), eq(financialGoals.userId, userId)))
      const withdrawalsAfter = await outerTx.select({ id: goalCompletionWithdrawals.id }).from(goalCompletionWithdrawals)
        .where(eq(goalCompletionWithdrawals.goalId, target.id))
      const [snapshotAfter] = await outerTx.select({ plannedMonthlyContribution: allocationPlanSnapshots.plannedMonthlyContribution })
        .from(allocationPlanSnapshots).where(eq(allocationPlanSnapshots.id, snapshot.id))
      const planAfter = await outerTx.select({ goalId: allocationPlanEntries.goalId, percentage: allocationPlanEntries.percentage })
        .from(allocationPlanEntries).where(eq(allocationPlanEntries.snapshotId, snapshot.id))
      expect(goalAfter.status).toBe('active')
      expect(withdrawalsAfter).toEqual([])
      expect(snapshotAfter.plannedMonthlyContribution).toBe('100.00')
      expect(planAfter).toEqual([
        { goalId: target.id, percentage: '60.00' },
        { goalId: other.id, percentage: '40.00' },
      ])
      throw rollback
    })).rejects.toBe(rollback)
  })
})

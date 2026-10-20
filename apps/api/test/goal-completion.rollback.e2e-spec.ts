import { randomUUID } from 'node:crypto'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import { Pool } from 'pg'
import { afterAll, describe, expect, it } from 'vitest'
import { confirmGoalCompletionInRepository, createGoalCompletionPreviewToken, getGoalCompletionState } from '../src/goals/goal-creation.repository'
import { schema } from '../src/database/schema'
import type { Database } from '../src/database/database.types'
import { allocationPlanEntries, goalCompletionWithdrawals, goalSavingsPositions, savingContributions, savingsPlaces } from '../src/profile/profile.schema'
import {
  createGoalRollbackDb,
  seedProfileWithTwoGoals,
  selectGoalAndPlanState,
} from './support/rollback'

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
      const { target, other, snapshot } = await seedProfileWithTwoGoals(outerTx, userId, currentMonth)
      await outerTx.insert(goalSavingsPositions).values({ goalId: target.id, amount: '500.00', currency: 'ARS' })
      const [place] = await outerTx.insert(savingsPlaces).values({ userId, name: 'Banco', normalizedName: 'banco' }).returning({ id: savingsPlaces.id })
      await outerTx.insert(savingContributions).values({ id: randomUUID(), userId, amount: '500.00', currency: 'ARS', placeId: place.id, createdAt: new Date() })

      const draft = {
        goalId: target.id,
        withdrawals: [{ placeId: place.id, amount: '500.00' }],
        allocations: [{ goalId: other.id, percentage: '100.00' }],
      }
      const state = await getGoalCompletionState(outerTx as unknown as Database, userId, currentMonth, target.id)
      const previewToken = createGoalCompletionPreviewToken(state!, currentMonth, draft)
      let withdrawalCommittedInSavepoint = false
      let goalUpdateCommittedInSavepoint = false

      const repositoryDb = createGoalRollbackDb(
        outerTx,
        () => { goalUpdateCommittedInSavepoint = true },
        (table, targetTx) => {
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
        },
      )

      await expect(confirmGoalCompletionInRepository(repositoryDb, {
        userId,
        currentMonth,
        draft,
        previewToken,
      })).rejects.toThrow('injected completion plan-write failure')
      expect(withdrawalCommittedInSavepoint).toBe(true)
      expect(goalUpdateCommittedInSavepoint).toBe(true)

      const { goalAfter, snapshotAfter, planAfter } = await selectGoalAndPlanState(outerTx, target.id, userId, snapshot.id)
      const withdrawalsAfter = await outerTx.select({ id: goalCompletionWithdrawals.id }).from(goalCompletionWithdrawals)
        .where(eq(goalCompletionWithdrawals.goalId, target.id))
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

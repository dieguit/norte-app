import { randomUUID } from 'node:crypto'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import { Pool } from 'pg'
import { afterAll, describe, expect, it } from 'vitest'
import {
  createSavingContributionInRepository,
  createSavingContributionPreviewToken,
  getSavingContributionState,
} from '../src/contributions/saving-contribution.repository'
import { schema } from '../src/database/schema'
import type { Database } from '../src/database/database.types'
import { allocationPlanEntries, allocationPlanSnapshots, financialGoals, financialProfiles, goalInvestmentPositions, goalSavingsPositions, investmentContributionAllocations, investmentContributions, savingContributionAllocations, savingContributions, savingsPlaces } from '../src/profile/profile.schema'

const databaseUrl = process.env.DATABASE_URL
const safeDatabaseUrl = databaseUrl && new URL(databaseUrl).pathname.replace(/^\//, '') === 'norte_test'
if (databaseUrl && !safeDatabaseUrl) throw new Error('Saving contribution rollback integration test only permits DATABASE_URL pathname norte_test')

const describeWhenSafe = safeDatabaseUrl ? describe : describe.skip

describeWhenSafe('saving contribution real database rollback', () => {
  const pool = new Pool({ connectionString: databaseUrl })

  afterAll(async () => pool.end())

  it('rolls back the real contribution, positions, and allocations after an allocation-write failure', async () => {
    const db = drizzle(pool, { schema })
    const userId = `contribution-${randomUUID()}`
    const currentMonth = '2026-08'

    const rollback = new Error('always rollback saving contribution integration fixtures')
    await expect(db.transaction(async (outerTx) => {
      await outerTx.insert(financialProfiles).values({
        userId,
        baseCurrency: 'ARS',
        expensesKnowledge: 'known',
        plannedMonthlyContribution: '600.00',
        onboardingCompleted: true,
      })
      const [goal] = await outerTx.insert(financialGoals).values({
        userId, name: 'Notebook', type: 'purchase', targetAmount: '5000.00', currency: 'ARS', priority: 'medium', strategy: 'save', status: 'active',
      }).returning({ id: financialGoals.id })
      const [place] = await outerTx.insert(savingsPlaces).values({ userId, name: 'Banco', normalizedName: 'banco' }).returning({ id: savingsPlaces.id })
      const [snapshot] = await outerTx.insert(allocationPlanSnapshots).values({
        userId,
        effectiveMonth: `${currentMonth}-01`,
        plannedMonthlyContribution: '600.00',
      }).returning({ id: allocationPlanSnapshots.id })
      await outerTx.insert(allocationPlanEntries).values({ snapshotId: snapshot.id, goalId: goal.id, percentage: '100.00' })

      const draft = { currency: 'ARS' as const, amount: '300.00', place: { kind: 'existing' as const, placeId: place.id } }
      const state = await getSavingContributionState(outerTx as unknown as Database, userId, currentMonth)
      const previewToken = createSavingContributionPreviewToken(state!, currentMonth, draft)
      let allocationAttempted = false

      const repositoryDb = {
        query: outerTx.query,
        transaction: (callback: (tx: any) => Promise<unknown>) => outerTx.transaction((tx) => {
          const executor = new Proxy(tx, {
            get(targetTx, property) {
              if (property === 'insert') return (table: any) => {
                if (table === savingContributionAllocations) return {
                  values: async () => {
                    allocationAttempted = true
                    throw new Error('injected saving contribution allocation-write failure')
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

      await expect(createSavingContributionInRepository(repositoryDb, { userId, currentMonth, draft, previewToken }))
        .rejects.toThrow('injected saving contribution allocation-write failure')
      expect(allocationAttempted).toBe(true)

      const contributionsAfter = await outerTx.select({ id: savingContributions.id }).from(savingContributions)
        .where(eq(savingContributions.userId, userId))
      const positionsAfter = await outerTx.select({ id: goalSavingsPositions.id }).from(goalSavingsPositions)
        .where(eq(goalSavingsPositions.goalId, goal.id))
      const allocationsAfter = await outerTx.select({ id: savingContributionAllocations.id }).from(savingContributionAllocations)
        .where(eq(savingContributionAllocations.goalId, goal.id))
      expect(contributionsAfter).toEqual([])
      expect(positionsAfter).toEqual([])
      expect(allocationsAfter).toEqual([])
      throw rollback
    })).rejects.toBe(rollback)
  })
  it('rolls back the real investment contribution, position value, and allocations after an allocation-write failure', async () => {
    const db = drizzle(pool, { schema })
    const userId = `contribution-investment-${randomUUID()}`
    const currentMonth = '2026-08'

    const rollback = new Error('always rollback investment contribution integration fixtures')
    await expect(db.transaction(async (outerTx) => {
      await outerTx.insert(financialProfiles).values({
        userId,
        baseCurrency: 'ARS',
        expensesKnowledge: 'known',
        plannedMonthlyContribution: '600.00',
        onboardingCompleted: true,
      })
      const [goal] = await outerTx.insert(financialGoals).values({
        userId, name: 'Fondo', type: 'retirement', targetAmount: '9000.00', currency: 'ARS', priority: 'medium', strategy: 'invest', status: 'active',
      }).returning({ id: financialGoals.id })
      const [position] = await outerTx.insert(goalInvestmentPositions).values({ goalId: goal.id, currentValue: '1000.00', currency: 'ARS' })
        .returning({ id: goalInvestmentPositions.id })
      const [snapshot] = await outerTx.insert(allocationPlanSnapshots).values({
        userId,
        effectiveMonth: `${currentMonth}-01`,
        plannedMonthlyContribution: '600.00',
      }).returning({ id: allocationPlanSnapshots.id })
      await outerTx.insert(allocationPlanEntries).values({ snapshotId: snapshot.id, goalId: goal.id, percentage: '100.00' })

      const draft = { kind: 'investment' as const, currency: 'ARS' as const, amount: '200.00' }
      const state = await getSavingContributionState(outerTx as unknown as Database, userId, currentMonth)
      const previewToken = createSavingContributionPreviewToken(state!, currentMonth, draft)
      let allocationAttempted = false

      const repositoryDb = {
        query: outerTx.query,
        transaction: (callback: (tx: any) => Promise<unknown>) => outerTx.transaction((tx) => {
          const executor = new Proxy(tx, {
            get(targetTx, property) {
              if (property === 'insert') return (table: any) => {
                if (table === investmentContributionAllocations) return {
                  values: async () => {
                    allocationAttempted = true
                    throw new Error('injected investment allocation-write failure')
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

      await expect(createSavingContributionInRepository(repositoryDb, { userId, currentMonth, draft, previewToken }))
        .rejects.toThrow('injected investment allocation-write failure')
      expect(allocationAttempted).toBe(true)

      const contributionsAfter = await outerTx.select({ id: investmentContributions.id }).from(investmentContributions)
        .where(eq(investmentContributions.userId, userId))
      const [positionAfter] = await outerTx.select({ currentValue: goalInvestmentPositions.currentValue }).from(goalInvestmentPositions)
        .where(eq(goalInvestmentPositions.id, position.id))
      expect(contributionsAfter).toEqual([])
      expect(positionAfter.currentValue).toBe('1000.00')
      throw rollback
    })).rejects.toBe(rollback)
  })
})

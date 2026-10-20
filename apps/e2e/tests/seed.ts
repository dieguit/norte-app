import { createClerkClient } from '@clerk/backend'
import { createFixtureDatabase } from '../../api/test/fixture-database'
import {
  allocationPlanEntries,
  allocationPlanSnapshots,
  expenses,
  financialGoals,
  financialProfiles,
  incomes,
} from '../../api/src/database/schema'

let fixtureDatabase: ReturnType<typeof createFixtureDatabase> | undefined
const getFixtureDatabase = () => fixtureDatabase ??= createFixtureDatabase(process.env)

export async function closeFixtureDatabase() {
  if (!fixtureDatabase) return
  const { pool } = await fixtureDatabase
  fixtureDatabase = undefined
  await pool.end()
}

let testUserId: string | undefined

export async function getTestUserId() {
  if (testUserId) return testUserId
  const emailAddress = process.env.E2E_CLERK_USER_EMAIL
  if (!emailAddress) throw new Error('E2E_CLERK_USER_EMAIL is not set (see .env.test.example)')
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  const { data } = await clerk.users.getUserList({ emailAddress: [emailAddress] })
  const user = data[0] ?? (await clerk.users.createUser({ emailAddress: [emailAddress], skipPasswordRequirement: true }))
  testUserId = user.id
  return testUserId
}

export async function resetDatabase() {
  const { pool } = await getFixtureDatabase()
  const { rows } = await pool.query<{ db: string }>('select current_database() as db')
  if (rows[0]?.db !== 'norte_test') throw new Error('Refusing non-test fixture reset target')
  const tables = await pool.query<{ tablename: string }>("select tablename from pg_tables where schemaname = 'public' and tablename <> '__drizzle_migrations'")
  const names = tables.rows.map((t) => `"public"."${t.tablename.replaceAll('"', '""')}"`).join(', ')
  if (names) await pool.query(`truncate table ${names} cascade`)
}

export async function seedOnboardedUser() {
  const { db } = await getFixtureDatabase()
  const userId = await getTestUserId()
  const effectiveMonth = `${new Date().toISOString().slice(0, 7)}-01`
  // fixture result: (1500000 - 600000) * 90% dedication
  await db.transaction(async (tx) => {
    const [profile] = await tx
      .insert(financialProfiles)
      .values({
        userId,
        baseCurrency: 'ARS',
        expensesKnowledge: 'known',
        plannedMonthlyContribution: '810000.00',
        goalDedicationPercentage: '90.00',
        onboardingCompleted: true,
      })
      .onConflictDoNothing()
      .returning({ userId: financialProfiles.userId })
    if (!profile) return

    await tx.insert(incomes).values({
      userId, sourceKind: 'salary', sourceId: null, concept: null, amount: '1500000.00', currency: 'ARS', recurring: true, effectiveMonth,
    })
    await tx.insert(expenses).values({
      userId, sourceKind: 'housing', sourceId: null, concept: null, amount: '600000.00', currency: 'ARS', recurring: true, effectiveMonth, endMonth: null,
    })
    const [goal] = await tx
      .insert(financialGoals)
      .values({
        userId, name: 'Auto nuevo', type: 'purchase', targetAmount: '500000.00', currency: 'ARS', priority: 'high', strategy: 'save', status: 'active', desiredDate: null, emergencyFundMonths: null,
      })
      .returning({ id: financialGoals.id })
    const [snapshot] = await tx
      .insert(allocationPlanSnapshots)
      .values({ userId, effectiveMonth, plannedMonthlyContribution: '810000.00' })
      .returning({ id: allocationPlanSnapshots.id })
    await tx.insert(allocationPlanEntries).values({ snapshotId: snapshot.id, goalId: goal.id, percentage: '100.00' })
  })
}

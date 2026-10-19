import { createClerkClient } from '@clerk/backend'
// ponytail: seeds through web internals until the API owns the DB; then replace with API calls
import { db } from '../../web/src/db/client'
import { persistFinancialOnboarding } from '../../web/src/features/financial/repository.server'
import { parseGoalCreationSubmission } from '../../web/src/features/goals/goal-creation.schema'

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
  const pool = db.$client
  const { rows } = await pool.query<{ db: string }>('select current_database() as db')
  if (rows[0]?.db !== 'norte_test') throw new Error(`Refusing to reset database "${rows[0]?.db}"`)
  const tables = await pool.query<{ tablename: string }>("select tablename from pg_tables where schemaname = 'public'")
  const names = tables.rows.map((t) => `"public"."${t.tablename}"`).join(', ')
  if (names) await pool.query(`truncate table ${names} cascade`)
}

export async function seedOnboardedUser() {
  const currentMonth = new Date().toISOString().slice(0, 7)
  await persistFinancialOnboarding(
    await getTestUserId(),
    {
      goal: parseGoalCreationSubmission({
        type: 'purchase',
        name: 'Auto nuevo',
        targetAmount: '500000',
        currency: 'ARS',
        desiredMonth: '',
        priority: 'high',
        strategy: 'save',
        annualReturnRate: '',
        availability: 'available_now',
        availableFromMonth: '',
        allocations: [],
      }, currentMonth),
      incomes: [
        { concept: null, source: { kind: 'salary' }, amount: '1500000', currency: 'ARS', recurring: true, effectiveMonth: currentMonth },
      ],
      expenses: [{ concept: null, source: { kind: 'housing' }, amount: '600000', currency: 'ARS', recurring: true }],
    },
    currentMonth,
  )
}

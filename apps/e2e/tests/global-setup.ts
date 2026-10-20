import { execSync } from 'node:child_process'
import { clerkSetup } from '@clerk/testing/playwright'
import { createFixtureDatabase } from '../../api/test/fixture-database'

export default async function globalSetup() {
  const { pool } = await createFixtureDatabase(process.env)
  try {
    execSync('pnpm --filter @repo/api db:migrate', { stdio: 'inherit' })
  } finally {
    await pool.end()
  }
  await clerkSetup({ publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY, dotenv: false })
}

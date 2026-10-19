import { execSync } from 'node:child_process'
import { clerkSetup } from '@clerk/testing/playwright'

export default async function globalSetup() {
  if (new URL(process.env.DATABASE_URL!).pathname !== '/norte_test') throw new Error('E2E requires DATABASE_URL to point at norte_test')
  // ponytail: migrations owned by web today; switch to the API's migrate command once it owns the DB
  execSync('pnpm --filter @repo/web db:migrate', { stdio: 'inherit' })
  await clerkSetup({ publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY, dotenv: false })
}

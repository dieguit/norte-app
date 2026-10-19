import { execSync } from 'node:child_process'
import { clerkSetup } from '@clerk/testing/playwright'

export default async function globalSetup() {
  // ponytail: migrations owned by web today; switch to the API's migrate command once it owns the DB
  execSync('pnpm --filter @repo/web db:migrate', { stdio: 'inherit' })
  await clerkSetup({ publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY })
}

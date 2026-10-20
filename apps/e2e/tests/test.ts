import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'
import { test as base } from '@playwright/test'
import { closeFixtureDatabase } from './seed'

export { expect } from '@playwright/test'

export const test = base.extend<{}, { fixtureDatabaseCleanup: void }>({
  fixtureDatabaseCleanup: [async ({}, use) => {
    try { await use() } finally { await closeFixtureDatabase() }
  }, { scope: 'worker', auto: true }],
  context: async ({ context }, use) => {
    await setupClerkTestingToken({ context })
    await use(context)
    for (const page of context.pages()) {
      if (page.url() !== 'about:blank') await clerk.loaded({ page })
    }
    await context.unrouteAll({ behavior: 'wait' })
  },
})

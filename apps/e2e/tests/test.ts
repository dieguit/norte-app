import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'
import { test as base } from '@playwright/test'

export { expect } from '@playwright/test'

export const test = base.extend({
  context: async ({ context }, use) => {
    await setupClerkTestingToken({ context })
    await use(context)
    for (const page of context.pages()) {
      if (page.url() !== 'about:blank') await clerk.loaded({ page })
    }
    await context.unrouteAll({ behavior: 'wait' })
  },
})

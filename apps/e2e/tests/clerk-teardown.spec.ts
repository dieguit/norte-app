import { setTimeout } from 'node:timers/promises'
import { expect, test } from './test'

let pendingRequest: Promise<void>
let requestError: unknown

test.afterAll(async () => {
  await pendingRequest
  expect(requestError).toBeUndefined()
})

test('drains in-flight route handlers before closing the context', async ({ context, page, baseURL }) => {
  let markStarted!: () => void
  const started = new Promise<void>(resolve => { markStarted = resolve })
  await context.route('**/clerk-teardown', async route => {
    pendingRequest = (async () => {
      await setTimeout(100)
      const response = await route.fetch({ url: baseURL })
      await route.fulfill({ response })
    })().catch(error => { requestError = error })
    markStarted()
    await pendingRequest
  })

  await page.evaluate(url => { void fetch(url).catch(() => {}) }, `${baseURL}/clerk-teardown`)
  await started
})

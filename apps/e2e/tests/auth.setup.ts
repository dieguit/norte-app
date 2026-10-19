import { clerk } from '@clerk/testing/playwright'
import { expect, test as setup } from './test'
import { AUTH_FILE } from '../playwright.config'
import { getTestUserId } from './seed'

setup('authenticate test user', async ({ page }) => {
  await getTestUserId()
  await page.goto('/')
  await clerk.signIn({ page, emailAddress: process.env.E2E_CLERK_USER_EMAIL! })
  await page.goto('/app')
  await expect(page).toHaveURL(/\/app/)
  await page.context().storageState({ path: AUTH_FILE })
})

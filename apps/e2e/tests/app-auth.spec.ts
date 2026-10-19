import { expect, test } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })

test('logged-out visit to /app redirects to sign-in', async ({ page }) => {
  await page.goto('/app')
  await expect(page).toHaveURL(/\/sign-in/)
})

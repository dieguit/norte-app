import { expect, test } from '@playwright/test'
import { resetDatabase, seedOnboardedUser } from './seed'

test.beforeEach(async () => {
  await resetDatabase()
  await seedOnboardedUser()
})

test('onboarded user sees home roadmap and can navigate sections', async ({ page }) => {
  await page.goto('/app')
  await expect(page.getByRole('heading', { name: 'Inicio' })).toBeVisible()
  await expect(page.getByRole('button', { name: '+ Registrar' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Tu hoja de ruta' })).toBeVisible()
  await expect(page.getByRole('heading', { name: /^Hoy · / })).toBeVisible()

  const nav = page.getByRole('navigation', { name: 'Navegación principal' })
  await nav.getByRole('link', { name: 'Finanzas' }).click()
  await expect(page).toHaveURL(/\/app\/finances/)
  await expect(page.getByRole('heading', { name: 'Tus Finanzas' })).toBeVisible()

  await nav.getByRole('link', { name: 'Objetivos' }).click()
  await expect(page).toHaveURL(/\/app\/goals/)
  await expect(page.getByText('Auto nuevo').first()).toBeVisible()

  await nav.getByRole('link', { name: 'Inicio' }).click()
  await expect(page).toHaveURL(/\/app\/?$/)
})

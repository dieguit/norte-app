import { expect, test } from '@playwright/test'
import { recordSaving } from './actions'
import { resetDatabase, seedOnboardedUser } from './seed'

test.beforeEach(async () => {
  await resetDatabase()
  await seedOnboardedUser()
})

test('records a saving, sees it on the goal, then deletes it', async ({ page }) => {
  await recordSaving(page, { place: 'Banco Nación', amount: '100000' })

  await page.goto('/app/goals')
  await page.getByRole('button', { name: 'Ver detalle de Auto nuevo' }).click()
  const detail = page.getByRole('region', { name: 'Detalles de Auto nuevo' })
  await expect(detail.getByText('Historial de aportes')).toBeVisible()
  await expect(detail.getByText('100.000').first()).toBeVisible()

  await page.getByRole('button', { name: /^Eliminar aporte de ahorro del / }).click()
  await page.getByRole('button', { name: 'Eliminar aporte', exact: true }).click()
  await expect(page.getByText('Ahorro eliminado.')).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Ver detalle de Auto nuevo' }).click()
  await expect(detail.getByText('Tus avances hasta hoy')).toBeVisible()
  await expect(detail.getByRole('button', { name: /^Eliminar aporte de ahorro del / })).toHaveCount(0)
})

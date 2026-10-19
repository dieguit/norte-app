import { expect, test } from '@playwright/test'
import { recordSaving } from './actions'
import { resetDatabase, seedOnboardedUser } from './seed'

test.beforeEach(async () => {
  await resetDatabase()
  await seedOnboardedUser()
})

test('creates a place, transfers savings into it and lists movements', async ({ page }) => {
  await recordSaving(page, { place: 'Banco Nación', amount: '100000' })

  await page.goto('/app/finances')
  await page.getByRole('tab', { name: 'Ahorros' }).click()
  await expect(page.getByRole('heading', { name: 'Tus ahorros' })).toBeVisible()

  await page.getByRole('button', { name: 'Nuevo lugar' }).click()
  const sheet = page.getByRole('dialog')
  await sheet.getByLabel('Nombre del lugar').fill('Mercado Pago')
  await sheet.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Lugar creado.')).toBeVisible()

  await page.getByRole('button', { name: 'Transferir desde Banco Nación' }).click()
  await sheet.getByLabel('Hacia').click()
  await page.getByRole('option', { name: 'Mercado Pago' }).click()
  await sheet.getByLabel('Monto', { exact: true }).fill('40000')
  await sheet.getByRole('button', { name: 'Transferir' }).click()
  await expect(page.getByText('Transferencia realizada.')).toBeVisible()

  await page.reload()
  await page.getByRole('tab', { name: 'Ahorros' }).click()
  await page.getByRole('button', { name: 'Ver movimientos de Mercado Pago' }).click()
  await expect(page.getByRole('dialog', { name: 'Movimientos de Mercado Pago' })).toBeVisible()
  await expect(sheet.getByText('40.000').first()).toBeVisible()
})

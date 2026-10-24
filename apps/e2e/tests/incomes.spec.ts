import { expect, test } from './test'
import { resetDatabase, seedOnboardedUser } from './seed'

test.beforeEach(async () => {
  await resetDatabase()
  await seedOnboardedUser()
})

test('creates, edits and deletes an income', async ({ page }) => {
  await page.goto('/app/finances/incomes')

  await page.getByRole('button', { name: 'Agregar ingreso' }).click()
  const sheet = page.getByRole('dialog')
  await sheet.getByLabel('Monto', { exact: true }).fill('250000')
  await sheet.getByLabel('Categoría del ingreso').click()
  await page.getByRole('option', { name: 'Sin categoría' }).click()
  await sheet.getByLabel('Concepto (opcional)').fill('Bono anual')
  await sheet.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Ingreso agregado.')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Bono anual')).toBeVisible()

  await page.getByRole('button', { name: /Editar ingreso .*Bono anual/ }).click()
  await sheet.getByLabel('Monto', { exact: true }).fill('300000')
  await sheet.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Ingreso actualizado.')).toBeVisible()
  await page.reload()
  await expect(page.getByText('300.000').first()).toBeVisible()

  await page.getByRole('button', { name: /Editar ingreso .*Bono anual/ }).click()
  page.once('dialog', (dialog) => dialog.accept())
  await sheet.getByRole('button', { name: 'Eliminar' }).click()
  await expect(page.getByText('Ingreso eliminado.')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Bono anual')).toBeHidden()
})

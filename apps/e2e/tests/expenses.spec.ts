import { expect, test } from './test'
import { resetDatabase, seedOnboardedUser } from './seed'

test.beforeEach(async () => {
  await resetDatabase()
  await seedOnboardedUser()
})

test('creates, edits and deletes an expense', async ({ page }) => {
  await page.goto('/app/finances/expenses')

  await page.getByRole('button', { name: 'Agregar gasto' }).click()
  const sheet = page.getByRole('dialog')
  await sheet.getByLabel('Monto', { exact: true }).fill('45000')
  await sheet.getByLabel('Categoría del gasto').click()
  await page.getByRole('option', { name: 'Sin categoría' }).click()
  await sheet.getByLabel('Concepto (opcional)').fill('Gimnasio')
  await sheet.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Gasto agregado.')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Gimnasio')).toBeVisible()

  await page.getByRole('button', { name: /Editar gasto .*Gimnasio/ }).click()
  await sheet.getByLabel('Monto', { exact: true }).fill('52000')
  await sheet.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Gasto actualizado.')).toBeVisible()
  await page.reload()
  await expect(page.getByText('52.000').first()).toBeVisible()

  await page.getByRole('button', { name: /Editar gasto .*Gimnasio/ }).click()
  page.once('dialog', (dialog) => dialog.accept())
  await sheet.getByRole('button', { name: 'Eliminar' }).click()
  await expect(page.getByText('Gasto eliminado.')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Gimnasio')).toBeHidden()
})

import { expect, test } from '@playwright/test'
import { recordSaving } from './actions'
import { resetDatabase, seedOnboardedUser } from './seed'

test.beforeEach(async () => {
  await resetDatabase()
  await seedOnboardedUser()
})

test('creates a goal', async ({ page }) => {
  await page.goto('/app/goals')
  await page.getByRole('button', { name: 'Nuevo objetivo' }).click()
  const sheet = page.getByRole('dialog', { name: 'Nuevo objetivo' })
  await sheet.getByLabel('Tipo de objetivo').click()
  await page.getByRole('option', { name: 'Otro objetivo' }).click()
  await sheet.getByLabel('Nombre del objetivo').fill('Viaje a Japón')
  await sheet.getByLabel('Monto objetivo').fill('3000000')
  await sheet.getByRole('button', { name: 'Continuar a la distribución' }).click()
  const create = sheet.getByRole('button', { name: 'Crear objetivo y actualizar Plan' })
  await create.click()
  await expect(sheet.getByRole('alert')).toContainText('Tu Plan cambió')
  await create.click()
  await expect(page.getByText('Objetivo creado y Plan actualizado.')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Viaje a Japón').first()).toBeVisible()
})

test('edits a goal', async ({ page }) => {
  await page.goto('/app/goals')
  await page.getByRole('button', { name: 'Editar objetivo Auto nuevo' }).click()
  const sheet = page.getByRole('dialog', { name: 'Editar objetivo' })
  await sheet.getByLabel('Nombre del objetivo').fill('Auto usado')
  await sheet.getByRole('button', { name: 'Continuar a la distribución' }).click()
  await sheet.getByRole('button', { name: 'Actualizar objetivo y Plan' }).click()
  await expect(page.getByText('Objetivo y Plan actualizados.')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Auto usado').first()).toBeVisible()
})

test('pauses and resumes a goal', async ({ page }) => {
  await page.goto('/app/goals')
  await page.getByRole('button', { name: 'Pausar objetivo Auto nuevo' }).click()
  await page.getByRole('dialog', { name: 'Pausar objetivo' }).getByRole('button', { name: 'Pausar objetivo', exact: true }).click()
  await expect(page.getByText('Objetivo pausado.')).toBeVisible()

  await page.reload()
  await page.getByRole('button', { name: /^Pausados/ }).click()
  await page.getByRole('button', { name: 'Reanudar objetivo Auto nuevo' }).click()
  await page.getByRole('dialog', { name: 'Reanudar objetivo' }).getByRole('button', { name: 'Reanudar objetivo', exact: true }).click()
  await expect(page.getByText('Objetivo reanudado.')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Pausar objetivo Auto nuevo' })).toBeVisible()
})

test('completes a funded goal', async ({ page }) => {
  await recordSaving(page, { place: 'Banco Nación', amount: '500000' })

  await page.goto('/app/goals')
  await page.getByRole('button', { name: 'Marcar como cumplido Auto nuevo' }).click()
  const sheet = page.getByRole('dialog', { name: 'Completar objetivo' })
  await sheet.getByLabel('Monto a retirar de Banco Nación').fill('500000')
  await sheet.getByRole('button', { name: 'Confirmar, marcar como completado' }).click()
  await expect(page.getByText('Objetivo completado.')).toBeVisible()
  await page.reload()
  const completed = page.getByRole('region', { name: 'Completados' })
  await completed.getByRole('button', { name: /^Completados/ }).click()
  await expect(completed.getByText('Auto nuevo')).toBeVisible()
})

import { expect, type Page } from '@playwright/test'

export async function recordSaving(page: Page, { place, amount }: { place: string; amount: string }) {
  await page.goto('/app')
  await page.getByRole('button', { name: '+ Registrar' }).click()
  await page.getByRole('button', { name: 'Ahorré ARS' }).click()
  const sheet = page.getByRole('dialog')
  await sheet.getByLabel('Monto en pesos').fill(amount)
  await sheet.getByLabel('¿Dónde está este ahorro?').click()
  await page.getByRole('option', { name: 'Otro (agregar nuevo)' }).click()
  await sheet.getByLabel('Nombre del lugar nuevo').fill(place)
  await sheet.getByRole('button', { name: 'Confirmar ahorro' }).click()
  await expect(sheet).toBeHidden()
}

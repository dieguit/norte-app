import { expect, test } from './test'
import { resetDatabase } from './seed'

test.beforeEach(async () => {
  await resetDatabase()
})

test('new user completes financial onboarding and lands on the roadmap', async ({ page }) => {
  await page.goto('/app')
  await expect(page.getByRole('heading', { name: 'Hola, te damos la bienvenida a Norte!' })).toBeVisible()
  await page.getByRole('button', { name: 'Empezar' }).click()

  await expect(page.getByRole('heading', { name: 'Elegí tu primer objetivo' })).toBeVisible()
  await page.getByLabel('Tipo de objetivo').click()
  await page.getByRole('option', { name: 'Compra o gasto grande' }).click()
  await page.getByLabel('Nombre del objetivo').fill('Auto nuevo')
  await page.getByLabel('Monto objetivo').fill('5000000')
  await page.getByRole('button', { name: 'Continuar' }).click()

  await expect(page.getByRole('heading', { name: 'Ingresos' })).toBeVisible()
  await page.getByRole('button', { name: 'Agregar ingreso' }).click()
  const incomeSheet = page.getByRole('dialog')
  await incomeSheet.getByLabel('Monto', { exact: true }).fill('1500000')
  await incomeSheet.getByLabel('Categoría del ingreso').click()
  await page.getByRole('option', { name: 'Sueldo' }).click()
  await incomeSheet.getByRole('button', { name: 'Guardar' }).click()
  await expect(incomeSheet).toBeHidden()
  await page.getByRole('button', { name: 'Continuar' }).click()

  await expect(page.getByRole('heading', { name: 'Gastos' })).toBeVisible()
  await page.getByRole('button', { name: 'Agregar gasto' }).click()
  const expenseSheet = page.getByRole('dialog')
  await expenseSheet.getByLabel('Monto', { exact: true }).fill('600000')
  await expenseSheet.getByLabel('Categoría del gasto').click()
  await page.getByRole('option', { name: 'Alquiler / vivienda' }).click()
  await expenseSheet.getByRole('button', { name: 'Guardar' }).click()
  await expect(expenseSheet).toBeHidden()
  await page.getByRole('button', { name: 'Listo, continuar al plan' }).click()

  await expect(page.getByRole('heading', { name: 'Inicio' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Tu hoja de ruta' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Tu hoja de ruta' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Tu hoja de ruta', exact: true }).getByRole('heading', { name: 'Auto nuevo', exact: true })).toBeVisible()
})

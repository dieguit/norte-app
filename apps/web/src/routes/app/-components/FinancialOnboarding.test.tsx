// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FinancialOnboarding } from './FinancialOnboarding'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('FinancialOnboarding', () => {
  async function reachIncomeStep(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: 'Empezar' }))
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByText('Paso 3 de 4')).toBeVisible()
  }

  async function addSalary(user: ReturnType<typeof userEvent.setup>, amount = '125000') {
    await user.click(screen.getByRole('button', { name: 'Agregar ingreso' }))
    await user.type(screen.getByRole('textbox', { name: 'Monto' }), amount)
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
  }

  async function reachExpenseStep(user: ReturnType<typeof userEvent.setup>) {
    await reachIncomeStep(user)
    await addSalary(user)
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByText('Paso 4 de 4')).toBeVisible()
  }

  it('introduces goals, finances, and the roadmap before asking for data', () => {
    render(<FinancialOnboarding />)

    expect(screen.getByText('Paso 1 de 4')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Hola, te damos la bienvenida a Norte!' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Objetivos' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Finanzas' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Hoja de ruta' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Empezar' })).toBeVisible()
    expect(screen.queryByLabelText('Tipo de objetivo')).not.toBeInTheDocument()
  })

  it('starts the objective screen with a derived emergency fund', async () => {
    const user = userEvent.setup()
    render(<FinancialOnboarding />)

    await user.click(screen.getByRole('button', { name: 'Empezar' }))

    expect(screen.getByText('Paso 2 de 4')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Elegí tu primer objetivo' })).toBeVisible()
    expect(screen.getByLabelText('Tipo de objetivo')).toHaveTextContent('Colchón financiero')
    expect(screen.queryByLabelText('Nombre del objetivo')).not.toBeInTheDocument()
    expect(screen.getByText('Dólares (USD)')).toBeVisible()
    expect(screen.getByText('El colchón equivale a 6 meses de gastos y se calculará automáticamente.')).toBeVisible()
    expect(screen.queryByLabelText('Monto objetivo')).not.toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'Ahorrar' })).not.toBeInTheDocument()
    expect(screen.queryByText(/distribución/i)).not.toBeInTheDocument()
  })

  it('requires canonical details for a non-emergency objective', async () => {
    const user = userEvent.setup()
    render(<FinancialOnboarding />)

    await user.click(screen.getByRole('button', { name: 'Empezar' }))
    await user.click(screen.getByLabelText('Tipo de objetivo'))
    await user.click(screen.getByRole('option', { name: 'Compra o gasto grande' }))
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(screen.getByText('Ingresá un nombre.')).toBeVisible()
    expect(screen.getByText('Ingresá un monto objetivo mayor a cero.')).toBeVisible()
    expect(screen.getByLabelText('Moneda')).toBeVisible()
    expect(screen.getByText('Paso 2 de 4')).toBeVisible()
  })

  it('requires a recurring income before continuing', async () => {
    const user = userEvent.setup()
    render(<FinancialOnboarding />)
    await reachIncomeStep(user)

    expect(screen.getByRole('heading', { name: 'Ingresos' })).toBeVisible()
    expect(screen.getByText('Agregá tus ingresos mensuales para entender tu punto de partida.')).toBeVisible()
    expect(screen.getByText('Agregá al menos un ingreso recurrente para continuar.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Agregar ingreso' })).toBeEnabled()
  })

  it('adds a recurring income and shows the monthly ARS total', async () => {
    const user = userEvent.setup()
    render(<FinancialOnboarding />)
    await reachIncomeStep(user)

    await user.click(screen.getByRole('button', { name: 'Agregar ingreso' }))
    expect(screen.getByRole('heading', { name: 'Nuevo ingreso recurrente' })).toBeVisible()
    expect(screen.queryByRole('switch', { name: 'Es ingreso recurrente' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /mes/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: 'Moneda' }))
    await user.click(screen.getByRole('option', { name: 'Dólares (USD)' }))
    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '100')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getByRole('heading', { name: 'Ingresos recurrentes' })).toBeVisible()
    expect(screen.getByText('Sueldo')).toBeVisible()
    expect(screen.getByText('USD 100,00')).toBeVisible()
    expect(screen.getByText('Total mensual estimado')).toBeVisible()
    expect(screen.getByText('ARS 150.000,00')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByText('Paso 4 de 4')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Gastos' })).toBeVisible()
  })

  it('edits and removes a local income', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<FinancialOnboarding />)
    await reachIncomeStep(user)
    await addSalary(user)

    await user.click(screen.getByRole('button', { name: 'Editar ingreso Sueldo' }))
    const amount = screen.getByRole('textbox', { name: 'Monto' })
    await user.clear(amount)
    await user.type(amount, '200000')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getAllByText('ARS 200.000,00')).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'Eliminar ingreso Sueldo' }))
    expect(window.confirm).toHaveBeenCalledWith('¿Eliminar este ingreso?')
    expect(screen.queryByRole('heading', { name: 'Ingresos recurrentes' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled()
  })

  it('renders a named custom recurring income', async () => {
    const user = userEvent.setup()
    render(<FinancialOnboarding />)
    await reachIncomeStep(user)

    await user.click(screen.getByRole('button', { name: 'Agregar ingreso' }))
    await user.click(screen.getByRole('combobox', { name: '¿De dónde viene este ingreso?' }))
    await user.click(screen.getByRole('option', { name: 'Otro (agregar nuevo)' }))
    await user.type(screen.getByRole('textbox', { name: 'Nombre del ingreso nuevo' }), 'Consultoría')
    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '50000')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getByText('Consultoría')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Editar ingreso Consultoría' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Eliminar ingreso Consultoría' })).toBeVisible()
  })

  it('retains the objective and incomes while navigating within the wizard', async () => {
    const user = userEvent.setup()
    render(<FinancialOnboarding />)

    await user.click(screen.getByRole('button', { name: 'Empezar' }))
    await user.click(screen.getByLabelText('Tipo de objetivo'))
    await user.click(screen.getByRole('option', { name: 'Otro objetivo' }))
    await user.type(screen.getByLabelText('Nombre del objetivo'), 'Viaje al sur')
    await user.type(screen.getByLabelText('Monto objetivo'), '2.000.000')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await addSalary(user)

    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await user.click(screen.getByRole('button', { name: 'Agregar gasto' }))
    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '75000')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await user.click(screen.getByRole('button', { name: 'Volver' }))
    expect(screen.getByText('Sueldo')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Volver' }))
    expect(screen.getByLabelText('Nombre del objetivo')).toHaveValue('Viaje al sur')
    expect(screen.getByLabelText('Monto objetivo')).toHaveValue('2.000.000')

    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByText('Sueldo')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByText('Alquiler / vivienda')).toBeVisible()
    expect(screen.getAllByText('ARS 75.000,00')).toHaveLength(2)
  })

  it('edits and removes a local expense', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<FinancialOnboarding />)
    await reachExpenseStep(user)

    await user.click(screen.getByRole('button', { name: 'Agregar gasto' }))
    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '100000')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await user.click(screen.getByRole('button', { name: 'Editar gasto Alquiler / vivienda' }))
    const amount = screen.getByRole('textbox', { name: 'Monto' })
    await user.clear(amount)
    await user.type(amount, '200000')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(screen.getAllByText('ARS 200.000,00')).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'Eliminar gasto Alquiler / vivienda' }))
    expect(window.confirm).toHaveBeenCalledWith('¿Eliminar este gasto?')
    expect(screen.queryByRole('heading', { name: 'Gastos recurrentes' })).not.toBeInTheDocument()
    expect(screen.getByText('Agregá al menos un gasto recurrente para completar este paso.')).toBeVisible()
  })

  it('renders a named custom recurring expense', async () => {
    const user = userEvent.setup()
    render(<FinancialOnboarding />)
    await reachExpenseStep(user)

    await user.click(screen.getByRole('button', { name: 'Agregar gasto' }))
    await user.click(screen.getByRole('combobox', { name: 'Concepto del gasto' }))
    await user.click(screen.getByRole('option', { name: 'Otro (agregar nuevo)' }))
    await user.type(screen.getByRole('textbox', { name: 'Nombre del gasto nuevo' }), 'Gimnasio')
    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '50000')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getByText('Gimnasio')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Editar gasto Gimnasio' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Eliminar gasto Gimnasio' })).toBeVisible()
  })

  it('asks for at least one recurring expense', async () => {
    const user = userEvent.setup()
    render(<FinancialOnboarding />)
    await reachExpenseStep(user)

    expect(screen.getByText('Agregá tus gastos mensuales para entender cuánto dinero queda disponible.')).toBeVisible()
    expect(screen.getByText('Agregá al menos un gasto recurrente para completar este paso.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Agregar gasto' })).toBeEnabled()
  })

  it('adds a recurring expense and shows the monthly ARS total', async () => {
    const user = userEvent.setup()
    render(<FinancialOnboarding />)
    await reachExpenseStep(user)

    await user.click(screen.getByRole('button', { name: 'Agregar gasto' }))
    expect(screen.getByRole('heading', { name: 'Nuevo gasto recurrente' })).toBeVisible()
    expect(screen.queryByRole('switch', { name: 'Es gasto recurrente' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /mes/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: 'Moneda' }))
    await user.click(screen.getByRole('option', { name: 'Dólares (USD)' }))
    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '100')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getByRole('heading', { name: 'Gastos recurrentes' })).toBeVisible()
    expect(screen.getByText('Alquiler / vivienda')).toBeVisible()
    expect(screen.getByText('USD 100,00')).toBeVisible()
    expect(screen.getByText('Total mensual estimado')).toBeVisible()
    expect(screen.getByText('ARS 150.000,00')).toBeVisible()
  })
})


// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { completeFinancialOnboarding } from '../../../features/financial/financial.functions'
import { FinancialOnboarding } from './FinancialOnboarding'

const mockInvalidate = vi.fn().mockResolvedValue(undefined)
const mockNavigate = vi.fn().mockResolvedValue(undefined)
const posthogCapture = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({
    invalidate: mockInvalidate,
    navigate: mockNavigate,
  }),
}))

vi.mock('@posthog/react', () => ({
  usePostHog: () => ({ capture: posthogCapture }),
}))

vi.mock('../../../features/financial/financial.functions', () => ({
  completeFinancialOnboarding: vi.fn(),
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

beforeEach(() => {
  vi.clearAllMocks()
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
    await user.type(screen.getByRole('textbox', { name: 'Concepto' }), 'Sueldo principal')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
  }

  async function addHousingExpense(user: ReturnType<typeof userEvent.setup>, amount = '100000') {
    await user.click(screen.getByRole('button', { name: 'Agregar gasto' }))
    await user.type(screen.getByRole('textbox', { name: 'Monto' }), amount)
    await user.type(screen.getByRole('textbox', { name: 'Concepto' }), 'Alquiler')
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
    expect(screen.getByText('El colchón equivale a 3 meses de gastos y se calculará automáticamente.')).toBeVisible()
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
    await user.type(screen.getByRole('textbox', { name: 'Concepto' }), 'Sueldo principal')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getByRole('heading', { name: 'Ingresos recurrentes' })).toBeVisible()
    expect(screen.getByText('Sueldo')).toBeVisible()
    expect(screen.getByText('US$ 100,00')).toBeVisible()
    expect(screen.getByText('Total mensual estimado')).toBeVisible()
    expect(screen.getByText('$ 150.000,00')).toBeVisible()
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
    expect(screen.getByRole('textbox', { name: 'Concepto' })).toHaveValue('Sueldo principal')
    const amount = screen.getByRole('textbox', { name: 'Monto' })
    await user.clear(amount)
    await user.type(amount, '200000')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getAllByText('$ 200.000,00')).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'Eliminar ingreso Sueldo' }))
    expect(window.confirm).toHaveBeenCalledWith('¿Eliminar este ingreso?')
    expect(screen.queryByRole('heading', { name: 'Ingresos recurrentes' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled()
  })

  it('retains a distinct concept when editing a custom recurring income', async () => {
    const user = userEvent.setup()
    render(<FinancialOnboarding />)
    await reachIncomeStep(user)

    await user.click(screen.getByRole('button', { name: 'Agregar ingreso' }))
    await user.click(screen.getByRole('combobox', { name: 'Categoría del ingreso' }))
    await user.click(screen.getByRole('option', { name: 'Otro (agregar nuevo)' }))
    await user.type(screen.getByRole('textbox', { name: 'Nombre de la categoría nueva' }), 'Consultoría')
    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '50000')
    await user.type(screen.getByRole('textbox', { name: 'Concepto' }), 'Honorarios')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getByText('Consultoría')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Editar ingreso Consultoría' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Eliminar ingreso Consultoría' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Editar ingreso Consultoría' }))
    expect(screen.getByRole('textbox', { name: 'Concepto' })).toHaveValue('Honorarios')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
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
    await user.type(screen.getByRole('textbox', { name: 'Concepto' }), 'Alquiler')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await user.click(screen.getByRole('button', { name: 'Editar gasto Alquiler / vivienda' }))
    expect(screen.getByRole('textbox', { name: 'Concepto' })).toHaveValue('Alquiler')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    await user.click(screen.getByRole('button', { name: 'Volver' }))
    expect(screen.getByText('Sueldo')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Editar ingreso Sueldo' }))
    expect(screen.getByRole('textbox', { name: 'Concepto' })).toHaveValue('Sueldo principal')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    await user.click(screen.getByRole('button', { name: 'Volver' }))
    expect(screen.getByLabelText('Nombre del objetivo')).toHaveValue('Viaje al sur')
    expect(screen.getByLabelText('Monto objetivo')).toHaveValue('2.000.000')

    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByText('Sueldo')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByText('Alquiler / vivienda')).toBeVisible()
    expect(screen.getAllByText('$ 75.000,00')).toHaveLength(2)
  })

  it('edits and removes a local expense', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<FinancialOnboarding />)
    await reachExpenseStep(user)

    await user.click(screen.getByRole('button', { name: 'Agregar gasto' }))
    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '100000')
    await user.type(screen.getByRole('textbox', { name: 'Concepto' }), 'Alquiler')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await user.click(screen.getByRole('button', { name: 'Editar gasto Alquiler / vivienda' }))
    expect(screen.getByRole('textbox', { name: 'Concepto' })).toHaveValue('Alquiler')
    const amount = screen.getByRole('textbox', { name: 'Monto' })
    await user.clear(amount)
    await user.type(amount, '200000')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(screen.getAllByText('$ 200.000,00')).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'Eliminar gasto Alquiler / vivienda' }))
    expect(window.confirm).toHaveBeenCalledWith('¿Eliminar este gasto?')
    expect(screen.queryByRole('heading', { name: 'Gastos recurrentes' })).not.toBeInTheDocument()
    expect(screen.getByText('Agregá al menos un gasto recurrente para completar este paso.')).toBeVisible()
  })

  it('retains a distinct concept when editing a custom recurring expense', async () => {
    const user = userEvent.setup()
    render(<FinancialOnboarding />)
    await reachExpenseStep(user)

    await user.click(screen.getByRole('button', { name: 'Agregar gasto' }))
    await user.click(screen.getByRole('combobox', { name: 'Categoría del gasto' }))
    await user.click(screen.getByRole('option', { name: 'Otro (agregar nuevo)' }))
    await user.type(screen.getByRole('textbox', { name: 'Nombre de la categoría nueva' }), 'Gimnasio')
    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '50000')
    await user.type(screen.getByRole('textbox', { name: 'Concepto' }), 'Cuota mensual')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getByText('Gimnasio')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Editar gasto Gimnasio' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Eliminar gasto Gimnasio' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Editar gasto Gimnasio' }))
    expect(screen.getByRole('textbox', { name: 'Concepto' })).toHaveValue('Cuota mensual')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
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
    await user.type(screen.getByRole('textbox', { name: 'Concepto' }), 'Alquiler')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getByRole('heading', { name: 'Gastos recurrentes' })).toBeVisible()
    expect(screen.getByText('Alquiler / vivienda')).toBeVisible()
    expect(screen.getByText('US$ 100,00')).toBeVisible()
    expect(screen.getByText('Total mensual estimado')).toBeVisible()
    expect(screen.getByText('$ 150.000,00')).toBeVisible()
  })

  it('submits the four-step onboarding plan, invalidates the router, and navigates to /app', async () => {
    const user = userEvent.setup()
    vi.mocked(completeFinancialOnboarding).mockResolvedValue({ created: true })

    render(<FinancialOnboarding />)
    await reachExpenseStep(user)

    const submit = screen.getByRole('button', {
      name: 'Listo, continuar al plan',
    })
    expect(submit).toBeDisabled()

    await addHousingExpense(user)
    expect(submit).toBeEnabled()
    await user.click(submit)

    expect(completeFinancialOnboarding).toHaveBeenCalledWith({
      data: {
        goal: expect.objectContaining({
          type: 'emergency_fund',
          name: 'Colchón financiero',
        }),
        incomes: [expect.objectContaining({ recurring: true, concept: 'Sueldo principal' })],
        expenses: [expect.objectContaining({ recurring: true, concept: 'Alquiler' })],
      },
    })
    expect(mockInvalidate).toHaveBeenCalledOnce()
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/app' })
    expect(posthogCapture).toHaveBeenCalledOnce()
    expect(posthogCapture).toHaveBeenCalledWith('financial_onboarding_completed')
  })

  it('shows a retry message and stays on step 4 when a plan already exists', async () => {
    const user = userEvent.setup()
    vi.mocked(completeFinancialOnboarding).mockResolvedValueOnce({ created: false })

    render(<FinancialOnboarding />)
    await reachExpenseStep(user)
    await addHousingExpense(user)

    const submit = screen.getByRole('button', {
      name: 'Listo, continuar al plan',
    })
    expect(submit).toBeEnabled()
    await user.click(submit)

    expect(
      screen.getByText('Ya existe un plan para tu cuenta. Recargá la página para continuarlo.'),
    ).toBeVisible()
    expect(screen.getByText('Paso 4 de 4')).toBeVisible()
    expect(submit).toBeEnabled()
    expect(mockNavigate).not.toHaveBeenCalled()
    expect(posthogCapture).not.toHaveBeenCalled()
  })

  it('shows an error message and stays on step 4 if onboarding submission fails', async () => {
    const user = userEvent.setup()
    vi.mocked(completeFinancialOnboarding).mockRejectedValueOnce(new Error('Network error'))

    render(<FinancialOnboarding />)
    await reachExpenseStep(user)
    await addHousingExpense(user)

    const submit = screen.getByRole('button', {
      name: 'Listo, continuar al plan',
    })
    expect(submit).toBeEnabled()
    await user.click(submit)

    expect(
      screen.getByText('No pudimos guardar tu plan. Revisá tu conexión e intentá de nuevo.'),
    ).toBeVisible()
    expect(screen.getByText('Paso 4 de 4')).toBeVisible()
    expect(submit).toBeEnabled()
    expect(mockNavigate).not.toHaveBeenCalled()
    expect(posthogCapture).not.toHaveBeenCalled()
  })
})

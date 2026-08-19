// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { useRouter } from '@tanstack/react-router'
import { FinancialOnboarding } from './FinancialOnboarding'
import { completeInitialPlan } from '../../../features/financial/financial.functions'

vi.mock('@tanstack/react-router', () => ({
  useRouter: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('../../../features/financial/financial.functions', () => ({
  completeInitialPlan: vi.fn(),
}))

afterEach(cleanup)

describe('FinancialOnboarding component', () => {
  const mockInvalidate = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRouter).mockReturnValue({
      invalidate: mockInvalidate,
    } as any)
  })

  it('renders Step 1 with default emergency fund goal and intro copy', () => {
    render(<FinancialOnboarding />)

    expect(screen.getByRole('heading', { name: 'Vamos a construir tu perfil financiero' })).toBeVisible()
    expect(
      screen.getByText('Empecemos con algunos datos básicos. No tienen que ser exactos y podés cambiarlos después.'),
    ).toBeVisible()
    expect(screen.getByText('Podés cambiar o agregar objetivos más adelante.')).toBeVisible()
    expect(screen.getByText('Recomendado')).toBeVisible()
    expect(
      screen.getByText(
        'Si no tenés un fondo emergencia todavía, recomendamos empezar por acá. Un fondo de emergencia equivale a 6 meses de gastos, útil para estar seguro ante cualquier eventualidad.',
      ),
    ).toBeVisible()

    const emergencyRadio = screen.getByRole('radio', { name: 'Colchón financiero' })
    expect(emergencyRadio).toBeChecked()
    expect(emergencyRadio).toHaveAttribute(
      'aria-describedby',
      'emergency-fund-recommendation emergency-fund-description',
    )
    expect(screen.getByText('Recomendado')).toHaveAttribute('id', 'emergency-fund-recommendation')
    expect(screen.getByText(
      'Si no tenés un fondo emergencia todavía, recomendamos empezar por acá. Un fondo de emergencia equivale a 6 meses de gastos, útil para estar seguro ante cualquier eventualidad.',
    )).toHaveAttribute(
      'id',
      'emergency-fund-description',
    )
    expect(screen.queryByLabelText('Monto objetivo')).not.toBeInTheDocument()
  })

  it('keeps four steps and reveals a required fixed target on a non-emergency choice', async () => {
    const user = userEvent.setup()
    render(<FinancialOnboarding />)

    await user.click(screen.getByRole('radio', { name: /quiero cambiar el auto/i }))
    expect(screen.getByLabelText('Monto objetivo')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Ingresá un monto objetivo mayor a cero.')
  })

  it('formats money inputs and ignores non-numeric characters', async () => {
    const user = userEvent.setup()
    render(<FinancialOnboarding />)

    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    const income = screen.getByLabelText('Ingresos mensuales aproximados')
    await user.type(income, '1000000abc')

    expect(income).toHaveValue('1.000.000')
  })

  it('navigates through four steps, retains values on back navigation, and handles zero income', async () => {
    const user = userEvent.setup()
    render(<FinancialOnboarding />)

    // Step 1: Emergency fund -> Continue
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    // Step 2: Income
    expect(screen.getByLabelText('Ingresos mensuales aproximados')).toBeVisible()
    await user.type(screen.getByLabelText('Ingresos mensuales aproximados'), '0')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    // Step 3: Expenses
    expect(screen.getByLabelText('Gastos mensuales aproximados')).toBeVisible()
    await user.type(screen.getByLabelText('Gastos mensuales aproximados'), '150.000')

    // Go back to Step 2
    await user.click(screen.getByRole('button', { name: 'Volver' }))
    expect(screen.getByLabelText('Ingresos mensuales aproximados')).toHaveValue('0')

    // Back to Step 1
    await user.click(screen.getByRole('button', { name: 'Volver' }))
    expect(screen.getByRole('radio', { name: /colchón financiero/i })).toBeChecked()

    // Advance forward
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByLabelText('Gastos mensuales aproximados')).toHaveValue('150.000')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    // Step 4: Contribution
    expect(screen.getByLabelText('Porcentaje de tu capacidad de ahorro')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Ver mi plan' })).toBeVisible()
  })

  it('clears and hides expenses after choosing unknown expenses', async () => {
    const user = userEvent.setup()
    render(<FinancialOnboarding />)

    // Advance through Step 1 & Step 2
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await user.type(screen.getByLabelText('Ingresos mensuales aproximados'), '500.000')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    // Step 3: Type expense then click unknown
    const expenseInput = screen.getByLabelText('Gastos mensuales aproximados')
    await user.type(expenseInput, '120.000')
    expect(screen.getByLabelText('No sé / Gasto todo lo que ingresa')).toBeVisible()
    await user.click(screen.getByLabelText('No sé / Gasto todo lo que ingresa'))
    expect(screen.queryByLabelText('Gastos mensuales aproximados')).not.toBeInTheDocument()

    // Advance to Step 4
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByLabelText('Porcentaje de tu capacidad de ahorro')).toBeVisible()
  })

  it('validates required fields with inline alerts and prevents advance', async () => {
    const user = userEvent.setup()
    render(<FinancialOnboarding />)

    // Step 1: fixed savings without amount
    await user.click(screen.getByRole('radio', { name: /quiero ahorrar cierta suma de dinero/i }))
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Ingresá un monto objetivo mayor a cero.')

    // Fix Step 1
    await user.type(screen.getByLabelText('Monto objetivo'), '1.000.000')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    // Step 2: Empty income
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Ingresá tus ingresos mensuales aproximados.')

    // Fix Step 2
    await user.type(screen.getByLabelText('Ingresos mensuales aproximados'), '400.000')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    // Step 3: Empty known expenses
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Ingresá tus gastos mensuales aproximados.')

    // Fix Step 3
    await user.type(screen.getByLabelText('Gastos mensuales aproximados'), '200.000')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    // Step 4: Invalid percentage
    await user.clear(screen.getByLabelText('Porcentaje de tu capacidad de ahorro'))
    await user.type(screen.getByLabelText('Porcentaje de tu capacidad de ahorro'), '0')
    await user.click(screen.getByRole('button', { name: 'Ver mi plan' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Ingresá un porcentaje entre 1% y 100%.')
  })

  it('submits successfully, calls router.invalidate() before toast.success', async () => {
    const user = userEvent.setup()
    vi.mocked(completeInitialPlan).mockResolvedValue({ goal: { id: 'g1' } } as never)

    render(<FinancialOnboarding />)

    // Step 1
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    // Step 2
    await user.type(screen.getByLabelText('Ingresos mensuales aproximados'), '600.000')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    // Step 3
    await user.click(screen.getByLabelText('No sé / Gasto todo lo que ingresa'))
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    // Step 4
    await user.click(screen.getByRole('button', { name: 'Ver mi plan' }))

    await waitFor(() => {
      expect(completeInitialPlan).toHaveBeenCalledWith({
        data: {
          goalKind: 'emergency_fund',
          income: '600.000',
          expensesKnowledge: 'unknown',
          expenses: '',
          plannedContribution: '30000.00',
          fixedTarget: '',
        },
      })
      expect(mockInvalidate).toHaveBeenCalledOnce()
      expect(toast.success).toHaveBeenCalledWith('Tu plan ya está listo.')
    })
  })

  it('defaults to 50% of positive savings capacity and submits the calculated contribution', async () => {
    const user = userEvent.setup()
    vi.mocked(completeInitialPlan).mockResolvedValue({ goal: { id: 'g1' } } as never)
    render(<FinancialOnboarding />)

    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await user.type(screen.getByLabelText('Ingresos mensuales aproximados'), '600.000')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await user.type(screen.getByLabelText('Gastos mensuales aproximados'), '200.000')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(screen.getByText('Capacidad de ahorro')).toBeVisible()
    expect(screen.getByLabelText('Porcentaje de tu capacidad de ahorro')).toHaveValue(50)
    expect(screen.getByLabelText('Ajustar porcentaje de ahorro')).toHaveValue('50')
    expect(screen.getByText('Aportás $ 200.000,00 por mes')).toBeVisible()

    await user.clear(screen.getByLabelText('Porcentaje de tu capacidad de ahorro'))
    await user.type(screen.getByLabelText('Porcentaje de tu capacidad de ahorro'), '25')
    expect(screen.getByLabelText('Ajustar porcentaje de ahorro')).toHaveValue('25')
    expect(screen.getByText('Aportás $ 100.000,00 por mes')).toBeVisible()

    fireEvent.change(screen.getByLabelText('Ajustar porcentaje de ahorro'), { target: { value: '75' } })
    expect(screen.getByLabelText('Porcentaje de tu capacidad de ahorro')).toHaveValue(75)
    expect(screen.getByText('Aportás $ 300.000,00 por mes')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Ver mi plan' }))
    await waitFor(() =>
      expect(completeInitialPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ plannedContribution: '300000.00' }),
        }),
      ),
    )
  })

  it.each([
    ['unknown expenses', true, undefined],
    ['expenses equal to income', false, '500.000'],
    ['expenses greater than income', false, '600.000'],
  ])('defaults to 5% of income for %s', async (_case, chooseUnknown, expense) => {
    const user = userEvent.setup()
    render(<FinancialOnboarding />)

    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await user.type(screen.getByLabelText('Ingresos mensuales aproximados'), '500.000')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    if (chooseUnknown) {
      await user.click(screen.getByLabelText('No sé / Gasto todo lo que ingresa'))
    } else {
      await user.type(screen.getByLabelText('Gastos mensuales aproximados'), expense!)
    }
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(screen.getByLabelText('Porcentaje de tu capacidad de ahorro')).toHaveValue(5)
    expect(screen.getByText('Aportás $ 25.000,00 por mes')).toBeVisible()
    expect(
      screen.getByText(
        'Tus gastos están muy cerca (o superan) tus ingresos. Vamos a empezar con un 5% de ahorro, y no te preocupes, con nuestra ayuda seguro podes ahorrar!',
      ),
    ).toBeVisible()
    if (chooseUnknown) {
      expect(screen.queryByText('Capacidad de ahorro')).toBeNull()
    }
  })

  it('submits the derived zero contribution for zero income', async () => {
    const user = userEvent.setup()
    vi.mocked(completeInitialPlan).mockResolvedValue({ goal: { id: 'g1' } } as never)
    render(<FinancialOnboarding />)

    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await user.type(screen.getByLabelText('Ingresos mensuales aproximados'), '0')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await user.click(screen.getByLabelText('No sé / Gasto todo lo que ingresa'))
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await user.click(screen.getByRole('button', { name: 'Ver mi plan' }))

    await waitFor(() =>
      expect(completeInitialPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ plannedContribution: '0.00' }),
        }),
      ),
    )
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('previews the emergency-fund USD channel and planning assumptions', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<FinancialOnboarding />)

    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await user.type(screen.getByLabelText('Ingresos mensuales aproximados'), '600.000')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await user.type(screen.getByLabelText('Gastos mensuales aproximados'), '300.000')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(screen.getByText('Ahorrar USD')).toBeVisible()
    expect(screen.getByText('Aportás $ 150.000,00 por mes')).toBeVisible()
    expect(screen.getByText('Estimado: US$ 100,00 por mes')).toBeVisible()
    expect(screen.getByText('Desde septiembre de 2026')).toBeVisible()
    expect(screen.getByText('Usamos un tipo de cambio de planificación de 1 USD = 1.500 ARS.')).toBeVisible()

    vi.useRealTimers()
  })

  it('previews the fixed-savings ARS channel without rate disclosure', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<FinancialOnboarding />)

    await user.click(screen.getByRole('radio', { name: /quiero ahorrar cierta suma de dinero/i }))
    await user.type(screen.getByLabelText('Monto objetivo'), '2.000.000')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await user.type(screen.getByLabelText('Ingresos mensuales aproximados'), '600.000')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await user.type(screen.getByLabelText('Gastos mensuales aproximados'), '300.000')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(screen.getByText('Ahorrar ARS')).toBeVisible()
    expect(screen.getByText('Aportás $ 150.000,00 por mes')).toBeVisible()
    expect(screen.queryByText(/Estimado:/i)).not.toBeInTheDocument()
    expect(screen.getByText('Desde septiembre de 2026')).toBeVisible()
    expect(screen.queryByText(/tipo de cambio/i)).not.toBeInTheDocument()

    vi.useRealTimers()
  })

  it('keeps one responsive onboarding surface with mobile bottom clearance', () => {
    const { container } = render(<FinancialOnboarding />)
    expect(container.firstElementChild).toHaveClass('max-w-2xl', 'sm:px-6', 'pb-28', 'sm:pb-24')
  })

  it('retains all fields and offers retry when completion fails', async () => {
    const user = userEvent.setup()
    vi.mocked(completeInitialPlan).mockRejectedValueOnce(new Error('database unavailable'))

    render(<FinancialOnboarding />)

    // Complete all 4 steps
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await user.type(screen.getByLabelText('Ingresos mensuales aproximados'), '700.000')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await user.type(screen.getByLabelText('Gastos mensuales aproximados'), '300.000')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await user.clear(screen.getByLabelText('Porcentaje de tu capacidad de ahorro'))
    await user.type(screen.getByLabelText('Porcentaje de tu capacidad de ahorro'), '25')
    await user.click(screen.getByRole('button', { name: 'Ver mi plan' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeVisible()
    expect(screen.getByLabelText('Porcentaje de tu capacidad de ahorro')).toHaveValue(25)

    // Retry successfully
    vi.mocked(completeInitialPlan).mockResolvedValueOnce({ created: true })
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    await waitFor(() => {
      expect(mockInvalidate).toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith('Tu plan ya está listo.')
    })
  })
})

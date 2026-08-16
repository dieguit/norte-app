// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { useRouter } from '@tanstack/react-router'
import { FinancialOnboarding } from './FinancialOnboarding'
import { completeInitialPlan } from './server'

vi.mock('@tanstack/react-router', () => ({
  useRouter: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('./server', () => ({
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

    const emergencyRadio = screen.getByRole('radio', { name: /colchón financiero/i })
    expect(emergencyRadio).toBeChecked()
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
    expect(screen.getByLabelText('Aporte mensual planificado')).toBeVisible()
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
    await user.click(screen.getByLabelText('No sé todavía'))
    expect(screen.queryByLabelText('Gastos mensuales aproximados')).not.toBeInTheDocument()

    // Advance to Step 4
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByLabelText('Aporte mensual planificado')).toBeVisible()
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

    // Step 4: Zero or empty contribution
    await user.type(screen.getByLabelText('Aporte mensual planificado'), '0')
    await user.click(screen.getByRole('button', { name: 'Ver mi plan' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Ingresá un aporte mensual mayor a cero.')
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
    await user.click(screen.getByLabelText('No sé todavía'))
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    // Step 4
    await user.type(screen.getByLabelText('Aporte mensual planificado'), '80.000')
    await user.click(screen.getByRole('button', { name: 'Ver mi plan' }))

    await waitFor(() => {
      expect(completeInitialPlan).toHaveBeenCalledWith({
        data: {
          goalKind: 'emergency_fund',
          income: '600.000',
          expensesKnowledge: 'unknown',
          expenses: '',
          plannedContribution: '80.000',
          fixedTarget: '',
        },
      })
      expect(mockInvalidate).toHaveBeenCalledOnce()
      expect(toast.success).toHaveBeenCalledWith('Tu plan ya está listo.')
    })
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
    await user.type(screen.getByLabelText('Aporte mensual planificado'), '100.000')
    await user.click(screen.getByRole('button', { name: 'Ver mi plan' }))

    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeVisible()
    expect(screen.getByLabelText('Aporte mensual planificado')).toHaveValue('100.000')

    // Retry successfully
    vi.mocked(completeInitialPlan).mockResolvedValueOnce({ goal: { id: 'g1' } } as never)
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    await waitFor(() => {
      expect(mockInvalidate).toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith('Tu plan ya está listo.')
    })
  })
})

// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { useRouter } from '@tanstack/react-router'
import { previewGoalCreation, confirmGoalCreation } from '../../../../features/goals/goals.functions'
import type {
  GoalCreationContext,
  GoalCreationPreviewResult,
} from '../../../../features/goals/goal-creation'
import { GoalCreation } from './GoalCreation'

vi.mock('@tanstack/react-router', () => ({
  useRouter: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('../../../../features/goals/goals.functions', () => ({
  previewGoalCreation: vi.fn(),
  confirmGoalCreation: vi.fn(),
}))

afterEach(cleanup)

describe('GoalCreation component (2-step flow)', () => {
  const mockInvalidate = vi.fn().mockResolvedValue(undefined)

  const defaultContext: GoalCreationContext = {
    currentMonth: '2026-08',
    expensesKnowledge: 'known',
    hasEmergencyFund: false,
    plannedMonthlyContribution: { amount: '100000.00', currency: 'ARS' },
    currentAllocation: {
      effectiveMonth: '2026-08-01',
      entries: [
        { goalId: 'goal-1', percentage: '100.00' },
      ],
    },
  }

  const makeMockPreview = (overrides?: Partial<GoalCreationPreviewResult>): GoalCreationPreviewResult => ({
    previewToken: 'a'.repeat(64),
    proposal: {
      normalizedGoal: {
        name: 'Viaje al sur',
        type: 'purchase',
        targetAmount: { amount: '3500000.00', currency: 'ARS' },
        currency: 'ARS',
        priority: 'medium',
        strategy: 'save',
        desiredDate: '2027-04-01',
      },
      allocation: {
        monthlyContribution: { amount: '100000.00', currency: 'ARS' },
        effectiveMonth: '2026-09-01',
        totalPercentage: '100.00',
        entries: [
          {
            goalId: 'goal-1',
            goalName: 'Fondo de emergencia',
            percentage: '60.00',
            allocatedBaseAmount: { amount: '60000.00', currency: 'ARS' },
            allocatedDestinationAmount: { amount: '60000.00', currency: 'ARS' },
            pending: false,
          },
          {
            goalId: 'pending-goal',
            goalName: 'Viaje al sur',
            percentage: '40.00',
            allocatedBaseAmount: { amount: '40000.00', currency: 'ARS' },
            allocatedDestinationAmount: { amount: '40000.00', currency: 'ARS' },
            pending: true,
          },
        ],
      },
      impacts: [
        {
          goalId: 'pending-goal',
          goalName: 'Viaje al sur',
          before: { status: 'not_created' },
          after: { status: 'available', completionMonth: '2027-04' },
        },
        {
          goalId: 'goal-1',
          goalName: 'Fondo de emergencia',
          before: {
            status: 'existing',
            projection: { status: 'available', completionMonth: '2026-12' },
            allocatedMonthlyAmounts: [{ amount: '100000.00', currency: 'ARS' }],
          },
          after: { status: 'available', completionMonth: '2027-02' },
        },
      ],
      proposedSource: {
        profile: null,
        goals: [],
        savingsPositions: [],
        investmentPositions: [],
        snapshots: [],
        allocations: [],
      },
    },
    ...overrides,
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRouter).mockReturnValue({
      invalidate: mockInvalidate,
    } as any)
  })

  describe('Step 1: Objective fields & strategy', () => {
    it('renders Step 1 of 2 header and validates required fields with Spanish messages', async () => {
      const user = userEvent.setup()
      const onCancel = vi.fn()
      const onCreated = vi.fn()

      render(<GoalCreation context={defaultContext} onCancel={onCancel} onCreated={onCreated} />)

      // Step 1 header and progress
      expect(screen.getByRole('heading', { name: '1. Objetivo' })).toBeVisible()
      expect(screen.getByText('Paso 1 de 2')).toBeVisible()

      // Priority field should be hidden from UI
      expect(screen.queryByLabelText('Prioridad')).not.toBeInTheDocument()

      // Default strategy is Ahorrar and it is checked
      const saveRadio = screen.getByRole('radio', { name: 'Ahorrar' })
      expect(saveRadio).toBeChecked()

      // Attempt to continue with empty name and target
      await user.click(screen.getByRole('button', { name: /continuar a la distribución/i }))

      expect(screen.getByText('Ingresá un nombre.')).toBeVisible()
      expect(screen.getByText('Ingresá un monto objetivo mayor a cero.')).toBeVisible()

      // Cancel button works
      await user.click(screen.getByRole('button', { name: 'Cancelar' }))
      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('toggles strategy exclusively and conditionally displays investment assumptions', async () => {
      const user = userEvent.setup()

      render(<GoalCreation context={defaultContext} onCancel={vi.fn()} onCreated={vi.fn()} />)

      const saveRadio = screen.getByRole('radio', { name: 'Ahorrar' })
      const investRadio = screen.getByRole('radio', { name: 'Invertir' })

      expect(saveRadio).toBeChecked()
      expect(investRadio).not.toBeChecked()
      expect(screen.queryByLabelText(/rendimiento anual estimado/i)).not.toBeInTheDocument()

      // Select Invertir
      await user.click(investRadio)
      expect(investRadio).toBeChecked()
      expect(saveRadio).not.toBeChecked()

      // Investment fields now visible
      expect(screen.getByLabelText(/rendimiento anual estimado/i)).toBeVisible()
      expect(screen.getByLabelText(/disponibilidad de los fondos/i)).toBeVisible()

      // Switch back to Ahorrar
      await user.click(saveRadio)
      expect(saveRadio).toBeChecked()
      expect(investRadio).not.toBeChecked()
      expect(screen.queryByLabelText(/rendimiento anual estimado/i)).not.toBeInTheDocument()
    })

    it('requires future desired month when specified', async () => {
      const user = userEvent.setup()

      render(<GoalCreation context={defaultContext} onCancel={vi.fn()} onCreated={vi.fn()} />)

      await user.type(screen.getByLabelText(/nombre/i), 'Auto nuevo')
      await user.type(screen.getByLabelText(/monto objetivo/i), '5000000')

      // Open month picker
      await user.click(screen.getByRole('button', { name: /mes objetivo/i }))

      // Current month (August 2026) is disabled
      expect(screen.getByRole('button', { name: 'Ago' })).toBeDisabled()

      // Select a future month (September 2026)
      await user.click(screen.getByRole('button', { name: 'Sep' }))

      expect(screen.getByRole('button', { name: /mes objetivo/i })).toHaveTextContent(/septiembre de 2026/i)
    })

    it('emergency fund prefills name, locks USD, and explains unknown expenses', async () => {
      const user = userEvent.setup()
      const contextUnknown: GoalCreationContext = {
        currentMonth: '2026-08',
        expensesKnowledge: 'unknown',
        hasEmergencyFund: false,
      }

      render(<GoalCreation context={contextUnknown} onCancel={vi.fn()} onCreated={vi.fn()} />)

      // Change type to emergency_fund
      const typeSelect = screen.getByLabelText(/tipo de objetivo/i)
      await user.click(typeSelect)
      await user.click(screen.getByRole('option', { name: /colchón financiero/i }))

      // Name should be prefilled
      expect(screen.getByLabelText(/nombre/i)).toHaveValue('Colchón financiero')

      // Currency is locked to USD
      expect(screen.getAllByText(/USD|Dólares/i)[0]).toBeVisible()

      // Explains unknown expenses
      expect(
        screen.getByText(/vamos a calcular el monto sugerido una vez que definas tus gastos/i),
      ).toBeVisible()
    })
  })

  describe('Step 2: Distribution and impact flow', () => {
    it('validates Step 1, requests preview, seeds allocations, and enters Step 2 of 2', async () => {
      const user = userEvent.setup()
      const mockPreview = makeMockPreview()
      vi.mocked(previewGoalCreation).mockResolvedValue(mockPreview)

      render(<GoalCreation context={defaultContext} onCancel={vi.fn()} onCreated={vi.fn()} />)

      await user.type(screen.getByLabelText(/nombre/i), 'Viaje al sur')
      await user.type(screen.getByLabelText(/monto objetivo/i), '3500000')

      expect(previewGoalCreation).not.toHaveBeenCalled()

      // Click "Continuar a la distribución"
      await user.click(screen.getByRole('button', { name: /continuar a la distribución/i }))

      // Validates and immediately requests preview
      await waitFor(() => {
        expect(previewGoalCreation).toHaveBeenCalledTimes(1)
      })

      // Step 2 header & progress
      expect(await screen.findByRole('heading', { name: '2. Distribución e impacto' })).toBeVisible()
      expect(screen.getByText('Paso 2 de 2')).toBeVisible()

      // Trajectories rendered
      expect((await screen.findAllByText('Antes'))[0]).toBeVisible()
      expect(screen.getAllByText('Con este cambio')[0]).toBeVisible()
      expect(screen.getByText('Objetivo todavía no creado')).toBeVisible()

      // Allocation entries rendered
      expect(screen.getAllByText('Fondo de emergencia')[0]).toBeVisible()
      expect(screen.getAllByText('Viaje al sur')[0]).toBeVisible()
    })

    it('navigates back to Step 1 preserving values and allows returning to Step 2', async () => {
      const user = userEvent.setup()
      const mockPreview = makeMockPreview()
      vi.mocked(previewGoalCreation).mockResolvedValue(mockPreview)

      render(<GoalCreation context={defaultContext} onCancel={vi.fn()} onCreated={vi.fn()} />)

      await user.type(screen.getByLabelText(/nombre/i), 'Casa propia')
      await user.type(screen.getByLabelText(/monto objetivo/i), '25000000')
      await user.click(screen.getByRole('radio', { name: 'Invertir' }))

      await user.click(screen.getByRole('button', { name: /continuar a la distribución/i }))

      expect(await screen.findByRole('heading', { name: '2. Distribución e impacto' })).toBeVisible()

      // Click Volver to return to Step 1
      await user.click(screen.getByRole('button', { name: 'Volver' }))

      expect(screen.getByRole('heading', { name: '1. Objetivo' })).toBeVisible()
      expect(screen.getByText('Paso 1 de 2')).toBeVisible()
      expect(screen.getByLabelText(/nombre/i)).toHaveValue('Casa propia')
      expect(screen.getByLabelText(/monto objetivo/i)).toHaveValue('25.000.000')
      expect(screen.getByRole('radio', { name: 'Invertir' })).toBeChecked()
    })

    it('disables submit button and shows warning when allocations total != 100%', async () => {
      const user = userEvent.setup()
      const mockPreview = makeMockPreview()
      vi.mocked(previewGoalCreation).mockResolvedValue(mockPreview)

      render(<GoalCreation context={defaultContext} onCancel={vi.fn()} onCreated={vi.fn()} />)

      await user.type(screen.getByLabelText(/nombre/i), 'Viaje al sur')
      await user.type(screen.getByLabelText(/monto objetivo/i), '3500000')
      await user.click(screen.getByRole('button', { name: /continuar a la distribución/i }))

      await screen.findAllByText('Con este cambio')

      // Edit percentage to an invalid non-numeric value
      const input = screen.getByRole('textbox', { name: /porcentaje para viaje al sur/i })
      fireEvent.change(input, { target: { value: 'abc' } })

      expect(screen.getByText('Completá la distribución para calcular el impacto')).toBeVisible()
      expect(screen.getByRole('button', { name: 'Crear objetivo y actualizar Plan' })).toBeDisabled()
      expect(screen.queryByText('Con este cambio')).not.toBeInTheDocument()
    })

    it('handles stale preview on confirmation, displays alert, merges allocations, and stays on Step 2', async () => {
      const user = userEvent.setup()
      const mockPreview = makeMockPreview()
      const refreshedPreview = makeMockPreview({
        previewToken: 'b'.repeat(64),
      })

      vi.mocked(previewGoalCreation).mockResolvedValue(mockPreview)
      vi.mocked(confirmGoalCreation).mockResolvedValueOnce({
        status: 'stale',
        preview: refreshedPreview,
      })

      render(<GoalCreation context={defaultContext} onCancel={vi.fn()} onCreated={vi.fn()} />)

      await user.type(screen.getByLabelText(/nombre/i), 'Viaje al sur')
      await user.type(screen.getByLabelText(/monto objetivo/i), '3500000')
      await user.click(screen.getByRole('button', { name: /continuar a la distribución/i }))

      await screen.findAllByText('Con este cambio')

      // Submit confirmation
      await user.click(screen.getByRole('button', { name: 'Crear objetivo y actualizar Plan' }))

      // Stale response received
      expect(
        await screen.findByText('Tu Plan cambió. Revisá la distribución actualizada antes de confirmar.'),
      ).toBeVisible()

      // User stays on Step 2 (Impact)
      expect(screen.getByRole('heading', { name: '2. Distribución e impacto' })).toBeVisible()
      expect(screen.getByRole('button', { name: 'Crear objetivo y actualizar Plan' })).toBeVisible()
    })

    it('handles persistence error, focuses error summary, and succeeds on retry', async () => {
      const user = userEvent.setup()
      const mockPreview = makeMockPreview()
      const onCreated = vi.fn()

      vi.mocked(previewGoalCreation).mockResolvedValue(mockPreview)
      vi.mocked(confirmGoalCreation)
        .mockRejectedValueOnce(new Error('Error de conexión con el servidor.'))
        .mockResolvedValueOnce({ status: 'created', goalId: 'goal-99' })

      render(<GoalCreation context={defaultContext} onCancel={vi.fn()} onCreated={onCreated} />)

      await user.type(screen.getByLabelText(/nombre/i), 'Viaje al sur')
      await user.type(screen.getByLabelText(/monto objetivo/i), '3500000')
      await user.click(screen.getByRole('button', { name: /continuar a la distribución/i }))

      await screen.findAllByText('Con este cambio')

      // Confirm fails
      await user.click(screen.getByRole('button', { name: 'Crear objetivo y actualizar Plan' }))

      expect(await screen.findByText('Error de conexión con el servidor.')).toBeVisible()

      // Error summary should be focused
      const errorSummary = screen.getByRole('alert')
      expect(errorSummary).toHaveFocus()

      // Retry
      await user.click(screen.getByRole('button', { name: 'Crear objetivo y actualizar Plan' }))

      await waitFor(() => {
        expect(mockInvalidate).toHaveBeenCalledTimes(1)
        expect(toast.success).toHaveBeenCalledWith('Objetivo creado y Plan actualizado.')
        expect(onCreated).toHaveBeenCalledTimes(1)
      })
    })
  })
})

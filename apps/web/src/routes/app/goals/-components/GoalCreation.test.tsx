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

describe('GoalCreation component', () => {
  const mockInvalidate = vi.fn().mockResolvedValue(undefined)

  const defaultContext: GoalCreationContext = {
    currentMonth: '2026-08',
    expensesKnowledge: 'known',
    hasEmergencyFund: false,
    fundingOptions: [
      {
        fundingMethod: 'save',
        destinationCurrency: 'ARS',
        baseCurrency: 'ARS',
        monthlyCommitment: { amount: '100000.00', currency: 'ARS' },
        commitmentStatus: 'active',
      },
    ],
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
        desiredDate: '2027-04-01',
        saveEnabled: true,
        investEnabled: false,
      },
      allocationGroups: [
        {
          key: 'save:ARS',
          fundingMethod: 'save',
          destinationCurrency: 'ARS',
          baseCurrency: 'ARS',
          monthlyCommitment: { amount: '100000.00', currency: 'ARS' },
          destinationCommitment: { amount: '100000.00', currency: 'ARS' },
          effectiveMonth: '2026-09-01',
          totalPercentage: '100.00',
          entries: [
            {
              goalId: 'goal-1',
              goalName: 'Fondo de emergencia',
              percentage: '60.00',
              allocatedDestinationAmount: { amount: '60000.00', currency: 'ARS' },
              pending: false,
            },
            {
              goalId: 'pending-goal',
              goalName: 'Viaje al sur',
              percentage: '40.00',
              allocatedDestinationAmount: { amount: '40000.00', currency: 'ARS' },
              pending: true,
            },
          ],
        },
      ],
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
        channels: [],
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

  describe('Step 1: Objective and Plan interactions', () => {
    it('validates required objective fields and displays Spanish validation errors', async () => {
      const user = userEvent.setup()
      const onCancel = vi.fn()
      const onCreated = vi.fn()

      render(<GoalCreation context={defaultContext} onCancel={onCancel} onCreated={onCreated} />)

      // Step 1: Objective is active
      expect(screen.getByRole('heading', { name: /objetivo/i })).toBeVisible()

      // Default priority should be medium
      expect(screen.getByText('Prioridad media')).toBeVisible()

      // Attempt to continue with empty name and target
      await user.click(screen.getByRole('button', { name: /continuar/i }))

      expect(screen.getByText('Ingresá un nombre.')).toBeVisible()
      expect(screen.getByText('Ingresá un monto objetivo mayor a cero.')).toBeVisible()

      // Cancel button works
      await user.click(screen.getByRole('button', { name: 'Cancelar' }))
      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('requires future desired month for fixed goals when desired month is entered', async () => {
      const user = userEvent.setup()

      render(<GoalCreation context={defaultContext} onCancel={vi.fn()} onCreated={vi.fn()} />)

      await user.type(screen.getByLabelText(/nombre/i), 'Auto nuevo')
      await user.type(screen.getByLabelText(/monto objetivo/i), '5000000')

      // Open month picker
      await user.click(screen.getByRole('button', { name: /mes objetivo/i }))

      // Current month (August 2026) is disabled
      expect(screen.getByRole('button', { name: 'Ago' })).toBeDisabled()

      // Select a future month (e.g. September 2026)
      await user.click(screen.getByRole('button', { name: 'Sep' }))

      // Visible trigger value changes
      expect(screen.getByRole('button', { name: /mes objetivo/i })).toHaveTextContent(/septiembre de 2026/i)

      // Advances to Plan stage
      await user.click(screen.getByRole('button', { name: /continuar/i }))
      expect(screen.getByRole('heading', { name: /plan/i })).toBeVisible()
    })

    it('emergency fund prefills name, locks USD, defaults saving, and explains unknown expenses', async () => {
      const user = userEvent.setup()
      const contextUnknown: GoalCreationContext = {
        currentMonth: '2026-08',
        expensesKnowledge: 'unknown',
        hasEmergencyFund: false,
        fundingOptions: [],
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

      // Switching away from emergency fund resets the name
      fireEvent.click(screen.getByLabelText(/tipo de objetivo/i))
      await user.click(screen.getByRole('option', { name: /otro objetivo/i }))
      expect(screen.getByLabelText(/nombre del objetivo/i)).toHaveValue('')

      // Switch back to emergency fund
      fireEvent.click(screen.getByLabelText(/tipo de objetivo/i))
      await user.click(screen.getByRole('option', { name: /colchón financiero/i }))
      expect(screen.getByLabelText(/nombre del objetivo/i)).toHaveValue('Colchón financiero')

      // Target amount input is not required for emergency fund
      await user.click(screen.getByRole('button', { name: /continuar/i }))

      // Transitions to Plan
      expect(screen.getByRole('heading', { name: /plan/i })).toBeVisible()
    })

    it('hides emergency fund option when context hasEmergencyFund is true', async () => {
      const user = userEvent.setup()
      const contextWithEmergencyFund: GoalCreationContext = {
        ...defaultContext,
        hasEmergencyFund: true,
      }

      render(<GoalCreation context={contextWithEmergencyFund} onCancel={vi.fn()} onCreated={vi.fn()} />)

      const typeSelect = screen.getByLabelText(/tipo de objetivo/i)
      await user.click(typeSelect)

      expect(screen.queryByRole('option', { name: /colchón financiero/i })).not.toBeInTheDocument()
      expect(screen.getByRole('option', { name: /compra o gasto grande/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /jubilación/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /otro objetivo/i })).toBeInTheDocument()
    })

    it('plan requires at least one method', async () => {
      const user = userEvent.setup()

      render(<GoalCreation context={defaultContext} onCancel={vi.fn()} onCreated={vi.fn()} />)

      await user.type(screen.getByLabelText(/nombre/i), 'Auto nuevo')
      await user.type(screen.getByLabelText(/monto objetivo/i), '5000000')
      await user.click(screen.getByRole('button', { name: /continuar/i }))

      expect(screen.getByRole('heading', { name: /plan/i })).toBeVisible()

      // Uncheck saveEnabled (investEnabled is false by default)
      const saveCheckbox = screen.getByRole('checkbox', { name: /ahorrar/i })
      expect(saveCheckbox).toBeChecked()
      await user.click(saveCheckbox)

      await user.click(screen.getByRole('button', { name: /continuar/i }))

      expect(screen.getByText('Elegí ahorrar, invertir o ambas opciones.')).toBeVisible()
    })

    it('shows established commitment as read-only, and missing commitment with define option', async () => {
      const user = userEvent.setup()
      // Context has save in ARS established ($100.000), but no invest in ARS
      render(<GoalCreation context={defaultContext} onCancel={vi.fn()} onCreated={vi.fn()} />)

      await user.type(screen.getByLabelText(/nombre/i), 'Vacaciones')
      await user.type(screen.getByLabelText(/monto objetivo/i), '1000000')
      await user.click(screen.getByRole('button', { name: /continuar/i }))

      // Save has established commitment
      expect(screen.getByText(/\$ 100\.000/i)).toBeVisible()
      expect(screen.queryByRole('checkbox', { name: /definir aporte mensual para ahorrar/i })).not.toBeInTheDocument()

      // Enable investing (which has no established commitment in context)
      const investCheckbox = screen.getByRole('checkbox', { name: /invertir/i })
      await user.click(investCheckbox)

      // Reveals define commitment for investing
      const defineInvest = screen.getByRole('checkbox', { name: /definir aporte mensual para invertir/i })
      expect(defineInvest).toBeVisible()
      expect(defineInvest).not.toBeChecked()

      // Check define commitment reveals input
      await user.click(defineInvest)
      const investCommitmentInput = screen.getByRole('textbox', {
        name: /aporte mensual para invertir/i,
      })
      expect(investCommitmentInput).toBeVisible()

      // Also investing controls are revealed
      expect(screen.getByLabelText(/rendimiento/i)).toBeVisible()
      expect(screen.getByLabelText(/disponibilidad/i)).toBeVisible()
    })

    it('preserves form values when navigating back and forward', async () => {
      const user = userEvent.setup()

      render(<GoalCreation context={defaultContext} onCancel={vi.fn()} onCreated={vi.fn()} />)

      await user.type(screen.getByLabelText(/nombre/i), 'Casa propia')
      await user.type(screen.getByLabelText(/monto objetivo/i), '25000000')
      await user.click(screen.getByRole('button', { name: /continuar/i }))

      expect(screen.getByRole('heading', { name: /plan/i })).toBeVisible()

      // Click Volver to return to Objective
      await user.click(screen.getByRole('button', { name: 'Volver' }))

      expect(screen.getByRole('heading', { name: /objetivo/i })).toBeVisible()
      expect(screen.getByLabelText(/nombre/i)).toHaveValue('Casa propia')
      expect(screen.getByLabelText(/monto objetivo/i)).toHaveValue('25.000.000')
    })

    it('advances a valid objective to the plan stage and displays updated plan heading', async () => {
      const user = userEvent.setup()

      render(<GoalCreation context={defaultContext} onCancel={vi.fn()} onCreated={vi.fn()} />)

      await user.type(screen.getByLabelText(/nombre/i), 'Auto nuevo')
      await user.type(screen.getByLabelText(/monto objetivo/i), '5000000')
      await user.click(screen.getByRole('button', { name: /continuar/i }))

      expect(screen.getByRole('heading', { name: /plan/i })).toBeVisible()
      expect(
        screen.getByRole('heading', { name: '¿Qué necesitas para conseguir este objetivo?' }),
      ).toBeVisible()
    })
  })

  describe('Step 2: Impact lifecycle', () => {
    it('requests preview only after valid Objective and Plan, and renders trajectories', async () => {
      const user = userEvent.setup()
      const mockPreview = makeMockPreview()
      vi.mocked(previewGoalCreation).mockResolvedValue(mockPreview)

      render(<GoalCreation context={defaultContext} onCancel={vi.fn()} onCreated={vi.fn()} />)

      // Stage 1
      await user.type(screen.getByLabelText(/nombre/i), 'Viaje al sur')
      await user.type(screen.getByLabelText(/monto objetivo/i), '3500000')
      await user.click(screen.getByRole('button', { name: /continuar/i }))

      // Stage 2
      expect(previewGoalCreation).not.toHaveBeenCalled()
      await user.click(screen.getByRole('button', { name: /continuar/i }))

      // Stage 3 - preview requested
      await waitFor(() => {
        expect(previewGoalCreation).toHaveBeenCalledTimes(1)
      })

      // Trajectories rendered with exact Spanish labels
      expect((await screen.findAllByText('Antes'))[0]).toBeVisible()
      expect(screen.getAllByText('Con este cambio')[0]).toBeVisible()
      expect(screen.getByText('Objetivo todavía no creado')).toBeVisible()

      // Allocation editor rendered with compatible goals
      expect(screen.getAllByText('Fondo de emergencia')[0]).toBeVisible()
      expect(screen.getAllByText('Viaje al sur')[0]).toBeVisible()
    })

    it('disables confirmation and hides trajectories when total percentage is invalid', async () => {
      const user = userEvent.setup()
      const mockPreview = makeMockPreview()
      vi.mocked(previewGoalCreation).mockResolvedValue(mockPreview)

      render(<GoalCreation context={defaultContext} onCancel={vi.fn()} onCreated={vi.fn()} />)

      await user.type(screen.getByLabelText(/nombre/i), 'Viaje al sur')
      await user.type(screen.getByLabelText(/monto objetivo/i), '3500000')
      await user.click(screen.getByRole('button', { name: /continuar/i }))
      await user.click(screen.getByRole('button', { name: /continuar/i }))

      await screen.findAllByText('Con este cambio')

      // Edit percentage to an invalid non-numeric value
      const input = screen.getByRole('textbox', { name: /porcentaje para viaje al sur/i })
      fireEvent.change(input, { target: { value: 'abc' } })

      // Invalid input prevents rebalancing and makes total != 100%
      expect(screen.getByText('Completá la distribución para calcular el impacto')).toBeVisible()
      expect(screen.getByRole('button', { name: 'Crear objetivo y actualizar Plan' })).toBeDisabled()
      expect(screen.queryByText('Con este cambio')).not.toBeInTheDocument()
    })

    it('refreshes preview after percentage commit on blur or slider change', async () => {
      const user = userEvent.setup()
      const mockPreview1 = makeMockPreview()
      const mockPreview2 = makeMockPreview({
        proposal: {
          ...mockPreview1.proposal,
          impacts: [
            {
              goalId: 'pending-goal',
              goalName: 'Viaje al sur',
              before: { status: 'not_created' },
              after: { status: 'available', completionMonth: '2027-02' },
            },
          ],
        },
      })

      vi.mocked(previewGoalCreation)
        .mockResolvedValueOnce(mockPreview1)
        .mockResolvedValueOnce(mockPreview2)

      render(<GoalCreation context={defaultContext} onCancel={vi.fn()} onCreated={vi.fn()} />)

      await user.type(screen.getByLabelText(/nombre/i), 'Viaje al sur')
      await user.type(screen.getByLabelText(/monto objetivo/i), '3500000')
      await user.click(screen.getByRole('button', { name: /continuar/i }))
      await user.click(screen.getByRole('button', { name: /continuar/i }))

      await screen.findAllByText('Con este cambio')
      expect(previewGoalCreation).toHaveBeenCalledTimes(1)

      // Edit percentage: setting fondo de emergencia to 50% automatically rebalances viaje al sur to 50%
      const input1 = screen.getByRole('textbox', { name: /porcentaje para fondo de emergencia/i })
      fireEvent.change(input1, { target: { value: '50' } })

      // Blur to trigger commit
      fireEvent.blur(input1)

      await waitFor(() => {
        expect(previewGoalCreation).toHaveBeenCalledTimes(2)
      })
    })

    it('handles stale confirmation by merging still-eligible percentages, updating token, showing error, and staying on stage 3', async () => {
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
      await user.click(screen.getByRole('button', { name: /continuar/i }))
      await user.click(screen.getByRole('button', { name: /continuar/i }))

      await screen.findAllByText('Con este cambio')

      // Submit confirmation
      await user.click(screen.getByRole('button', { name: 'Crear objetivo y actualizar Plan' }))

      // Stale response received
      expect(
        await screen.findByText('Tu Plan cambió. Revisá la distribución actualizada antes de confirmar.'),
      ).toBeVisible()

      // User stays on stage 3 (Impact)
      expect(screen.getByRole('button', { name: 'Crear objetivo y actualizar Plan' })).toBeVisible()
    })

    it('handles persistence error, focuses error summary, preserves draft, and succeeds on retry', async () => {
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
      await user.click(screen.getByRole('button', { name: /continuar/i }))
      await user.click(screen.getByRole('button', { name: /continuar/i }))

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

    it('rebalances existing allocation entries proportionally when adjusting pending goal slider', async () => {
      const user = userEvent.setup()
      const mockPreview = makeMockPreview({
        proposal: {
          ...makeMockPreview().proposal,
          allocationGroups: [
            {
              key: 'save:ARS',
              fundingMethod: 'save',
              destinationCurrency: 'ARS',
              baseCurrency: 'ARS',
              monthlyCommitment: { amount: '100000.00', currency: 'ARS' },
              destinationCommitment: { amount: '100000.00', currency: 'ARS' },
              effectiveMonth: '2026-09-01',
              totalPercentage: '100.00',
              entries: [
                {
                  goalId: 'pending-goal',
                  goalName: 'Viaje al sur',
                  percentage: '0.00',
                  allocatedDestinationAmount: { amount: '0.00', currency: 'ARS' },
                  pending: true,
                },
                {
                  goalId: 'goal-1',
                  goalName: 'Fondo de emergencia',
                  percentage: '70.00',
                  allocatedDestinationAmount: { amount: '70000.00', currency: 'ARS' },
                  pending: false,
                },
                {
                  goalId: 'goal-2',
                  goalName: 'Vacaciones',
                  percentage: '30.00',
                  allocatedDestinationAmount: { amount: '30000.00', currency: 'ARS' },
                  pending: false,
                },
              ],
            },
          ],
        },
      })

      vi.mocked(previewGoalCreation).mockResolvedValue(mockPreview)

      render(<GoalCreation context={defaultContext} onCancel={vi.fn()} onCreated={vi.fn()} />)

      await user.type(screen.getByLabelText(/nombre/i), 'Viaje al sur')
      await user.type(screen.getByLabelText(/monto objetivo/i), '3500000')
      await user.click(screen.getByRole('button', { name: /continuar/i }))
      await user.click(screen.getByRole('button', { name: /continuar/i }))

      await screen.findAllByText('Con este cambio')

      // Find the sliders and change the first slider (pending goal) to 20
      const sliders = screen.getAllByRole('slider', { hidden: true })
      fireEvent.change(sliders[0], { target: { value: '20' } })

      // Verify the three percentage inputs read 20,00, 56,00, and 24,00 before committing
      const pendingInput = screen.getByRole('textbox', { name: /porcentaje para viaje al sur/i })
      const goal1Input = screen.getByRole('textbox', {
        name: /porcentaje para fondo de emergencia/i,
      })
      const goal2Input = screen.getByRole('textbox', { name: /porcentaje para vacaciones/i })

      expect(pendingInput).toHaveValue('20,00')
      expect(goal1Input).toHaveValue('56,00')
      expect(goal2Input).toHaveValue('24,00')
    })
  })
})

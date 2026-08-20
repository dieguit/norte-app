// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  GoalCreationContext,
  GoalCreationPreviewResult,
} from '../../../../features/goals/goal-creation'
import { AllocationImpactComparison } from './AllocationImpactComparison'
import { GoalImpact } from './GoalImpact'
import { useGoalCreationForm } from './useGoalCreationForm'

afterEach(cleanup)

describe('GoalImpact component', () => {
  const defaultContext: GoalCreationContext = {
    currentMonth: '2026-08',
    expensesKnowledge: 'known',
    hasEmergencyFund: false,
    plannedMonthlyContribution: { amount: '120000.00', currency: 'ARS' },
  }

  const makeMockPreview = (
    overrides?: Partial<GoalCreationPreviewResult>,
  ): GoalCreationPreviewResult => ({
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
        monthlyContribution: { amount: '120000.00', currency: 'ARS' },
        effectiveMonth: '2026-09-01',
        totalPercentage: '100.00',
        entries: [
          {
            goalId: 'pending-goal',
            goalName: 'Viaje al sur',
            percentage: '40.00',
            allocatedBaseAmount: { amount: '48000.00', currency: 'ARS' },
            allocatedDestinationAmount: { amount: '48000.00', currency: 'ARS' },
            pending: true,
          },
          {
            goalId: 'goal-1',
            goalName: 'Fondo de emergencia',
            percentage: '60.00',
            allocatedBaseAmount: { amount: '72000.00', currency: 'ARS' },
            allocatedDestinationAmount: { amount: '48.00', currency: 'USD' },
            pending: false,
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
            projection: { status: 'available', completionMonth: '2027-01' },
            allocatedMonthlyAmounts: [{ amount: '120000.00', currency: 'ARS' }],
          },
          after: { status: 'available', completionMonth: '2027-03' },
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

  function TestHarness(props: {
    preview?: GoalCreationPreviewResult | null
    isPreviewPending?: boolean
    onPercentageCommit?: () => void
    initialDraft?: Parameters<typeof useGoalCreationForm>[0]
  }) {
    const form = useGoalCreationForm(props.initialDraft)
    return (
      <GoalImpact
        form={form}
        context={defaultContext}
        preview={props.preview !== undefined ? props.preview : makeMockPreview()}
        isPreviewPending={props.isPreviewPending ?? false}
        onPercentageCommit={props.onPercentageCommit ?? vi.fn()}
      />
    )
  }

  it('renders allocation editor and impact comparison rows', () => {
    render(<TestHarness />)

    // Allocation editor elements
    expect(screen.getByText('Distribución de tu aporte mensual')).toBeVisible()
    expect(screen.getByText('Tu aporte mensual')).toBeVisible()
    expect(screen.getByText('$ 120.000,00')).toBeVisible()

    // Impact section elements
    expect(screen.getByText('Impacto en las fechas')).toBeVisible()

    // Pending goal impact
    expect(screen.getAllByText('Viaje al sur').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Objetivo todavía no creado')).toBeVisible()
    expect(screen.getByText('abril de 2027')).toBeVisible()

    // Existing goal impact
    expect(screen.getAllByText('Fondo de emergencia').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('enero de 2027')).toBeVisible()
    expect(screen.getByText('marzo de 2027')).toBeVisible()

    // Comparison labels
    expect(screen.getAllByText('Antes')).toHaveLength(2)
    expect(screen.getAllByText('Con este cambio')).toHaveLength(2)
  })

  it('updates form field allocations and calls onPercentageCommit on blur', async () => {
    const user = userEvent.setup()
    const onPercentageCommit = vi.fn()

    render(<TestHarness onPercentageCommit={onPercentageCommit} />)

    const input = screen.getByRole('textbox', { name: /porcentaje para viaje al sur/i })
    await user.clear(input)
    await user.type(input, '50')

    await user.tab()
    expect(onPercentageCommit).toHaveBeenCalled()
  })

  it('shows pending update indicator when isPreviewPending is true', () => {
    render(<TestHarness isPreviewPending={true} />)

    expect(screen.getByText('Actualizando impacto...')).toBeVisible()
  })

  it('shows outdated projection indicator when draft allocation differs from preview', async () => {
    const user = userEvent.setup()

    render(<TestHarness />)

    expect(screen.queryByText('Proyección pendiente de actualización')).not.toBeInTheDocument()

    const input = screen.getByRole('textbox', { name: /porcentaje para viaje al sur/i })
    await user.clear(input)
    await user.type(input, '50')

    expect(screen.getByText('Proyección pendiente de actualización')).toBeVisible()
  })

  it('displays invalid distribution notice when percentages do not sum to 100%', async () => {
    render(
      <TestHarness
        initialDraft={{
          allocations: [
            { goalId: 'pending-goal', percentage: '20.00' },
            { goalId: 'goal-1', percentage: '30.00' },
          ],
        }}
      />,
    )

    expect(screen.getByText('Completá la distribución para calcular el impacto')).toBeVisible()
    expect(screen.queryByText('Objetivo todavía no creado')).not.toBeInTheDocument()
  })
})

describe('AllocationImpactComparison component', () => {
  it('renders existing-goal comparisons with before/after projection months', () => {
    render(
      <AllocationImpactComparison
        impacts={[
          {
            goalId: 'goal-1',
            goalName: 'Fondo de emergencia',
            before: {
              status: 'existing',
              projection: { status: 'available', completionMonth: '2027-01' },
            },
            after: { status: 'available', completionMonth: '2027-03' },
          },
        ]}
      />,
    )

    expect(screen.getByText('Fondo de emergencia')).toBeVisible()
    expect(screen.getByText('Antes')).toBeVisible()
    expect(screen.getByText('Con este cambio')).toBeVisible()
    expect(screen.getByText('enero de 2027')).toBeVisible()
    expect(screen.getByText('marzo de 2027')).toBeVisible()
  })

  it('renders pending goal with custom beforeNotCreatedLabel', () => {
    render(
      <AllocationImpactComparison
        impacts={[
          {
            goalId: 'pending-goal',
            goalName: 'Viaje al sur',
            before: { status: 'not_created' },
            after: { status: 'available', completionMonth: '2027-04' },
          },
        ]}
        beforeNotCreatedLabel="Objetivo todavía no creado"
      />,
    )

    expect(screen.getByText('Viaje al sur')).toBeVisible()
    expect(screen.getByText('Objetivo todavía no creado')).toBeVisible()
    expect(screen.getByText('abril de 2027')).toBeVisible()
  })

  it('renders nothing when impacts array is empty', () => {
    const { container } = render(<AllocationImpactComparison impacts={[]} />)
    expect(container.firstChild).toBeNull()
  })
})


// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { GoalWorkspaceItem } from '../../../../features/goals/goals'
import { GoalDetail } from './GoalDetail'

afterEach(cleanup)

function makeGoal(overrides: Partial<GoalWorkspaceItem> = {}): GoalWorkspaceItem {
  return {
    id: 'goal-detail-1',
    name: 'Comprar departamento',
    type: 'custom',
    currency: 'USD',
    priority: 'high',
    status: 'active',
    createdAt: '2026-01-15T10:00:00Z',
    desiredDate: '2029-12-01T00:00:00Z',
    targetAmount: { amount: '50000.00', currency: 'USD' },
    savingsValue: { amount: '5000.00', currency: 'USD' },
    investmentValue: { amount: '10000.00', currency: 'USD' },
    actualValue: { amount: '15000.00', currency: 'USD' },
    progressPercentage: '30.00',
    saveEnabled: true,
    investEnabled: true,
    funding: [
      {
        channelId: 'ch-save',
        fundingMethod: 'save',
        destinationCurrency: 'USD',
        percentage: '60.00',
        commitmentStatus: 'active',
        monthlyCommitment: { amount: '150000.00', currency: 'ARS' },
        allocatedBaseAmount: { amount: '90000.00', currency: 'ARS' },
        allocatedDestinationAmount: { amount: '60.00', currency: 'USD' },
        effectiveMonth: '2026-09',
      },
      {
        channelId: 'ch-invest',
        fundingMethod: 'invest',
        destinationCurrency: 'USD',
        percentage: '40.00',
        commitmentStatus: 'active',
        monthlyCommitment: { amount: '150000.00', currency: 'ARS' },
        allocatedBaseAmount: { amount: '60000.00', currency: 'ARS' },
        allocatedDestinationAmount: { amount: '40.00', currency: 'USD' },
        effectiveMonth: '2026-09',
      },
    ],
    projection: { status: 'available', completionMonth: '2029-06' },
    desiredDateDeltaMonths: -6,
    annualReturnRate: '8.00',
    availability: 'available_now',
    usesPlanningRate: true,
    ...overrides,
  }
}

describe('GoalDetail component', () => {
  it('renders a complete mixed-funded Goal with all sections, comparison, and assumptions', () => {
    const goal = makeGoal()

    render(<GoalDetail goal={goal} />)

    // Verify stable heading IDs
    const resumenHeading = screen.getByRole('heading', { level: 2, name: 'Resumen' })
    expect(resumenHeading).toHaveAttribute('id', 'resumen-heading')

    const valorHeading = screen.getByRole('heading', { level: 2, name: 'Valor actual' })
    expect(valorHeading).toHaveAttribute('id', 'valor-actual-heading')

    const planHeading = screen.getByRole('heading', { level: 2, name: 'Plan' })
    expect(planHeading).toHaveAttribute('id', 'plan-heading')

    const supuestosHeading = screen.getByRole('heading', { level: 2, name: 'Supuestos' })
    expect(supuestosHeading).toHaveAttribute('id', 'supuestos-heading')

    // Section 1: Resumen
    expect(screen.getByText('Activo')).toBeInTheDocument()
    expect(screen.getByText('Prioridad alta')).toBeInTheDocument()
    expect(screen.getByText(/diciembre de 2029/i)).toBeInTheDocument() // Desired date
    expect(screen.getByText(/junio de 2029/i)).toBeInTheDocument() // Projected date
    expect(screen.getByText('6 meses antes de la fecha deseada')).toBeInTheDocument() // Delta comparison
    expect(screen.getByText('US$ 50.000,00')).toBeInTheDocument() // Target amount
    expect(screen.getByText('30%')).toBeInTheDocument() // Progress percentage

    // Section 2: Valor actual
    expect(screen.getByText('US$ 5.000,00')).toBeInTheDocument() // Savings value
    expect(screen.getByText('US$ 10.000,00')).toBeInTheDocument() // Investment value
    expect(screen.getAllByText('US$ 15.000,00').length).toBeGreaterThanOrEqual(1)

    // Section 3: Plan (mixed funding rows)
    expect(screen.getByText('Ahorrar USD')).toBeInTheDocument()
    expect(screen.getByText('Invertir USD')).toBeInTheDocument()
    expect(screen.getByText('60%')).toBeInTheDocument()
    expect(screen.getByText('40%')).toBeInTheDocument()
    expect(screen.getByText(/US\$ 60,00/)).toBeInTheDocument()
    expect(screen.getByText(/US\$ 40,00/)).toBeInTheDocument()
    expect(screen.getAllByText(/septiembre de 2026/i).length).toBeGreaterThanOrEqual(2)

    // Section 4: Supuestos
    expect(screen.getByText(/1 USD = 1\.500 ARS/i)).toBeInTheDocument() // Planning exchange rate
    expect(screen.getByText(/Estimación/i)).toBeInTheDocument() // Annual return labelled Estimación
    expect(screen.getByText(/8%/)).toBeInTheDocument() // 8% return
    expect(screen.getByText('Disponible ahora')).toBeInTheDocument() // Availability
    expect(screen.getByText(/720 meses/i)).toBeInTheDocument() // 720 months
    expect(screen.getByText(/60 años/i)).toBeInTheDocument() // 60 years horizon explanation

    // No error banners
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders neutral comparison when projection is after desired date', () => {
    const goal = makeGoal({
      desiredDate: '2028-06-01T00:00:00Z',
      projection: { status: 'available', completionMonth: '2028-09' },
      desiredDateDeltaMonths: 3,
    })

    render(<GoalDetail goal={goal} />)

    expect(screen.getByText('3 meses después de la fecha deseada')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders neutral comparison when projection is in the same month as desired date', () => {
    const goal = makeGoal({
      desiredDate: '2028-09-01T00:00:00Z',
      projection: { status: 'available', completionMonth: '2028-09' },
      desiredDateDeltaMonths: 0,
    })

    render(<GoalDetail goal={goal} />)

    expect(screen.getByText('Mismo mes que la fecha deseada')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders singular mes for 1 month difference before and after', () => {
    const goalBefore = makeGoal({
      desiredDate: '2028-10-01T00:00:00Z',
      projection: { status: 'available', completionMonth: '2028-09' },
      desiredDateDeltaMonths: -1,
    })

    const { rerender } = render(<GoalDetail goal={goalBefore} />)
    expect(screen.getByText('1 mes antes de la fecha deseada')).toBeInTheDocument()

    const goalAfter = makeGoal({
      desiredDate: '2028-08-01T00:00:00Z',
      projection: { status: 'available', completionMonth: '2028-09' },
      desiredDateDeltaMonths: 1,
    })

    rerender(<GoalDetail goal={goalAfter} />)
    expect(screen.getByText('1 mes después de la fecha deseada')).toBeInTheDocument()
  })

  it('renders zero savings and investment values as known formatted $ 0,00', () => {
    const goal = makeGoal({
      currency: 'ARS',
      savingsValue: { amount: '0.00', currency: 'ARS' },
      investmentValue: { amount: '0.00', currency: 'ARS' },
      actualValue: { amount: '0.00', currency: 'ARS' },
      targetAmount: { amount: '100000.00', currency: 'ARS' },
      usesPlanningRate: false,
    })

    render(<GoalDetail goal={goal} />)

    // Should render $ 0,00 for savings and investments
    const zeros = screen.getAllByText('$ 0,00')
    expect(zeros.length).toBeGreaterThanOrEqual(2)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders missing target cleanly as Objetivo por calcular without progress bar or alert', () => {
    const goal = makeGoal({
      targetAmount: undefined,
      progressPercentage: undefined,
      projection: { status: 'target_unavailable' },
      desiredDateDeltaMonths: undefined,
    })

    render(<GoalDetail goal={goal} />)

    expect(screen.getAllByText('Objetivo por calcular').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders paused Goal with Último plan heading and Proyección pausada', () => {
    const goal = makeGoal({
      status: 'paused',
      projection: { status: 'plan_paused' },
      funding: [
        {
          channelId: 'ch-paused',
          fundingMethod: 'save',
          destinationCurrency: 'USD',
          percentage: '100.00',
          commitmentStatus: 'paused',
          monthlyCommitment: { amount: '50000.00', currency: 'ARS' },
          allocatedBaseAmount: { amount: '50000.00', currency: 'ARS' },
          allocatedDestinationAmount: { amount: '33.33', currency: 'USD' },
          effectiveMonth: '2026-09',
        },
      ],
    })

    render(<GoalDetail goal={goal} />)

    const planHeading = screen.getByRole('heading', { level: 2, name: 'Último plan' })
    expect(planHeading).toHaveAttribute('id', 'ultimo-plan-heading')
    expect(screen.getByText('Proyección pausada')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Resumen' })).getByText('Pausado')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Último plan' })).getByText('Pausado')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders completed Goal with completion date and Último plan heading', () => {
    const goal = makeGoal({
      status: 'completed',
      completedAt: '2026-04-10T12:00:00Z',
      funding: [],
      projection: { status: 'available', completionMonth: '2026-04' },
    })

    render(<GoalDetail goal={goal} />)

    expect(screen.getByRole('heading', { level: 2, name: 'Último plan' })).toBeInTheDocument()
    expect(screen.getByText('Completado')).toBeInTheDocument()
    expect(screen.getByText(/abril de 2026/i)).toBeInTheDocument()
    expect(screen.getByText('Sin canales asignados')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders completed Goal without completion date as Fecha no disponible', () => {
    const goal = makeGoal({
      status: 'completed',
      completedAt: undefined,
    })

    render(<GoalDetail goal={goal} />)

    expect(screen.getByText('Fecha no disponible')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders absent monthly commitment and 0% allocation cleanly', () => {
    const goal = makeGoal({
      funding: [
        {
          channelId: 'ch-zero',
          fundingMethod: 'save',
          destinationCurrency: 'USD',
          percentage: '0.00',
          commitmentStatus: 'active',
          monthlyCommitment: undefined,
          allocatedBaseAmount: undefined,
          allocatedDestinationAmount: undefined,
          effectiveMonth: '2026-09',
        },
      ],
      projection: { status: 'commitment_absent' },
    })

    render(<GoalDetail goal={goal} />)

    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.getAllByText('Sin aporte mensual').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders unavailable investment assumption cleanly without error banner', () => {
    const goal = makeGoal({
      annualReturnRate: undefined,
      availability: undefined,
      projection: { status: 'investment_assumption_unavailable' },
    })

    render(<GoalDetail goal={goal} />)

    expect(screen.getByText('Supuesto de inversión no disponible')).toBeInTheDocument()
    expect(screen.getByText('Supuesto no disponible')).toBeInTheDocument()
    expect(screen.getByText('No especificada')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('hides investment assumptions for save-only goals while keeping planning assumptions', () => {
    render(
      <GoalDetail
        goal={makeGoal({
          investEnabled: false,
          funding: makeGoal().funding.filter((row) => row.fundingMethod === 'save'),
        })}
      />,
    )

    expect(screen.getByText(/1 USD = 1\.500 ARS/i)).toBeInTheDocument()
    expect(screen.getByText(/720 meses/i)).toBeInTheDocument()
    expect(screen.queryByText('Retorno anual de inversiones')).not.toBeInTheDocument()
    expect(screen.queryByText('Disponible ahora')).not.toBeInTheDocument()
  })

  it('renders outside horizon projection cleanly', () => {
    const goal = makeGoal({
      projection: { status: 'outside_horizon' },
      desiredDateDeltaMonths: undefined,
    })

    render(<GoalDetail goal={goal} />)

    expect(screen.getByText('No alcanzado dentro del horizonte')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders without desired date cleanly as Sin fecha deseada', () => {
    const goal = makeGoal({
      desiredDate: undefined,
      desiredDateDeltaMonths: undefined,
    })

    render(<GoalDetail goal={goal} />)

    expect(screen.getByText('Sin fecha deseada')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders availability variations: available_from and long_term', () => {
    const goalAvailableFrom = makeGoal({
      availability: 'available_from',
      availableFrom: '2027-05',
    })

    const { rerender } = render(<GoalDetail goal={goalAvailableFrom} />)
    expect(screen.getByText(/Disponible a partir de mayo de 2027/i)).toBeInTheDocument()

    const goalLongTerm = makeGoal({
      availability: 'long_term',
    })

    rerender(<GoalDetail goal={goalLongTerm} />)
    expect(screen.getByText('Largo plazo')).toBeInTheDocument()
  })
})

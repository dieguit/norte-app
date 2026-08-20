// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GoalsWorkspace as GoalsWorkspaceType, GoalWorkspaceItem } from '../../../../features/goals/goals'
import { GoalsWorkspace } from './GoalsWorkspace'
import { GoalsEmpty, GoalsError, GoalsLoading } from './GoalsRouteStates'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode } & React.ComponentProps<'a'>) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

afterEach(cleanup)


function makeGoal(overrides: Partial<GoalWorkspaceItem>): GoalWorkspaceItem {
  return {
    id: 'goal-1',
    name: 'Colchón financiero',
    type: 'emergency_fund',
    currency: 'USD',
    priority: 'high',
    status: 'active',
    createdAt: '2026-08-01T12:00:00Z',
    targetAmount: { amount: '1000.00', currency: 'USD' },
    savingsValue: { amount: '200.00', currency: 'USD' },
    investmentValue: { amount: '0.00', currency: 'USD' },
    actualValue: { amount: '200.00', currency: 'USD' },
    progressPercentage: '20.00',
    funding: [
      {
        channelId: 'channel-1',
        fundingMethod: 'save',
        destinationCurrency: 'USD',
        percentage: '100.00',
        commitmentStatus: 'active',
        monthlyCommitment: { amount: '50000.00', currency: 'ARS' },
        allocatedBaseAmount: { amount: '50000.00', currency: 'ARS' },
        allocatedDestinationAmount: { amount: '33.33', currency: 'USD' },
        effectiveMonth: '2026-09',
      },
    ],
    projection: { status: 'available', completionMonth: '2028-09' },
    usesPlanningRate: true,
    saveEnabled: true,
    investEnabled: false,
    ...overrides,
  }
}

describe('GoalsWorkspace component', () => {
  it('renders a populated workspace with active, paused, and completed groups', () => {
    const activeGoal = makeGoal({
      id: 'goal-1',
      name: 'Colchón financiero',
      status: 'active',
      priority: 'high',
      targetAmount: { amount: '1000.00', currency: 'USD' },
      actualValue: { amount: '200.00', currency: 'USD' },
      progressPercentage: '20.00',
    })

    const pausedGoal = makeGoal({
      id: 'goal-2',
      name: 'Vacaciones en Brasil',
      status: 'paused',
      priority: 'medium',
      targetAmount: { amount: '1500.00', currency: 'USD' },
      actualValue: { amount: '500.00', currency: 'USD' },
      progressPercentage: '33.33',
      funding: [
        {
          channelId: 'channel-1',
          fundingMethod: 'save',
          destinationCurrency: 'USD',
          percentage: '50.00',
          commitmentStatus: 'paused',
          monthlyCommitment: { amount: '50000.00', currency: 'ARS' },
          allocatedBaseAmount: { amount: '25000.00', currency: 'ARS' },
          allocatedDestinationAmount: { amount: '16.67', currency: 'USD' },
          effectiveMonth: '2026-09',
        },
      ],
      projection: { status: 'plan_paused' },
    })

    const completedGoal = makeGoal({
      id: 'goal-3',
      name: 'Comprar laptop',
      status: 'completed',
      priority: 'low',
      completedAt: '2026-03-15T00:00:00Z',
      targetAmount: { amount: '2000.00', currency: 'USD' },
      actualValue: { amount: '2000.00', currency: 'USD' },
      progressPercentage: '100.00',
      funding: [],
      projection: { status: 'available', completionMonth: '2026-03' },
    })

    const workspace: GoalsWorkspaceType = {
      groups: [
        { status: 'active', goals: [activeGoal] },
        { status: 'paused', goals: [pausedGoal] },
        { status: 'completed', goals: [completedGoal] },
      ],
    }

    render(<GoalsWorkspace workspace={workspace} />)

    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
      'Activos',
      'Pausados',
      'Completados',
    ])
    expect(screen.queryByRole('link', { name: /Ver Colchón financiero/i })).not.toBeInTheDocument()
    expect(screen.getByText('Colchón financiero')).toBeInTheDocument()

    const actualValueEl = screen.getByLabelText('Valor actual de Colchón financiero')
    expect(actualValueEl).toHaveTextContent('US$ 200,00')
    expect(actualValueEl).not.toHaveTextContent('Plan:')
    expect(actualValueEl).not.toHaveTextContent('US$ 33,33')
  })

  it('uses an explicit disclosure instead of linking the goal name', async () => {
    const user = userEvent.setup()
    render(
      <GoalsWorkspace
        workspace={{ groups: [{ status: 'active', goals: [makeGoal({})] }] }}
      />,
    )

    expect(screen.queryByRole('link', { name: /Colchón financiero/i })).not.toBeInTheDocument()

    const disclosure = screen.getByRole('button', {
      name: 'Ver detalle de Colchón financiero',
    })
    expect(disclosure).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()

    await user.click(disclosure)

    expect(
      screen.getByRole('button', { name: 'Ocultar detalle de Colchón financiero' }),
    ).toHaveAttribute('aria-expanded', 'true')
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Composición' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Plan' })).toBeInTheDocument()
    expect(screen.getByText('Ahorrar USD')).toBeInTheDocument()
    expect(screen.getByText('US$ 33,33 por mes')).toBeInTheDocument()
  })

  it('keeps only one goal expanded', async () => {
    const user = userEvent.setup()
    const first = makeGoal({ id: 'goal-1', name: 'Colchón financiero' })
    const second = makeGoal({ id: 'goal-2', name: 'Viaje' })
    render(
      <GoalsWorkspace
        workspace={{ groups: [{ status: 'active', goals: [first, second] }] }}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Ver detalle de Colchón financiero' }))
    expect(screen.getByRole('button', { name: 'Ocultar detalle de Colchón financiero' }))
      .toHaveAttribute('aria-expanded', 'true')

    await user.click(screen.getByRole('button', { name: 'Ver detalle de Viaje' }))

    expect(screen.getByRole('button', { name: 'Ver detalle de Colchón financiero' }))
      .toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: 'Ocultar detalle de Viaje' }))
      .toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByRole('region', { name: /Detalles de/ })).toHaveLength(1)
  })

  it('shows plan first and composition second in responsive columns', async () => {
    const user = userEvent.setup()
    render(
      <GoalsWorkspace
        workspace={{
          groups: [{
            status: 'active',
            goals: [makeGoal({
              savingsValue: { amount: '125.00', currency: 'USD' },
              investmentValue: { amount: '75.00', currency: 'USD' },
            })],
          }],
        }}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Ver detalle de Colchón financiero' }))

    const details = screen.getByRole('region', { name: 'Detalles de Colchón financiero' })
    expect(details).toHaveClass('grid-cols-1', 'sm:grid-cols-2')
    expect(within(details).getAllByRole('heading', { level: 4 }).map((heading) => heading.textContent))
      .toEqual(['Plan', 'Composición'])
    expect(within(details).getByText('US$ 125,00')).toBeInTheDocument()
    expect(within(details).getByText('US$ 75,00')).toBeInTheDocument()
    expect(within(details).getByText('Ahorrar USD')).toBeInTheDocument()
  })

  it('omits empty groups from rendering', () => {
    const activeGoal = makeGoal({ id: 'goal-1', status: 'active' })
    const workspace: GoalsWorkspaceType = {
      groups: [
        { status: 'active', goals: [activeGoal] },
        { status: 'paused', goals: [] },
        { status: 'completed', goals: [] },
      ],
    }

    render(<GoalsWorkspace workspace={workspace} />)

    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
      'Activos',
    ])
    expect(screen.queryByText('Pausados')).not.toBeInTheDocument()
    expect(screen.queryByText('Completados')).not.toBeInTheDocument()
  })

  it('renders completed date when present and Fecha no disponible when absent', () => {
    const completedWithDate = makeGoal({
      id: 'goal-completed-1',
      name: 'Meta con fecha',
      status: 'completed',
      completedAt: '2026-05-10T10:00:00Z',
    })
    const completedWithoutDate = makeGoal({
      id: 'goal-completed-2',
      name: 'Meta sin fecha',
      status: 'completed',
      completedAt: undefined,
    })

    const workspace: GoalsWorkspaceType = {
      groups: [
        { status: 'completed', goals: [completedWithDate, completedWithoutDate] },
      ],
    }

    render(<GoalsWorkspace workspace={workspace} />)

    expect(screen.getByText(/mayo de 2026/i)).toBeInTheDocument()
    expect(screen.getByText('Fecha no disponible')).toBeInTheDocument()
  })

  it('renders paused goals with Proyección pausada and plan rows behind disclosure', async () => {
    const user = userEvent.setup()
    const pausedGoal = makeGoal({
      id: 'goal-paused',
      name: 'Fondo de viaje',
      status: 'paused',
      projection: { status: 'plan_paused' },
      funding: [
        {
          channelId: 'ch-1',
          fundingMethod: 'save',
          destinationCurrency: 'USD',
          percentage: '10.00',
          commitmentStatus: 'paused',
          monthlyCommitment: { amount: '10000.00', currency: 'ARS' },
          allocatedBaseAmount: { amount: '1000.00', currency: 'ARS' },
          allocatedDestinationAmount: { amount: '0.67', currency: 'USD' },
          effectiveMonth: '2026-09',
        },
      ],
    })

    const workspace: GoalsWorkspaceType = {
      groups: [{ status: 'paused', goals: [pausedGoal] }],
    }

    render(<GoalsWorkspace workspace={workspace} />)

    const pausedArticle = screen.getByRole('article', { name: 'Fondo de viaje' })
    expect(within(pausedArticle).getByText('Proyección pausada')).toBeInTheDocument()

    await user.click(within(pausedArticle).getByRole('button', { name: 'Ver detalle de Fondo de viaje' }))
    expect(within(pausedArticle).getByText('Ahorrar USD')).toBeInTheDocument()
    expect(within(pausedArticle).getByText('US$ 0,67 por mes')).toBeInTheDocument()
  })

  it('renders unknown target as Objetivo por calcular and omits progress percentage', () => {
    const unknownTargetGoal = makeGoal({
      id: 'goal-unknown-target',
      name: 'Meta indefinida',
      targetAmount: undefined,
      actualValue: { amount: '150.00', currency: 'USD' },
      progressPercentage: undefined,
      projection: { status: 'target_unavailable' },
    })

    const workspace: GoalsWorkspaceType = {
      groups: [{ status: 'active', goals: [unknownTargetGoal] }],
    }

    render(<GoalsWorkspace workspace={workspace} />)

    expect(screen.getAllByText('Objetivo por calcular').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('US$ 150,00')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('renders compact Spanish labels for all projection reasons', () => {
    const goals: GoalWorkspaceItem[] = [
      makeGoal({
        id: 'g-1',
        name: 'Sin asignación',
        projection: { status: 'no_future_allocation' },
      }),
      makeGoal({
        id: 'g-2',
        name: 'Sin compromiso',
        projection: { status: 'commitment_absent' },
      }),
      makeGoal({
        id: 'g-3',
        name: 'Sin supuesto inversión',
        projection: { status: 'investment_assumption_unavailable' },
      }),
      makeGoal({
        id: 'g-4',
        name: 'Fuera de horizonte',
        projection: { status: 'outside_horizon' },
      }),
    ]

    const workspace: GoalsWorkspaceType = {
      groups: [{ status: 'active', goals }],
    }

    render(<GoalsWorkspace workspace={workspace} />)

    expect(screen.getByText('Sin asignación futura')).toBeInTheDocument()
    expect(screen.getByText('Sin aporte mensual')).toBeInTheDocument()
    expect(screen.getByText('Supuesto de inversión no disponible')).toBeInTheDocument()
    expect(screen.getByText('No alcanzado dentro del horizonte')).toBeInTheDocument()
  })

  it('preserves progress percentage text above 100 while capping native progress value at 100', () => {
    const aboveTargetGoal = makeGoal({
      id: 'goal-above',
      name: 'Meta superada',
      targetAmount: { amount: '1000.00', currency: 'USD' },
      actualValue: { amount: '1250.00', currency: 'USD' },
      progressPercentage: '125.00',
    })

    const workspace: GoalsWorkspaceType = {
      groups: [{ status: 'active', goals: [aboveTargetGoal] }],
    }

    render(<GoalsWorkspace workspace={workspace} />)

    const progressEl = screen.getByRole('progressbar', { name: /Progreso de Meta superada/i })
    expect(progressEl).toHaveAttribute('value', '100')
    expect(progressEl).toHaveAttribute('max', '100')
    expect(screen.getByText('125%')).toBeInTheDocument()
  })

  it('renders long names and multiple funding rows behind disclosure', async () => {
    const user = userEvent.setup()
    const complexGoal = makeGoal({
      id: 'goal-complex',
      name: 'Fondo para la compra del primer departamento en Buenos Aires con cochera',
      funding: [
        {
          channelId: 'ch-save',
          fundingMethod: 'save',
          destinationCurrency: 'USD',
          percentage: '60.00',
          commitmentStatus: 'active',
          monthlyCommitment: { amount: '100000.00', currency: 'ARS' },
          allocatedBaseAmount: { amount: '60000.00', currency: 'ARS' },
          allocatedDestinationAmount: { amount: '40.00', currency: 'USD' },
          effectiveMonth: '2026-09',
        },
        {
          channelId: 'ch-invest',
          fundingMethod: 'invest',
          destinationCurrency: 'USD',
          percentage: '40.00',
          commitmentStatus: 'active',
          monthlyCommitment: { amount: '100000.00', currency: 'ARS' },
          allocatedBaseAmount: { amount: '40000.00', currency: 'ARS' },
          allocatedDestinationAmount: { amount: '26.67', currency: 'USD' },
          effectiveMonth: '2026-09',
        },
      ],
    })

    const workspace: GoalsWorkspaceType = {
      groups: [{ status: 'active', goals: [complexGoal] }],
    }

    render(<GoalsWorkspace workspace={workspace} />)

    expect(screen.getByText('Fondo para la compra del primer departamento en Buenos Aires con cochera')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Ver detalle de Fondo para la compra/ }))

    expect(screen.getByText('Ahorrar USD')).toBeInTheDocument()
    expect(screen.getByText('Invertir USD')).toBeInTheDocument()
    expect(screen.getByText('60%')).toBeInTheDocument()
    expect(screen.getByText('40%')).toBeInTheDocument()
    expect(screen.getByText('US$ 40,00 por mes')).toBeInTheDocument()
    expect(screen.getByText('US$ 26,67 por mes')).toBeInTheDocument()

    expect(screen.queryByRole('link', { name: /Fondo para la compra/i })).not.toBeInTheDocument()
  })

  it('renders funding row with 0% allocation and absent monthly commitment behind disclosure', async () => {
    const user = userEvent.setup()
    const zeroAllocGoal = makeGoal({
      id: 'goal-zero',
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
    })

    const workspace: GoalsWorkspaceType = {
      groups: [{ status: 'active', goals: [zeroAllocGoal] }],
    }

    render(<GoalsWorkspace workspace={workspace} />)

    await user.click(screen.getByRole('button', { name: 'Ver detalle de Colchón financiero' }))

    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.getByText('Sin aporte mensual')).toBeInTheDocument()
  })
})

describe('GoalsRouteStates', () => {
  it('renders GoalsLoading with 3 aria-hidden card skeletons and status text', () => {
    const { container } = render(<GoalsLoading />)

    expect(screen.getByRole('status')).toHaveTextContent('Cargando objetivos…')
    const skeletons = container.querySelectorAll('[aria-hidden="true"]')
    expect(skeletons.length).toBeGreaterThanOrEqual(3)
    expect(skeletons[0]).toHaveClass('motion-reduce:animate-none')
  })

  it('disables card transitions for reduced-motion users', () => {
    const goal = makeGoal({})
    render(<GoalsWorkspace workspace={{ groups: [{ status: 'active', goals: [goal] }] }} />)

    expect(screen.getByRole('article')).toHaveClass('motion-reduce:transition-none')
  })

  it('renders GoalsError with alert role, neutral copy, and retry button', () => {
    const handleRetry = vi.fn()
    render(<GoalsError onRetry={handleRetry} />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/No pudimos cargar tus objetivos/i)).toBeInTheDocument()
    const retryBtn = screen.getByRole('button', { name: 'Reintentar' })
    expect(retryBtn).toBeInTheDocument()
    retryBtn.click()
    expect(handleRetry).toHaveBeenCalledTimes(1)
  })

  it('renders a button trigger in populated workspace header and calls onNewGoal', () => {
    const handleNewGoal = vi.fn()
    const goal = makeGoal({})
    render(
      <GoalsWorkspace
        workspace={{ groups: [{ status: 'active', goals: [goal] }] }}
        onNewGoal={handleNewGoal}
      />,
    )

    const btn = screen.getByRole('button', { name: 'Nuevo objetivo' })
    expect(btn).toHaveAttribute('id', 'new-goal-trigger')
    btn.click()
    expect(handleNewGoal).toHaveBeenCalledTimes(1)
  })

  it('renders GoalsEmpty with explanation and a creation button trigger', () => {
    const handleNewGoal = vi.fn()
    render(<GoalsEmpty onNewGoal={handleNewGoal} />)

    expect(screen.getByRole('heading', { name: 'No tenés objetivos registrados' })).toBeInTheDocument()
    const btn = screen.getByRole('button', { name: 'Nuevo objetivo' })
    expect(btn).toHaveAttribute('id', 'new-goal-trigger')
    btn.click()
    expect(handleNewGoal).toHaveBeenCalledTimes(1)
  })
})


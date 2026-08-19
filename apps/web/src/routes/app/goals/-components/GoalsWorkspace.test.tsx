// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import type { ComponentProps, ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GoalsWorkspace as GoalsWorkspaceType, GoalWorkspaceItem } from '../../../../features/goals/goals'
import { GoalsWorkspace } from './GoalsWorkspace'
import { GoalsEmpty, GoalsError, GoalsLoading, GoalNotFound } from './GoalsRouteStates'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    params,
    children,
    ...props
  }: {
    to: string
    params?: Record<string, string>
    children: ReactNode
  } & ComponentProps<'a'>) => {
    let href = to
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        href = href.replace(`$${key}`, value)
      }
    }
    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  },
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
    expect(screen.getByRole('link', { name: /Ver Colchón financiero/i })).toHaveAttribute(
      'href',
      '/app/goals/goal-1',
    )
    expect(screen.getByRole('link', { name: /Ver Colchón financiero/i })).toHaveAttribute(
      'id',
      'goal-link-goal-1',
    )
    expect(screen.getByText('Plan mensual')).toBeInTheDocument()
    expect(screen.getAllByText('Valor actual')[0]).toBeInTheDocument()

    // Assert planned amount is not inside the element labelled 'Valor actual de Colchón financiero'
    const actualValueEl = screen.getByLabelText('Valor actual de Colchón financiero')
    expect(actualValueEl).toHaveTextContent('US$ 200,00')
    expect(actualValueEl).not.toHaveTextContent('Plan:')
    expect(actualValueEl).not.toHaveTextContent('US$ 33,33')
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

  it('renders paused goals with Proyección pausada and Último plan allocation label', () => {
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

    const pausedArticle = screen.getByRole('article', { name: 'Ver Fondo de viaje' })
    expect(within(pausedArticle).getByText('Proyección pausada')).toBeInTheDocument()
    expect(within(pausedArticle).getByText('Último plan')).toBeInTheDocument()
    expect(within(pausedArticle).getByText(/Plan pausado: US\$ 0,67/)).toBeInTheDocument()
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

  it('renders long names and multiple funding rows without duplicate interactive controls', () => {
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
    expect(screen.getByText('Ahorrar USD')).toBeInTheDocument()
    expect(screen.getByText('Invertir USD')).toBeInTheDocument()
    expect(screen.getByText('60%')).toBeInTheDocument()
    expect(screen.getByText('40%')).toBeInTheDocument()
    expect(screen.getByText('Plan: US$ 40,00')).toBeInTheDocument()
    expect(screen.getByText('Plan: US$ 26,67')).toBeInTheDocument()

    // Assert only one interactive link exists for this Goal card
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(1)
  })

  it('renders funding row with 0% allocation and absent monthly commitment', () => {
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

  it('renders GoalsEmpty with explanation and no creation button or link', () => {
    render(<GoalsEmpty />)

    expect(screen.getByRole('heading', { name: 'No tenés objetivos registrados' })).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('renders GoalNotFound with explanation and link to /app/goals', () => {
    render(<GoalNotFound />)

    expect(screen.getByRole('heading', { name: 'Objetivo no encontrado' })).toBeInTheDocument()
    const backLink = screen.getByRole('link', { name: /Volver a objetivos/i })
    expect(backLink).toHaveAttribute('href', '/app/goals')
  })
})

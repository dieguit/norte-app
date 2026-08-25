// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Home } from './Home'
import type { InitialHomeState } from '../../../features/financial/financial'
import type { PreviousMonthShortfall } from '../../../features/contributions/saving-contribution'
import { getSavingContributionContext } from '../../../features/contributions/saving-contribution.functions'

import type { RoadmapData } from '../../../features/roadmap/roadmap'

vi.mock('../../../features/contributions/saving-contribution.functions', () => ({
  getSavingContributionContext: vi.fn().mockResolvedValue(null),
  previewSavingContribution: vi.fn().mockResolvedValue(null),
  confirmSavingContribution: vi.fn().mockResolvedValue(null),
}))

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({
    invalidate: vi.fn(),
  }),
  Link: ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) => (
    <a href={to} className={className}>{children}</a>
  ),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('Home component', () => {
  const emptyRoadmap: RoadmapData = {
    undatedObjectives: [],
    futureMonths: [],
    currentMonth: {
      month: '2026-05',
      objectives: [],
      oneTimeExpenses: [],
      recurringExpenses: [],
      endingExpenses: [],
      oneTimeIncomes: [],
      recurringIncomes: [],
      contributions: [],
    },
    historyMonths: [],
  }

  const fixedSavingsHome: InitialHomeState = {
    income: { amount: '1000000.00', currency: 'ARS' },
    expensesKnowledge: 'known',
    expenses: { amount: '400000.00', currency: 'ARS' },
    plan: {
      fundingMethod: 'save',
      destinationCurrency: 'ARS',
      monthlyCommitment: { amount: '100000.00', currency: 'ARS' },
      destinationAmount: { amount: '100000.00', currency: 'ARS' },
      effectiveMonth: '2026-09',
      allocationPercentage: '100.00',
    },
    goal: {
      type: 'fixed_savings',
      name: 'Quiero ahorrar cierta suma de dinero',
      targetAmount: { amount: '500000.00', currency: 'ARS' },
      currentAmount: { amount: '0.00', currency: 'ARS' },
      emergencyFundMonths: undefined,
    },
    projection: { status: 'available', completionMonth: '2027-02' },
    previousMonthShortfalls: [],
  }

  it('shows the success status when the last closed month has no shortfall', () => {
    render(
      <Home
        home={{ ...fixedSavingsHome, previousMonthShortfalls: [] }}
        roadmap={emptyRoadmap}
        now={new Date('2026-05-15T12:00:00Z')}
      />
    )

    expect(screen.getByRole('heading', { name: 'Cumpliste tus objetivos de abril.' })).toBeVisible()
    expect(screen.getByText('Seguís en camino con tu plan.')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Tu hoja de ruta' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Tu Plan' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Tus avances' })).not.toBeInTheDocument()
  })

  it('renders one prior-month alert with every shortfall', async () => {
    const user = userEvent.setup()
    vi.setSystemTime(new Date('2026-05-15T12:00:00Z'))
    vi.mocked(getSavingContributionContext).mockResolvedValue({
      profile: 'present',
      context: {
        currentMonth: '2026-05',
        eligibleGoals: [
          { id: 'goal-ars-1', name: 'Viaje a Bariloche', percentage: '100.00' },
        ],
        eligibleGoalsUsd: [
          { id: 'goal-usd-1', name: 'Colchón financiero', percentage: '100.00' },
        ],
        eligibleInvestmentGoals: [
          { id: 'goal-inv-ars', name: 'CEDEARs ARS', percentage: '100.00' },
        ],
        eligibleInvestmentGoalsUsd: [
          { id: 'goal-inv-usd', name: 'S&P 500 USD', percentage: '100.00' },
        ],
      },
    })
    const shortfalls: PreviousMonthShortfall[] = [
      {
        kind: 'saving',
        currency: 'USD',
        amount: { amount: '20.00', currency: 'USD' },
      },
      {
        kind: 'investment',
        currency: 'ARS',
        amount: { amount: '25000.00', currency: 'ARS' },
      },
    ]

    render(
      <Home
        home={{ ...fixedSavingsHome, previousMonthShortfalls: shortfalls }}
        roadmap={emptyRoadmap}
        now={new Date('2026-05-15T12:00:00Z')}
      />
    )

    expect(screen.getByText('No cumpliste todos tus objetivos de abril.')).toBeVisible()
    expect(screen.getByText('En abril te faltaron ahorrar USD USD 20,00.')).toBeVisible()
    expect(screen.getByText('En abril te faltaron invertir ARS $ 25.000,00.')).toBeVisible()

    const section = screen.getByRole('region', { name: 'No cumpliste todos tus objetivos de abril.' })
    expect(section).toBeVisible()
    const heading = screen.getByRole('heading', { level: 2, name: 'No cumpliste todos tus objetivos de abril.' })
    expect(heading).toHaveAttribute('id', 'previous-month-shortfalls-heading')

    const list = screen.getByRole('list')
    expect(list).toBeVisible()
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)

    const buttons = screen.getAllByRole('button', { name: 'Ponerse al día' })
    expect(buttons).toHaveLength(2)

    await user.click(buttons[1])

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Registrar inversión' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Ahorré ARS' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Invertí USD' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Monto en pesos')).toHaveValue('25.000')
    expect(screen.getByText('Este aporte se registrará para Abril de 2026.')).toBeVisible()
    expect(screen.queryByText(/Necesitás/i)).not.toBeInTheDocument()
  })

  it('renders + Registrar button and opens four-action chooser', async () => {
    const user = userEvent.setup()
    vi.mocked(getSavingContributionContext).mockResolvedValue({
      profile: 'present',
      context: {
        currentMonth: '2026-08',
        eligibleGoals: [
          { id: 'goal-ars-1', name: 'Viaje a Bariloche', percentage: '100.00' },
        ],
        eligibleGoalsUsd: [
          { id: 'goal-usd-1', name: 'Colchón financiero', percentage: '100.00' },
        ],
        eligibleInvestmentGoals: [
          { id: 'goal-inv-ars', name: 'CEDEARs ARS', percentage: '100.00' },
        ],
        eligibleInvestmentGoalsUsd: [
          { id: 'goal-inv-usd', name: 'S&P 500 USD', percentage: '100.00' },
        ],
      },
    })

    render(<Home home={fixedSavingsHome} roadmap={emptyRoadmap} />)

    const launchButton = screen.getByRole('button', { name: '+ Registrar' })
    expect(launchButton).toBeInTheDocument()
    expect(launchButton).toBeVisible()

    await user.click(launchButton)

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Ahorré ARS' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Ahorré USD' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Invertí ARS' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Invertí USD' })).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Invertí USD' }))

    expect(await screen.findByRole('button', { name: 'Confirmar inversión' })).toBeDisabled()
    expect(screen.queryByLabelText(/dónde está guardado/i)).not.toBeInTheDocument()
  })
})

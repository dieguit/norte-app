// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Home } from './Home'
import type { InitialHomeState } from '../../../features/financial/financial'
import type { PreviousMonthShortfall } from '../../../features/contributions/saving-contribution'
import { getSavingContributionContext } from '../../../features/contributions/saving-contribution.functions'

vi.mock('../../../features/contributions/saving-contribution.functions', () => ({
  getSavingContributionContext: vi.fn(),
  previewSavingContribution: vi.fn(),
  confirmSavingContribution: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({
    invalidate: vi.fn(),
  }),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('Home initial-plan component', () => {
  const knownExpenseEmergencyFund: InitialHomeState = {
    income: { amount: '500000.00', currency: 'ARS' },
    expensesKnowledge: 'known',
    expenses: { amount: '250000.00', currency: 'ARS' },
    plan: {
      fundingMethod: 'save',
      destinationCurrency: 'USD',
      monthlyCommitment: { amount: '50000.00', currency: 'ARS' },
      destinationAmount: { amount: '33.33', currency: 'USD' },
      effectiveMonth: '2026-09',
      allocationPercentage: '100.00',
    },
    goal: {
      type: 'emergency_fund',
      name: 'Colchón financiero',
      targetAmount: { amount: '1000.00', currency: 'USD' },
      currentAmount: { amount: '0.00', currency: 'USD' },
      emergencyFundMonths: 6,
    },
    projection: { status: 'available', completionMonth: '2029-03' },
    previousMonthShortfalls: [],
  }

  const unknownExpenseEmergencyFund: InitialHomeState = {
    income: { amount: '600000.00', currency: 'ARS' },
    expensesKnowledge: 'unknown',
    plan: {
      fundingMethod: 'save',
      destinationCurrency: 'USD',
      monthlyCommitment: { amount: '80000.00', currency: 'ARS' },
      destinationAmount: { amount: '53.33', currency: 'USD' },
      effectiveMonth: '2026-09',
      allocationPercentage: '100.00',
    },
    goal: {
      type: 'emergency_fund',
      name: 'Colchón financiero',
      targetAmount: undefined,
      currentAmount: { amount: '0.00', currency: 'USD' },
      emergencyFundMonths: 6,
    },
    projection: { status: 'unknown_expenses' },
    previousMonthShortfalls: [],
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

  const outsideHorizonHome: InitialHomeState = {
    income: { amount: '500000.00', currency: 'ARS' },
    expensesKnowledge: 'known',
    expenses: { amount: '250000.00', currency: 'ARS' },
    plan: {
      fundingMethod: 'save',
      destinationCurrency: 'ARS',
      monthlyCommitment: { amount: '0.00', currency: 'ARS' },
      destinationAmount: { amount: '0.00', currency: 'ARS' },
      effectiveMonth: '2026-09',
      allocationPercentage: '100.00',
    },
    goal: {
      type: 'fixed_savings',
      name: 'Ahorro a muy largo plazo',
      targetAmount: { amount: '10000000.00', currency: 'ARS' },
      currentAmount: { amount: '0.00', currency: 'ARS' },
      emergencyFundMonths: undefined,
    },
    projection: { status: 'outside_horizon' },
    previousMonthShortfalls: [],
  }

  it('renders one prior-month alert with every shortfall', () => {
    vi.setSystemTime(new Date('2026-05-15T12:00:00Z'))
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

    render(<Home home={{ ...fixedSavingsHome, previousMonthShortfalls: shortfalls }} />)

    expect(screen.getByText('No cumpliste todos tus objetivos de abril.')).toBeVisible()
    expect(screen.getByText('En abril te faltaron US$ 20,00 para ahorro.')).toBeVisible()
    expect(screen.getByText('En abril te faltaron $ 25.000,00 para inversión.')).toBeVisible()

    const section = screen.getByRole('region', { name: 'No cumpliste todos tus objetivos de abril.' })
    expect(section).toBeVisible()
    const heading = screen.getByRole('heading', { level: 2, name: 'No cumpliste todos tus objetivos de abril.' })
    expect(heading).toHaveAttribute('id', 'previous-month-shortfalls-heading')

    const list = screen.getByRole('list')
    expect(list).toBeVisible()
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)

    expect(section.querySelector('button')).toBeNull()
  })

  it('renders nothing when previousMonthShortfalls is empty', () => {
    render(<Home home={{ ...fixedSavingsHome, previousMonthShortfalls: [] }} />)

    expect(screen.queryByRole('heading', { name: /No cumpliste todos tus objetivos/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /No cumpliste todos tus objetivos/i })).not.toBeInTheDocument()
  })

  it('shows the canonical Plan separately from empty actual progress', () => {
    render(<Home home={knownExpenseEmergencyFund} />)

    expect(screen.getByRole('heading', { name: 'Tu Plan' })).toBeVisible()
    expect(screen.getByText('Ahorrar USD')).toBeVisible()
    expect(screen.getByText('$ 50.000,00 por mes')).toBeVisible()
    expect(screen.getByText('US$ 33,33 estimados por mes')).toBeVisible()
    expect(screen.getByText('Desde septiembre de 2026')).toBeVisible()
    expect(screen.getByText('1 USD = 1.500 ARS')).toBeVisible()
    expect(screen.getByText('100% asignado a este objetivo')).toBeVisible()
    expect(screen.getByText('US$ 1.000,00')).toBeVisible()
    expect(screen.getByText('marzo de 2029')).toBeVisible()

    expect(screen.getByRole('heading', { name: 'Tus avances' })).toBeVisible()
    expect(screen.getByText('US$ 0,00')).toBeVisible()
    expect(screen.getByText('Todavía no registraste aportes')).toBeVisible()
  })

  it('renders the incomplete emergency-fund state without inventing a target or date', () => {
    render(<Home home={unknownExpenseEmergencyFund} />)

    expect(screen.getByRole('heading', { name: 'Tu plan está empezando a tomar forma' })).toBeVisible()
    expect(screen.getByText('Todavía no sabemos')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Tu Plan' })).toBeVisible()
    expect(screen.getByText('Ahorrar USD')).toBeVisible()
    expect(screen.getByText('$ 80.000,00 por mes')).toBeVisible()
    expect(screen.getAllByText('Fecha por calcular').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Necesitamos conocer mejor tus gastos para calcular cuánto necesitás.')).toBeVisible()
    expect(screen.queryByRole('link', { name: 'Agregar mis gastos principales' })).not.toBeInTheDocument()
    expect(screen.getByText('Agregar mis gastos principales')).toBeVisible()
    expect(screen.getByText(/Alquiler/)).toBeVisible()
    expect(screen.getByText(/Obra social/)).toBeVisible()
    expect(screen.getByText(/Servicios/)).toBeVisible()
    expect(screen.getByText(/Suscripciones/)).toBeVisible()

    expect(screen.getByRole('heading', { name: 'Tus avances' })).toBeVisible()
    expect(screen.getByText('US$ 0,00')).toBeVisible()
    expect(screen.getByText('Todavía no registraste aportes')).toBeVisible()
  })

  it('renders outside_horizon projection message when projection is not reachable', () => {
    render(<Home home={outsideHorizonHome} />)

    expect(screen.getByRole('heading', { name: 'Tu Plan' })).toBeVisible()
    expect(screen.getByText('No alcanzado dentro del horizonte')).toBeVisible()
  })

  it('renders the selected fixed target and same-currency plan details', () => {
    render(<Home home={fixedSavingsHome} />)

    expect(screen.getAllByText('Quiero ahorrar cierta suma de dinero').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('heading', { name: 'Tu Plan' })).toBeVisible()
    expect(screen.getByText('Ahorrar ARS')).toBeVisible()
    expect(screen.getByText('$ 100.000,00 por mes')).toBeVisible()
    expect(screen.queryByText(/estimados por mes/)).not.toBeInTheDocument()
    expect(screen.queryByText(/1 USD =/)).not.toBeInTheDocument()
    expect(screen.getByText('$ 500.000,00')).toBeVisible()
    expect(screen.getByText('febrero de 2027')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Tus avances' })).toBeVisible()
    expect(screen.getByText('$ 0,00')).toBeVisible()
    expect(screen.getByText('Todavía no registraste aportes')).toBeVisible()
  })

  it('renders + Registrar button directly after introduction and opens four-action chooser', async () => {
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

    render(<Home home={knownExpenseEmergencyFund} />)

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

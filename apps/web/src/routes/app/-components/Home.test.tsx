// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Home } from './Home'
import type { InitialHomeState } from '../../../features/financial/financial'

afterEach(cleanup)

describe('Home initial-plan component', () => {
  const unknownExpenseEmergencyFund: InitialHomeState = {
    income: { amount: '600000.00', currency: 'ARS' },
    expensesKnowledge: 'unknown',
    plannedContribution: { amount: '80000.00', currency: 'ARS' },
    goal: {
      type: 'emergency_fund',
      name: 'Colchón financiero',
      targetAmount: undefined,
      emergencyFundMonths: 6,
    },
    projectionState: 'unknown_expenses',
  }

  const knownExpenseEmergencyFund: InitialHomeState = {
    income: { amount: '500000.00', currency: 'ARS' },
    expensesKnowledge: 'known',
    expenses: { amount: '250000.00', currency: 'ARS' },
    plannedContribution: { amount: '50000.00', currency: 'ARS' },
    goal: {
      type: 'emergency_fund',
      name: 'Colchón financiero',
      targetAmount: { amount: '1500000.00', currency: 'ARS' },
      emergencyFundMonths: 6,
    },
    projectionState: 'available',
  }

  const fixedSavingsHome: InitialHomeState = {
    income: { amount: '1000000.00', currency: 'ARS' },
    expensesKnowledge: 'known',
    expenses: { amount: '400000.00', currency: 'ARS' },
    plannedContribution: { amount: '100000.00', currency: 'ARS' },
    goal: {
      type: 'fixed_savings',
      name: 'Quiero ahorrar cierta suma de dinero',
      targetAmount: { amount: '500000.00', currency: 'ARS' },
      emergencyFundMonths: undefined,
    },
    projectionState: 'available',
  }

  it('renders the incomplete emergency-fund state without inventing a target or date', () => {
    render(<Home home={unknownExpenseEmergencyFund} />)

    expect(screen.getByRole('heading', { name: 'Tu plan está empezando a tomar forma' })).toBeVisible()
    expect(screen.getByText('Todavía no sabemos')).toBeVisible()
    expect(screen.getAllByText('Fecha por calcular').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Necesitamos conocer mejor tus gastos para calcular cuánto necesitás.')).toBeVisible()
    expect(screen.queryByRole('link', { name: 'Agregar mis gastos principales' })).not.toBeInTheDocument()
    expect(screen.getByText('Agregar mis gastos principales')).toBeVisible()
    expect(screen.getByText(/Alquiler/)).toBeVisible()
    expect(screen.getByText(/Obra social/)).toBeVisible()
    expect(screen.getByText(/Servicios/)).toBeVisible()
    expect(screen.getByText(/Suscripciones/)).toBeVisible()
  })

  it('renders known emergency fund summary, target amount, and roadmap row', () => {
    render(<Home home={knownExpenseEmergencyFund} />)

    expect(screen.getByRole('heading', { name: 'Tu plan está empezando a tomar forma' })).toBeVisible()
    expect(screen.getByText('Ingresos mensuales')).toBeVisible()
    expect(screen.getByText('$ 500.000,00')).toBeVisible()
    expect(screen.getByText('Gastos mensuales')).toBeVisible()
    expect(screen.getByText('$ 250.000,00')).toBeVisible()
    expect(screen.getByText('Aporte planificado')).toBeVisible()
    expect(screen.getByText('$ 50.000,00')).toBeVisible()

    expect(screen.getAllByText('Colchón financiero').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('$ 1.500.000,00').length).toBeGreaterThanOrEqual(1)
  })

  it('renders the selected fixed target and planned contribution', () => {
    render(<Home home={fixedSavingsHome} />)

    expect(screen.getAllByText('Quiero ahorrar cierta suma de dinero').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('$ 500.000,00').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('$ 100.000,00')).toBeVisible()
  })
})

// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { ComponentProps, ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from './AppShell'
import { Home } from './Home'

vi.mock('@clerk/tanstack-react-start', () => ({
  UserButton: () => <button type="button">Cuenta</button>,
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...props }: { to: string; children: ReactNode } & ComponentProps<'a'>) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useRouterState: ({ select }: { select?: (state: { location: { pathname: string } }) => any } = {}) => {
    const state = { location: { pathname: '/app' } }
    return select ? select(state) : state
  },
}))

afterEach(cleanup)

describe('AppShell', () => {
  it('renders responsive navigation regions, active home link, unavailable controls, account controls, and child content', () => {
    const mockHome = {
      income: { amount: '500000.00', currency: 'ARS' as const },
      expensesKnowledge: 'known' as const,
      expenses: { amount: '250000.00', currency: 'ARS' as const },
      plan: {
        fundingMethod: 'save' as const,
        destinationCurrency: 'USD' as const,
        monthlyCommitment: { amount: '50000.00', currency: 'ARS' as const },
        destinationAmount: { amount: '33.33', currency: 'USD' as const },
        effectiveMonth: '2026-09',
        allocationPercentage: '100.00',
      },
      goal: {
        type: 'emergency_fund',
        name: 'Colchón financiero',
        targetAmount: { amount: '1000.00', currency: 'USD' as const },
        currentAmount: { amount: '0.00', currency: 'USD' as const },
        emergencyFundMonths: 6,
      },
      projection: { status: 'available' as const, completionMonth: '2029-03' },
    }

    render(
      <AppShell>
        <Home home={mockHome} />
      </AppShell>,
    )

    expect(screen.getAllByRole('navigation', { name: 'Navegación principal' })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: 'Inicio' })[0]?.getAttribute('aria-current')).toBe('page')
    expect(screen.getAllByRole('button', { name: 'Objetivos' })[0]).toBeDisabled()
    expect(screen.getAllByRole('button', { name: 'Finanzas' })[0]).toBeDisabled()
    expect(screen.getAllByRole('button', { name: 'Cuenta' })).toHaveLength(2)
    expect(screen.getByRole('heading', { name: 'Tu plan está empezando a tomar forma' })).toBeDefined()
  })
})

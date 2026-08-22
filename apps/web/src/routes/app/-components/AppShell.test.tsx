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

let currentPathname = '/app'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...props }: { to: string; children: ReactNode } & ComponentProps<'a'>) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useRouterState: ({ select }: { select?: (state: { location: { pathname: string } }) => any } = {}) => {
    const state = { location: { pathname: currentPathname } }
    return select ? select(state) : state
  },
}))

afterEach(() => {
  cleanup()
  currentPathname = '/app'
})

describe('AppShell', () => {
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
    previousMonthShortfalls: [],
  }

  it('renders responsive navigation regions, active home link, enabled goals links, unavailable finance controls, account controls, and child content', () => {
    render(
      <AppShell>
        <Home home={mockHome} />
      </AppShell>,
    )

    expect(screen.getAllByRole('navigation', { name: 'Navegación principal' })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: 'Inicio' })[0]?.getAttribute('aria-current')).toBe('page')

    const goalsLinks = screen.getAllByRole('link', { name: 'Objetivos' })
    expect(goalsLinks).toHaveLength(2)
    expect(goalsLinks[0]?.getAttribute('href')).toBe('/app/goals')
    expect(goalsLinks[1]?.getAttribute('href')).toBe('/app/goals')
    expect(goalsLinks[0]?.getAttribute('aria-current')).toBeNull()
    expect(goalsLinks[1]?.getAttribute('aria-current')).toBeNull()
    expect(goalsLinks[0]).toHaveClass('motion-reduce:transition-none')
    expect(goalsLinks[1]).toHaveClass('motion-reduce:transition-none')

    const financesLinks = screen.getAllByRole('link', { name: 'Finanzas' })
    expect(financesLinks).toHaveLength(2)
    expect(financesLinks[0]?.getAttribute('href')).toBe('/app/finances')
    expect(financesLinks[1]?.getAttribute('href')).toBe('/app/finances')
    expect(screen.getAllByRole('button', { name: 'Cuenta' })).toHaveLength(2)
    expect(screen.getByRole('heading', { name: 'Tu plan está empezando a tomar forma' })).toBeDefined()
  })

  it('sets aria-current="page" on Goals navigation links when on /app/goals', () => {
    currentPathname = '/app/goals'
    render(
      <AppShell>
        <Home home={mockHome} />
      </AppShell>,
    )

    const goalsLinks = screen.getAllByRole('link', { name: 'Objetivos' })
    expect(goalsLinks[0]?.getAttribute('aria-current')).toBe('page')
    expect(goalsLinks[1]?.getAttribute('aria-current')).toBe('page')
    expect(screen.getAllByRole('link', { name: 'Inicio' })[0]?.getAttribute('aria-current')).toBeNull()
  })

  it('sets aria-current="page" on Goals navigation links when on a nested goal route /app/goals/goal-1', () => {
    currentPathname = '/app/goals/goal-1'
    render(
      <AppShell>
        <Home home={mockHome} />
      </AppShell>,
    )

    const goalsLinks = screen.getAllByRole('link', { name: 'Objetivos' })
    expect(goalsLinks[0]?.getAttribute('aria-current')).toBe('page')
    expect(goalsLinks[1]?.getAttribute('aria-current')).toBe('page')
    expect(screen.getAllByRole('link', { name: 'Inicio' })[0]?.getAttribute('aria-current')).toBeNull()
  })
})

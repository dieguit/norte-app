// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { ComponentProps, ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RoadmapData } from '../../../features/roadmap/roadmap'
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

const emptyRoadmap: RoadmapData = {
  undatedObjectives: [],
  futureMonths: [],
  currentMonth: {
    month: '2026-08',
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
    previousMonthShortfalls: [],
  }

  it('renders responsive navigation regions, active home link, enabled goals links, unavailable finance controls, account controls, and child content', () => {
    const { container } = render(
      <AppShell>
        <Home home={mockHome} roadmap={emptyRoadmap} />
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
    expect(screen.getByRole('heading', { name: 'Inicio' })).toBeDefined()

    expect(container.firstElementChild).toHaveClass('h-dvh', 'overflow-hidden')
    expect(screen.getAllByRole('banner')[0]).toHaveClass('shrink-0')
    expect(screen.getAllByRole('banner')[0]).toHaveClass(
      'h-[calc(3.5rem+env(safe-area-inset-top))]',
      'pt-[env(safe-area-inset-top)]',
    )
    expect(screen.getByRole('complementary')).toHaveClass('shrink-0')
    expect(screen.getByRole('main')).toHaveClass('min-h-0', 'overflow-y-auto')
    expect(screen.getByRole('main')).toHaveAttribute('id', 'app-scroll-area')
    expect(screen.getByRole('main')).toHaveAttribute(
      'data-scroll-restoration-id',
      'app-scroll-area',
    )

    const mobileNavigation = screen.getAllByRole('navigation', {
      name: 'Navegación principal',
    })[1]
    expect(mobileNavigation).toHaveClass('shrink-0')
    expect(mobileNavigation).not.toHaveClass('fixed')
    expect(mobileNavigation).toHaveClass(
      'h-[calc(4rem+env(safe-area-inset-bottom))]',
      'pb-[env(safe-area-inset-bottom)]',
    )
  })

  it('sets aria-current="page" on Goals navigation links when on /app/goals', () => {
    currentPathname = '/app/goals'
    render(
      <AppShell>
        <Home home={mockHome} roadmap={emptyRoadmap} />
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
        <Home home={mockHome} roadmap={emptyRoadmap} />
      </AppShell>,
    )

    const goalsLinks = screen.getAllByRole('link', { name: 'Objetivos' })
    expect(goalsLinks[0]?.getAttribute('aria-current')).toBe('page')
    expect(goalsLinks[1]?.getAttribute('aria-current')).toBe('page')
    expect(screen.getAllByRole('link', { name: 'Inicio' })[0]?.getAttribute('aria-current')).toBeNull()
  })
})

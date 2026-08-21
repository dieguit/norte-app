// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import {
  createMemoryHistory,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getFinancialAppState } from '../../features/financial/financial.functions'
import { FinancialOnboarding } from './-components/FinancialOnboarding'
import { Home } from './-components/Home'
import { Route as rootRoute } from '../__root'
import { Route as AppRoute } from './route'

vi.mock('@clerk/tanstack-react-start', () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  UserButton: () => <button type="button">Cuenta</button>,
}))

vi.mock('@tanstack/react-devtools', () => ({
  TanStackDevtools: () => null,
}))

vi.mock('@tanstack/react-router-devtools', () => ({
  TanStackRouterDevtoolsPanel: () => null,
}))

vi.mock('../../features/financial/financial.functions', () => ({
  getFinancialAppState: vi.fn(),
}))

afterEach(cleanup)

function createTestRouter() {
  const appRoute = AppRoute.update({
    id: '/app',
    path: '/app',
    getParentRoute: () => rootRoute,
  } as any)

  const childRoute = createRoute({
    getParentRoute: () => appRoute,
    path: '/',
    component: () => {
      const context = AppRoute.useRouteContext()
      return context.profile === 'missing' ? <FinancialOnboarding /> : <Home home={context.home} />
    },
  })

  const routeTree = rootRoute.addChildren([appRoute.addChildren([childRoute])])
  const history = createMemoryHistory({ initialEntries: ['/app'] })
  return createRouter({ routeTree, history })
}

describe('App route layout', () => {
  it('renders AppShell with main navigation around /app outlet', async () => {
    vi.mocked(getFinancialAppState).mockResolvedValue({
      profile: 'present',
      home: {
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
      },
    })

    const router = createTestRouter()
    render(<RouterProvider router={router} />)

    expect(await screen.findByRole('heading', { name: 'Tu plan está empezando a tomar forma' })).toBeDefined()
    expect(screen.getAllByRole('navigation', { name: 'Navegación principal' })).toHaveLength(2)
  })
})

// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import {
  createMemoryHistory,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getFinancialAppState } from '../../features/financial/financial.functions'
import type { RoadmapData } from '../../features/roadmap/roadmap'
import { FinancialOnboarding } from './-components/FinancialOnboarding'
import { Home } from './-components/Home'
import { Route as rootRoute } from '../__root'
import { Route as AppRoute } from './route'

const analytics = vi.hoisted(() => ({
  identify: vi.fn(),
  provider: vi.fn(),
  reset: vi.fn(),
  user: {
    isLoaded: true,
    isSignedIn: true,
    user: {
      id: 'user_123',
      fullName: 'Ana Norte' as string | null,
      primaryEmailAddress: { emailAddress: 'ana@example.com' } as {
        emailAddress: string
      } | null,
      createdAt: new Date('2026-01-02T03:04:05.000Z') as Date | null,
    },
  },
}))

vi.mock('@clerk/tanstack-react-start', () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  UserButton: () => <button type="button">Cuenta</button>,
  useUser: () => analytics.user,
}))

vi.mock('@posthog/react', () => ({
  PostHogProvider: ({
    children,
    ...props
  }: {
    children: React.ReactNode
    apiKey: string
    options: Record<string, unknown>
  }) => {
    analytics.provider(props)
    return <>{children}</>
  },
  usePostHog: () => ({
    identify: analytics.identify,
    reset: analytics.reset,
  }),
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

afterEach(() => {
  cleanup()
  analytics.identify.mockClear()
  analytics.provider.mockClear()
  analytics.reset.mockClear()
  analytics.user.user = {
    id: 'user_123',
    fullName: 'Ana Norte',
    primaryEmailAddress: { emailAddress: 'ana@example.com' },
    createdAt: new Date('2026-01-02T03:04:05.000Z'),
  }
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
      return context.profile === 'missing' ? (
        <FinancialOnboarding />
      ) : (
        <Home home={context.home} roadmap={emptyRoadmap} />
      )
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
        previousMonthShortfalls: [],
      },
    })

    const router = createTestRouter()
    render(<RouterProvider router={router} />)

    expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeDefined()
    expect(screen.getAllByRole('navigation', { name: 'Navegación principal' })).toHaveLength(2)
  })

  it('provides PostHog and identifies the authenticated Clerk user', async () => {
    vi.mocked(getFinancialAppState).mockResolvedValue({ profile: 'missing' })

    const router = createTestRouter()
    const view = render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(analytics.provider).toHaveBeenCalledWith({
        apiKey: import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN,
        options: {
          api_host: '/ingest',
          capture_exceptions: true,
          ui_host: 'https://us.posthog.com',
        },
      })
      expect(analytics.identify).toHaveBeenCalledWith('user_123', {
        $name: 'Ana Norte',
        $email: 'ana@example.com',
        created_at: '2026-01-02T03:04:05.000Z',
      })
    })

    view.unmount()
    expect(analytics.reset).toHaveBeenCalledOnce()
  })

  it('omits unavailable Clerk profile properties', async () => {
    analytics.user.user = {
      id: 'user_456',
      fullName: null,
      primaryEmailAddress: null,
      createdAt: null,
    }
    vi.mocked(getFinancialAppState).mockResolvedValue({ profile: 'missing' })

    const router = createTestRouter()
    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(analytics.identify).toHaveBeenCalledWith('user_456', {})
    })
  })
})

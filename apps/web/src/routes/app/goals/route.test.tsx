// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import * as React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getGoalsWorkspace } from '../../../features/goals/goals.functions'
import type { GoalsWorkspace, GoalWorkspaceItem } from '../../../features/goals/goals'
import { Route as rootRoute } from '../../__root'
import { Route as AppRoute } from '../route'
import { Route as GoalsRoute } from './route'
import { Route as GoalsIndexRoute } from './index'

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

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}))

vi.mock('../../../features/goals/goals.functions', () => ({
  getGoalsWorkspace: vi.fn(),
  getAllocationChangeContext: vi.fn(),
}))

vi.mock('../../../features/financial/financial.functions', () => ({
  getFinancialAppState: vi.fn().mockResolvedValue({ profile: 'present' }),
  completeInitialPlan: vi.fn(),
}))

const sampleGoal: GoalWorkspaceItem = {
  id: 'goal-1',
  name: 'Colchón financiero',
  type: 'emergency_fund',
  currency: 'USD',
  priority: 'high',
  status: 'active',
  createdAt: '2026-08-01T00:00:00.000Z',
  desiredDate: '2027-01-01',
  targetAmount: { amount: '1000.00', currency: 'USD' },
  savingsValue: { amount: '200.00', currency: 'USD' },
  investmentValue: { amount: '100.00', currency: 'USD' },
  actualValue: { amount: '300.00', currency: 'USD' },
  strategy: 'save',
  funding: [
    {
      percentage: '100.00',
      monthlyContribution: { amount: '50000.00', currency: 'ARS' },
      allocatedBaseAmount: { amount: '50000.00', currency: 'ARS' },
      allocatedDestinationAmount: { amount: '33.33', currency: 'USD' },
      effectiveMonth: '2026-09',
    },
  ],
  projection: {
    status: 'available',
    completionMonth: '2027-06',
  },
  desiredDateDeltaMonths: 5,
  annualReturnRate: '8.000',
  availability: 'available_now',
  usesPlanningRate: false,
}

const sampleWorkspace: GoalsWorkspace = {
  groups: [
    {
      status: 'active',
      goals: [sampleGoal],
    },
    {
      status: 'paused',
      goals: [],
    },
    {
      status: 'completed',
      goals: [],
    },
  ],
}

const emptyWorkspace: GoalsWorkspace = {
  groups: [
    { status: 'active', goals: [] },
    { status: 'paused', goals: [] },
    { status: 'completed', goals: [] },
  ],
}

let currentRouter: any = null

function createTestRouter() {
  if (currentRouter) currentRouter.destroy?.()

  const testRootRoute = createRootRoute({
    component: rootRoute.options.component,
  })

  const appRoute = createRoute({
    getParentRoute: () => testRootRoute,
    path: '/app',
    beforeLoad: AppRoute.options.beforeLoad,
    component: AppRoute.options.component,
  })

  const goalsRoute = createRoute({
    getParentRoute: () => appRoute as any,
    path: '/goals',
    pendingMs: 0,
    pendingMinMs: 0,
    loader: GoalsRoute.options.loader,
    pendingComponent: GoalsRoute.options.pendingComponent,
    errorComponent: GoalsRoute.options.errorComponent,
    component: GoalsRoute.options.component,
  })

  const goalsIndexRoute = createRoute({
    getParentRoute: () => goalsRoute as any,
    path: '/',
    component: GoalsIndexRoute.options.component,
  })

  const history = createMemoryHistory({ initialEntries: ['/app/goals'] })
  currentRouter = createRouter({
    routeTree: testRootRoute.addChildren([
      appRoute.addChildren([goalsRoute.addChildren([goalsIndexRoute]) as any] as any),
    ] as any),
    history,
    defaultPendingMs: 0,
    defaultPendingMinMs: 0,
  } as any)
  return currentRouter
}

afterEach(() => {
  if (currentRouter) {
    currentRouter.cancelMatches?.()
    currentRouter.history.destroy?.()
    currentRouter.destroy?.()
    currentRouter = null
  }
  cleanup()
  vi.clearAllMocks()
})

describe('Goals routes and workspace', () => {
  describe('Workspace layout and states (/app/goals)', () => {
    it('renders the populated workspace when goals exist', async () => {
      vi.mocked(getGoalsWorkspace).mockResolvedValue({
        profile: 'present',
        workspace: sampleWorkspace,
      })

      const router = createTestRouter()
      render(<RouterProvider router={router} />)

      expect(await screen.findByRole('heading', { level: 1, name: 'Objetivos' })).toBeDefined()
      expect(screen.queryByRole('heading', { level: 2, name: 'Activos' })).not.toBeInTheDocument()
      expect(screen.queryByText('Activos')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cambiar planificación de objetivos' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Ver detalle de Colchón financiero' })).toBeDefined()
      expect(screen.queryByRole('link', { name: /Colchón financiero/i })).toBeNull()
    })

    it('renders empty state when no goals exist', async () => {
      vi.mocked(getGoalsWorkspace).mockResolvedValue({
        profile: 'present',
        workspace: emptyWorkspace,
      })

      const router = createTestRouter()
      render(<RouterProvider router={router} />)

      expect(await screen.findByText('No tenés objetivos registrados')).toBeDefined()
      expect(screen.queryByRole('button', { name: 'Cambiar planificación de objetivos' })).not.toBeInTheDocument()
    })

    it('renders onboarding prompt when profile is missing', async () => {
      vi.mocked(getGoalsWorkspace).mockResolvedValue({
        profile: 'missing',
      })

      const router = createTestRouter()
      render(<RouterProvider router={router} />)

      expect(await screen.findByRole('heading', { name: 'Vamos a construir tu perfil financiero' })).toBeDefined()
    })

    it('renders error alert on loader failure and retries on button click', async () => {
      let shouldFail = true
      vi.mocked(getGoalsWorkspace).mockImplementation(async () => {
        if (shouldFail) {
          throw new Error('Network error')
        }
        return {
          profile: 'present',
          workspace: sampleWorkspace,
        }
      })

      const router = createTestRouter()
      render(<RouterProvider router={router} />)

      expect(await screen.findByRole('alert')).toBeDefined()
      expect(screen.getByText('No pudimos cargar tus objetivos')).toBeDefined()

      shouldFail = false
      const retryButton = screen.getByRole('button', { name: 'Reintentar' })
      fireEvent.click(retryButton)

      expect(await screen.findByRole('heading', { level: 1, name: 'Objetivos' })).toBeDefined()
      expect(screen.queryByRole('heading', { level: 2, name: 'Activos' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cambiar planificación de objetivos' })).toBeInTheDocument()
    })
  })
})

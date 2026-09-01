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
import {
  getGoalsWorkspace,
  getGoalEditContext,
  getGoalLifecycleContext,
  previewGoalLifecycle,
  getGoalCompletionContext,
} from '../../../features/goals/goals.functions'
import type { GoalsWorkspace, GoalWorkspaceItem } from '../../../features/goals/goals'
import { Route as rootRoute } from '../../__root'
import { Route as AppRoute } from '../route'
import { Route as GoalsRoute } from './route'
import { Route as GoalsIndexRoute } from './index'

vi.mock('@clerk/tanstack-react-start', () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  UserButton: () => <button type="button">Cuenta</button>,
  useUser: () => ({
    isLoaded: true,
    isSignedIn: true,
    user: { id: 'user_test', fullName: null, primaryEmailAddress: null, createdAt: null },
  }),
}))

vi.mock('@posthog/react', () => ({
  PostHogProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  usePostHog: () => ({ identify: vi.fn(), reset: vi.fn() }),
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
  getGoalEditContext: vi.fn(),
  previewGoalEdit: vi.fn(),
  confirmGoalEdit: vi.fn(),
  getGoalLifecycleContext: vi.fn(),
  previewGoalLifecycle: vi.fn(),
  confirmGoalLifecycle: vi.fn(),
  getGoalCompletionContext: vi.fn(),
  previewGoalCompletion: vi.fn(),
  confirmGoalCompletion: vi.fn(),
}))

vi.mock('../../../features/financial/financial.functions', () => ({
  getFinancialAppState: vi.fn().mockResolvedValue({ profile: 'present' }),
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
  completionEligible: false,
}

const sampleFinancialSummary = {
  month: '2026-08',
  income: { amount: '150000.00', currency: 'ARS' as const },
  expenses: { amount: '50000.00', currency: 'ARS' as const },
  balance: { amount: '100000.00', currency: 'ARS' as const },
  dedicationPercentage: '90',
  contribution: { amount: '90000.00', currency: 'ARS' as const },
}

const sampleWorkspace: GoalsWorkspace = {
  financialSummary: sampleFinancialSummary,
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
  financialSummary: sampleFinancialSummary,
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

      expect(await screen.findByRole('heading', { name: 'Hola, te damos la bienvenida a Norte!' })).toBeDefined()
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

    it('opens GoalEditSheet when editing a goal from card button and displays prefilled data', async () => {
      vi.mocked(getGoalsWorkspace).mockResolvedValue({
        profile: 'present',
        workspace: sampleWorkspace,
      })
      vi.mocked(getGoalEditContext).mockResolvedValue({
        profile: 'present',
        goalId: 'goal-1',
        draft: {
          type: 'emergency_fund',
          name: 'Colchón financiero',
          targetAmount: '1.000',
          currency: 'USD',
          desiredMonth: '2027-01',
          priority: 'high',
          strategy: 'save',
          annualReturnRate: '8',
          availability: 'available_now',
          availableFromMonth: '',
          allocations: [{ goalId: 'goal-1', percentage: '100.00' }],
        },
        context: {
          currentMonth: '2026-08',
          expensesKnowledge: 'known',
          hasEmergencyFund: false,
          plannedMonthlyContribution: { amount: '50000.00', currency: 'ARS' },
          currentAllocation: {
            effectiveMonth: '2026-08-01',
            entries: [{ goalId: 'goal-1', percentage: '100.00' }],
          },
        },
      })

      const router = createTestRouter()
      render(<RouterProvider router={router} />)

      const editBtn = await screen.findByRole('button', { name: 'Editar objetivo Colchón financiero' })
      fireEvent.click(editBtn)

      expect(await screen.findByRole('heading', { level: 2, name: 'Editar objetivo' })).toBeInTheDocument()
      expect(await screen.findByLabelText('Tipo de objetivo')).toBeInTheDocument()
      expect(screen.queryByLabelText('Nombre del objetivo')).not.toBeInTheDocument()
    })

  it('opens GoalLifecycleSheet when clicking Pausar objetivo on active goal', async () => {
      vi.mocked(getGoalsWorkspace).mockResolvedValue({
        profile: 'present',
        workspace: sampleWorkspace,
      })
      vi.mocked(getGoalLifecycleContext).mockResolvedValue({
        profile: 'present',
        goalId: 'goal-1',
        lifecycle: 'pause',
        goalName: 'Colchón financiero',
        currentMonth: '2026-08',
        plannedMonthlyContribution: { amount: '50000.00', currency: 'ARS' },
        activeGoals: [{ id: 'goal-1', name: 'Colchón financiero', currency: 'USD' }],
        currentAllocation: {
          effectiveMonth: '2026-08-01',
          entries: [{ goalId: 'goal-1', percentage: '100.00' }],
        },
      })
      vi.mocked(previewGoalLifecycle).mockResolvedValue({
        previewToken: '1'.repeat(64),
        proposal: {
          lifecycle: 'pause',
          goalId: 'goal-1',
          nextStatus: 'paused',
          transition: { goalId: 'goal-1', status: 'paused' },
          pauseMonthlyCommitment: true,
          allocation: {
            monthlyContribution: undefined,
            effectiveMonth: '2026-09-01',
            totalPercentage: '0.00',
            entries: [],
          },
          persistedAllocation: {
            effectiveMonth: '2026-09-01',
            entries: [],
          },
          impacts: [],
          proposedSource: {
            profile: null,
            goals: [],
            savingsPositions: [],
            investmentPositions: [],
            snapshots: [],
            allocations: [],
          },
        },
      })

      const router = createTestRouter()
      render(<RouterProvider router={router} />)

      const pauseBtn = await screen.findByRole('button', { name: 'Pausar objetivo Colchón financiero' })
      fireEvent.click(pauseBtn)

      expect(await screen.findByRole('heading', { level: 2, name: 'Pausar objetivo' })).toBeInTheDocument()
      expect(getGoalLifecycleContext).toHaveBeenCalledWith({
        data: { goalId: 'goal-1', lifecycle: 'pause' },
      })
    })

    it('opens GoalLifecycleSheet when clicking Reanudar objetivo on paused goal', async () => {
      const pausedGoal: GoalWorkspaceItem = {
        ...sampleGoal,
        id: 'goal-2',
        name: 'Viaje',
        status: 'paused',
      }
      const workspaceWithPaused: GoalsWorkspace = {
        financialSummary: sampleFinancialSummary,
        groups: [
          { status: 'active', goals: [] },
          { status: 'paused', goals: [pausedGoal] },
          { status: 'completed', goals: [] },
        ],
      }

      vi.mocked(getGoalsWorkspace).mockResolvedValue({
        profile: 'present',
        workspace: workspaceWithPaused,
      })
      vi.mocked(getGoalLifecycleContext).mockResolvedValue({
        profile: 'present',
        goalId: 'goal-2',
        lifecycle: 'resume',
        goalName: 'Viaje',
        currentMonth: '2026-08',
        plannedMonthlyContribution: { amount: '50000.00', currency: 'ARS' },
        activeGoals: [],
        currentAllocation: {
          effectiveMonth: '2026-08-01',
          entries: [],
        },
      })
      vi.mocked(previewGoalLifecycle).mockResolvedValue({
        previewToken: '2'.repeat(64),
        proposal: {
          lifecycle: 'resume',
          goalId: 'goal-2',
          nextStatus: 'active',
          transition: { goalId: 'goal-2', status: 'active' },
          pauseMonthlyCommitment: false,
          allocation: {
            monthlyContribution: { amount: '50000.00', currency: 'ARS' },
            effectiveMonth: '2026-09-01',
            totalPercentage: '0.00',
            entries: [],
          },
          persistedAllocation: {
            effectiveMonth: '2026-09-01',
            entries: [],
          },
          impacts: [],
          proposedSource: {
            profile: null,
            goals: [],
            savingsPositions: [],
            investmentPositions: [],
            snapshots: [],
            allocations: [],
          },
        },
      })

      const router = createTestRouter()
      render(<RouterProvider router={router} />)

      const pausedGroupBtn = await screen.findByRole('button', { name: /Pausados/i })
      fireEvent.click(pausedGroupBtn)

      const resumeBtn = await screen.findByRole('button', { name: 'Reanudar objetivo Viaje' })
      fireEvent.click(resumeBtn)

      expect(await screen.findByRole('heading', { level: 2, name: 'Reanudar objetivo' })).toBeInTheDocument()
      expect(getGoalLifecycleContext).toHaveBeenCalledWith({
        data: { goalId: 'goal-2', lifecycle: 'resume' },
      })
    })

    it('keeps Edit and Lifecycle sheets completely separate without cross-opening', async () => {
      vi.mocked(getGoalsWorkspace).mockResolvedValue({
        profile: 'present',
        workspace: sampleWorkspace,
      })
      vi.mocked(getGoalLifecycleContext).mockResolvedValue({
        profile: 'present',
        goalId: 'goal-1',
        lifecycle: 'pause',
        goalName: 'Colchón financiero',
        currentMonth: '2026-08',
        plannedMonthlyContribution: { amount: '50000.00', currency: 'ARS' },
        activeGoals: [{ id: 'goal-1', name: 'Colchón financiero', currency: 'USD' }],
        currentAllocation: {
          effectiveMonth: '2026-08-01',
          entries: [{ goalId: 'goal-1', percentage: '100.00' }],
        },
      })

      const router = createTestRouter()
      render(<RouterProvider router={router} />)

      const pauseBtn = await screen.findByRole('button', { name: 'Pausar objetivo Colchón financiero' })
      fireEvent.click(pauseBtn)

      expect(await screen.findByRole('heading', { level: 2, name: 'Pausar objetivo' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { level: 2, name: 'Editar objetivo' })).not.toBeInTheDocument()
    })
  })

  it('mounts the shared completion sheet for an eligible goal action', async () => {
    vi.mocked(getGoalsWorkspace).mockResolvedValue({
      profile: 'present',
      workspace: {
        ...sampleWorkspace,
        groups: [{ status: 'active', goals: [{ ...sampleGoal, type: 'purchase', completionEligible: true }] }],
      },
    })
    vi.mocked(getGoalCompletionContext).mockResolvedValue({
      profile: 'present',
      context: {
        goalId: 'goal-1',
        goalName: 'Colchón financiero',
        targetAmount: { amount: '1000.00', currency: 'USD' },
        savingsValue: { amount: '1000.00', currency: 'USD' },
        currentMonth: '2026-08',
        savingsPlaces: [{ id: 'place-1', name: 'Caja', balance: { amount: '1000.00', currency: 'USD' } }],
        activeGoals: [{ id: 'goal-1', name: 'Colchón financiero', currency: 'USD' }],
      },
    })

    const router = createTestRouter()
    render(<RouterProvider router={router} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Marcar como cumplido Colchón financiero' }))
    expect(await screen.findByRole('heading', { name: 'Completar objetivo' })).toBeInTheDocument()
    expect(getGoalCompletionContext).toHaveBeenCalledWith({ data: { goalId: 'goal-1' } })
  })
})

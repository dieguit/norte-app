// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import * as React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  createMemoryHistory,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getGoalsWorkspace } from '../../../features/goals/goals.functions'
import type { GoalsWorkspace, GoalWorkspaceItem } from '../../../features/goals/goals'
import { Route as rootRoute } from '../../__root'
import { Route as AppRoute } from '../route'
import { Route as GoalsRoute } from './route'
import { Route as GoalsIndexRoute } from './index'
import { Route as GoalDetailRoute } from './$goalId'

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
}))

vi.mock('../../../features/financial/financial.functions', () => ({
  getFinancialAppState: vi.fn().mockResolvedValue({ profile: 'present' }),
  completeInitialPlan: vi.fn(),
}))

vi.mock('../../../components/ui/sheet', async () => {
  const React = await import('react')

  type SheetContextValue = {
    open: boolean
    onOpenChange?: (open: boolean) => void
  }

  const SheetContext = React.createContext<SheetContextValue>({ open: false })

  type SheetProps = React.PropsWithChildren<{
    open: boolean
    onOpenChange?: (open: boolean) => void
  }>

  type SheetContentProps = React.PropsWithChildren<{
    finalFocus?: () => HTMLElement | null
  }>

  type ChildrenProps = React.PropsWithChildren

  function Sheet({ open, onOpenChange, children }: SheetProps) {
    return React.createElement(
      SheetContext.Provider,
      { value: { open, onOpenChange } },
      children
    )
  }

  function SheetContent({ children, finalFocus }: SheetContentProps) {
    const { open, onOpenChange } = React.useContext(SheetContext)

    const dismiss = React.useCallback(() => {
      const focusTarget = finalFocus?.() ?? null
      onOpenChange?.(false)
      focusTarget?.focus()
    }, [finalFocus, onOpenChange])

    React.useEffect(() => {
      if (!open) return
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') dismiss()
      }
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }, [dismiss, open])

    if (!open) return null

    return React.createElement(
      'div',
      { role: 'dialog', 'aria-modal': 'true', 'data-slot': 'sheet-content' },
      React.createElement('button', {
        type: 'button',
        'data-slot': 'sheet-close',
        onClick: dismiss,
        children: 'Cerrar',
      }),
      children
    )
  }

  function SheetTitle({ children }: ChildrenProps) {
    return React.createElement('h2', null, children)
  }

  function SheetDescription({ children }: ChildrenProps) {
    return React.createElement('p', null, children)
  }

  function SheetHeader({ children }: ChildrenProps) {
    return React.createElement('div', null, children)
  }

  return {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
  }
})

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
  progressPercentage: '30.00',
  usesPlanningRate: false,
  saveEnabled: true,
  investEnabled: true,
  funding: [
    {
      channelId: 'ch-1',
      fundingMethod: 'save',
      destinationCurrency: 'USD',
      percentage: '100.00',
      commitmentStatus: 'active',
      monthlyCommitment: { amount: '50000.00', currency: 'ARS' },
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

function stubMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'scrollTo', { writable: true, value: vi.fn() })
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

let currentRouter: any = null

function createTestRouter(initialEntries: string[] = ['/app/goals']) {
  if (currentRouter) {
    currentRouter.destroy?.()
  }
  const appRoute = AppRoute.update({
    id: '/app',
    path: '/app',
    getParentRoute: () => rootRoute,
  } as any)
  const goalsRoute = createRoute({
    getParentRoute: () => appRoute,
    path: '/goals',
    pendingMs: 0,
    pendingMinMs: 0,
    loader: GoalsRoute.options.loader,
    pendingComponent: GoalsRoute.options.pendingComponent,
    errorComponent: GoalsRoute.options.errorComponent,
    component: GoalsRoute.options.component,
  })
  const goalsIndexRoute = createRoute({
    getParentRoute: () => goalsRoute,
    path: '/',
    component: GoalsIndexRoute.options.component,
  })
  const goalDetailRoute = createRoute({
    getParentRoute: () => goalsRoute,
    path: '/$goalId',
    component: GoalDetailRoute.options.component,
  })
  const testRouteTree = rootRoute.addChildren([
    appRoute.addChildren([goalsRoute.addChildren([goalsIndexRoute, goalDetailRoute])]),
  ])
  const history = createMemoryHistory({ initialEntries })
  currentRouter = createRouter({
    routeTree: testRouteTree,
    history,
    defaultPendingMs: 0,
    defaultPendingMinMs: 0,
  })
  return currentRouter
}

beforeEach(() => {
  stubMatchMedia(true)
})

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

describe('Goals routes and responsive detail', () => {
  describe('Workspace layout and states (/app/goals)', () => {
    it('renders the populated workspace when goals exist', async () => {
      vi.mocked(getGoalsWorkspace).mockResolvedValue({
        profile: 'present',
        workspace: sampleWorkspace,
      })

      const router = createTestRouter(['/app/goals'])
      render(<RouterProvider router={router} />)

      expect(await screen.findByRole('heading', { level: 1, name: 'Objetivos' })).toBeDefined()
      expect(screen.getByRole('heading', { level: 2, name: 'Activos' })).toBeDefined()
      expect(screen.getByRole('link', { name: /Ver Colchón financiero/i })).toBeDefined()
    })

    it('renders empty state when no goals exist', async () => {
      vi.mocked(getGoalsWorkspace).mockResolvedValue({
        profile: 'present',
        workspace: emptyWorkspace,
      })

      const router = createTestRouter(['/app/goals'])
      render(<RouterProvider router={router} />)

      expect(await screen.findByText('No tenés objetivos registrados')).toBeDefined()
    })

    it('renders onboarding prompt when profile is missing', async () => {
      vi.mocked(getGoalsWorkspace).mockResolvedValue({
        profile: 'missing',
      })

      const router = createTestRouter(['/app/goals'])
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

      const router = createTestRouter(['/app/goals'])
      render(<RouterProvider router={router} />)

      expect(await screen.findByRole('alert')).toBeDefined()
      expect(screen.getByText('No pudimos cargar tus objetivos')).toBeDefined()

      shouldFail = false
      const retryButton = screen.getByRole('button', { name: 'Reintentar' })
      fireEvent.click(retryButton)

      expect(await screen.findByRole('heading', { level: 1, name: 'Objetivos' })).toBeDefined()
      expect(screen.getByRole('heading', { level: 2, name: 'Activos' })).toBeDefined()
    })
  })

  describe('Desktop detail view (/app/goals/$goalId on md+)', () => {
    it('renders Sheet dialog with accessible title, keeps workspace mounted, and closes to /app/goals on button click', async () => {
      stubMatchMedia(true)
      vi.mocked(getGoalsWorkspace).mockResolvedValue({
        profile: 'present',
        workspace: sampleWorkspace,
      })

      const router = createTestRouter(['/app/goals/goal-1'])
      render(<RouterProvider router={router} />)

      // Sheet dialog is present
      const dialog = await screen.findByRole('dialog')
      expect(dialog).toBeDefined()
      expect(screen.getByText('Detalle del objetivo, su valor actual y su Plan.')).toBeDefined()

      // Workspace remains mounted behind the Sheet on desktop
      expect(screen.getByRole('heading', { level: 1, name: 'Objetivos', hidden: true })).toBeDefined()
      const goalLink = screen.getByRole('link', { name: /Ver Colchón financiero/i, hidden: true })
      expect(goalLink).toBeDefined()
      expect(goalLink.id).toBe('goal-link-goal-1')
      expect(goalLink).toHaveAttribute('href', '/app/goals/goal-1')

      // Goal detail sections are visible inside the Sheet
      expect(screen.getByRole('heading', { name: 'Resumen' })).toBeDefined()
      expect(screen.getByRole('heading', { name: 'Valor actual' })).toBeDefined()
      expect(screen.getByRole('heading', { name: 'Plan' })).toBeDefined()
      expect(screen.getByRole('heading', { name: 'Supuestos' })).toBeDefined()

      // Sheet close button is accessible
      const closeButton = screen.getByRole('button', { name: /cerrar/i })
      expect(closeButton).toBeDefined()
      expect(closeButton.getAttribute('data-slot')).toBe('sheet-close')

      // Clicking close button navigates to /app/goals and restores focus
      fireEvent.click(closeButton)
      await waitFor(() => {
        expect(router.history.location.pathname.replace(/\/$/, '')).toBe('/app/goals')
      })
      await waitFor(() => {
        expect(document.activeElement?.id).toBe('goal-link-goal-1')
      })
    })

    it('closes Sheet dialog and restores focus to goal link when pressing Escape', async () => {
      stubMatchMedia(true)
      vi.mocked(getGoalsWorkspace).mockResolvedValue({
        profile: 'present',
        workspace: sampleWorkspace,
      })

      const router = createTestRouter(['/app/goals/goal-1'])
      render(<RouterProvider router={router} />)

      const dialog = await screen.findByRole('dialog')
      expect(dialog).toBeDefined()
      const goalLink = screen.getByRole('link', { name: /Ver Colchón financiero/i, hidden: true })
      expect(goalLink.id).toBe('goal-link-goal-1')

      // Pressing Escape dismisses the dialog and navigates to /app/goals
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })
      await waitFor(() => {
        expect(router.history.location.pathname.replace(/\/$/, '')).toBe('/app/goals')
      })
      await waitFor(() => {
        expect(document.activeElement?.id).toBe('goal-link-goal-1')
      })
    })
  })

  describe('Mobile detail view (/app/goals/$goalId on < md)', () => {
    it('renders full-width main region with Volver a objetivos link and hides workspace', async () => {
      stubMatchMedia(false)
      vi.mocked(getGoalsWorkspace).mockResolvedValue({
        profile: 'present',
        workspace: sampleWorkspace,
      })

      const router = createTestRouter(['/app/goals/goal-1'])
      const { container } = render(<RouterProvider router={router} />)

      // Main region is present, no dialog
      const backLink = await screen.findByRole('link', { name: 'Volver a objetivos' })
      expect(backLink).toBeDefined()
      expect(backLink).toHaveClass('min-h-[44px]', 'text-[var(--lagoon-deep)]', 'focus-visible:ring-2')
      expect(screen.queryByRole('dialog')).toBeNull()

      // Shared detail headings are present
      expect(screen.getByRole('heading', { name: 'Resumen' })).toBeDefined()
      expect(screen.getByRole('heading', { name: 'Valor actual' })).toBeDefined()
      expect(screen.getByRole('heading', { name: 'Plan' })).toBeDefined()
      expect(screen.getByRole('heading', { name: 'Supuestos' })).toBeDefined()

      // Workspace container has hidden md:block class
      const workspaceWrapper = container.querySelector('[class*="hidden md:block"]')
      expect(workspaceWrapper).not.toBeNull()
      expect(workspaceWrapper?.textContent).toContain('Objetivos')
      expect(container.querySelectorAll('main')).toHaveLength(1)
    })
  })

  describe('Not found handling', () => {
    it('renders GoalNotFound when goal does not exist', async () => {
      stubMatchMedia(true)
      vi.mocked(getGoalsWorkspace).mockResolvedValue({
        profile: 'present',
        workspace: sampleWorkspace,
      })

      const router = createTestRouter(['/app/goals/unknown-goal'])
      render(<RouterProvider router={router} />)

      expect(await screen.findByText('Objetivo no encontrado')).toBeDefined()
      expect(screen.getByText('El objetivo que buscás no existe o no tenés acceso a él.')).toBeDefined()
      expect(screen.getByRole('link', { name: 'Volver a objetivos' })).toBeDefined()
    })
  })
})

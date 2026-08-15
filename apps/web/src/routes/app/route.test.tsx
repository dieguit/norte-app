// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import {
  createMemoryHistory,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getFinancialAppState } from '../../app/access'
import { FinancialOnboarding } from '../../app/FinancialOnboarding'
import { Home } from '../../app/Home'
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

vi.mock('../../app/access', () => ({
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
      const { profile } = AppRoute.useRouteContext()
      return profile === 'missing' ? <FinancialOnboarding /> : <Home />
    },
  })

  const routeTree = rootRoute.addChildren([appRoute.addChildren([childRoute])])
  const history = createMemoryHistory({ initialEntries: ['/app'] })
  return createRouter({ routeTree, history })
}

describe('App route layout', () => {
  it('renders AppShell with main navigation around /app outlet', async () => {
    vi.mocked(getFinancialAppState).mockResolvedValue({ profile: 'present' })

    const router = createTestRouter()
    render(<RouterProvider router={router} />)

    expect(await screen.findByRole('heading', { name: 'Tu plan financiero' })).toBeDefined()
    expect(screen.getAllByRole('navigation', { name: 'Navegación principal' })).toHaveLength(2)
  })
})

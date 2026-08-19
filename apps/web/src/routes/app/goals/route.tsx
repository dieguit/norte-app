import { createFileRoute, Outlet, useRouter, useRouterState } from '@tanstack/react-router'
import { getGoalsWorkspace } from '../../../features/goals/goals.functions'
import { FinancialOnboarding } from '../-components/FinancialOnboarding'
import { GoalsEmpty, GoalsError, GoalsLoading } from './-components/GoalsRouteStates'
import { GoalsWorkspace } from './-components/GoalsWorkspace'

export const Route = createFileRoute('/app/goals')({
  loader: () => getGoalsWorkspace(),
  pendingMs: 0,
  pendingMinMs: 300,
  pendingComponent: GoalsLoading,
  errorComponent: GoalsRouteError,
  component: GoalsLayout,
})

function GoalsRouteError() {
  const router = useRouter()
  return (
    <GoalsError
      onRetry={() => {
        router.invalidate()
      }}
    />
  )
}

function GoalsLayout() {
  const data = Route.useLoaderData()
  const routerState = useRouterState()
  const pathname = routerState.location.pathname
  const isDetailSelected = pathname.startsWith('/app/goals/') && pathname !== '/app/goals/'

  if (data.profile === 'missing') {
    return <FinancialOnboarding />
  }

  const hasGoals = data.workspace.groups.some((group) => group.goals.length > 0)

  return (
    <>
      <div className={isDetailSelected ? 'hidden md:block' : undefined}>
        {hasGoals ? <GoalsWorkspace workspace={data.workspace} /> : <GoalsEmpty />}
      </div>
      <Outlet />
    </>
  )
}

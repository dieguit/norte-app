import { createFileRoute, useRouter } from '@tanstack/react-router'
import { getFinancesWorkspace } from '../../features/financial/financial.functions'
import { getGoalsWorkspace } from '../../features/goals/goals.functions'
import { buildRoadmap } from '../../features/roadmap/roadmap'
import { FinancialOnboarding } from './-components/FinancialOnboarding'
import { Home } from './-components/Home'
import { HomeError, HomeLoading } from './-components/HomeRouteStates'

export async function loadHomeRoadmap(profile: 'missing' | 'present', currentMonth: string) {
  if (profile === 'missing') return null
  const [goalsState, finances] = await Promise.all([getGoalsWorkspace(), getFinancesWorkspace()])
  if (goalsState.profile !== 'present' || !finances) throw new Error('Roadmap data is unavailable.')
  return buildRoadmap({ goals: goalsState.workspace, finances, currentMonth })
}

export const Route = createFileRoute('/app/')({
  loader: ({ context }) => loadHomeRoadmap(context.profile, new Date().toISOString().slice(0, 7)),
  pendingMs: 0,
  pendingMinMs: 300,
  pendingComponent: HomeLoading,
  errorComponent: HomeRouteError,
  component: AppIndex,
})

function HomeRouteError() {
  const router = useRouter()
  return <HomeError onRetry={() => router.invalidate()} />
}

function AppIndex() {
  const context = Route.useRouteContext()
  const roadmap = Route.useLoaderData()
  return context.profile === 'missing' || !roadmap ? (
    <FinancialOnboarding />
  ) : (
    <Home home={context.home} roadmap={roadmap} />
  )
}

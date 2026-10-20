import { createFileRoute, useRouter } from '@tanstack/react-router'
import { getHomeRoadmap } from '../../features/home/home.functions'
import { FinancialOnboarding } from './-components/FinancialOnboarding'
import { Home } from './-components/Home'
import { HomeError, HomeLoading } from './-components/HomeRouteStates'

export async function loadHomeRoadmap(profile: 'missing' | 'present', currentMonth: string) {
  if (profile === 'missing') return null
  const response = await getHomeRoadmap({ data: { currentMonth } })
  if (response.profile === 'missing' || !response.roadmap || !response.completionGoals) {
    throw new Error('Roadmap data is unavailable.')
  }
  return {
    roadmap: response.roadmap,
    completionGoals: response.completionGoals,
  }
}

export const Route = createFileRoute('/app/')({
  head: () => ({
    meta: [
      { title: 'Inicio | Norte' },
      { name: 'description', content: 'Consultá tu hoja de ruta financiera y los próximos pasos hacia tus objetivos.' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
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
  const data = Route.useLoaderData()
  return context.profile === 'missing' || !data ? (
    <FinancialOnboarding />
  ) : (
    <Home home={context.home} roadmap={data.roadmap} completionGoals={data.completionGoals} />
  )
}

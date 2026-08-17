import { createFileRoute } from '@tanstack/react-router'
import { FinancialOnboarding } from './-components/FinancialOnboarding'
import { Home } from './-components/Home'

export const Route = createFileRoute('/app/')({
  component: AppIndex,
})

function AppIndex() {
  const context = Route.useRouteContext()
  return context.profile === 'missing' ? (
    <FinancialOnboarding />
  ) : (
    <Home home={context.home} />
  )
}

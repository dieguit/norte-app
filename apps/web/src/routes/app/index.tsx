import { createFileRoute } from '@tanstack/react-router'
import { FinancialOnboarding } from '../../app/FinancialOnboarding'
import { Home } from '../../app/Home'

export const Route = createFileRoute('/app/')({
  component: AppIndex,
})

function AppIndex() {
  const { profile } = Route.useRouteContext()
  return profile === 'missing' ? <FinancialOnboarding /> : <Home />
}

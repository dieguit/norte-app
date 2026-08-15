import { createFileRoute, Outlet } from '@tanstack/react-router'
import { getFinancialAppState } from '../../app/access'
import { AppShell } from '../../app/AppShell'

export const Route = createFileRoute('/app')({
  beforeLoad: async () => await getFinancialAppState(),
  component: AppLayout,
})

function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

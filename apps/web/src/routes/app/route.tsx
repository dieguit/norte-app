import { createFileRoute, Outlet } from '@tanstack/react-router'
import { getFinancialAppState } from '../../features/financial/financial.functions'
import { AppShell } from './-components/AppShell'

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

import { createFileRoute } from '@tanstack/react-router'
import { AdminPage } from '../../components/admin-page'

export const Route = createFileRoute('/admin/')({
  component: AdminIndexComponent,
})

function AdminIndexComponent() {
  const { authenticated } = Route.useRouteContext()
  return <AdminPage authenticated={authenticated} />
}

import { createFileRoute } from '@tanstack/react-router'
import { getAdminSession } from '../admin/auth'
import { AdminPage } from '../components/admin-page'

export const Route = createFileRoute('/admin')({
  beforeLoad: async () => {
    const authenticated = await getAdminSession()
    return {
      authenticated,
    }
  },
  head: () => ({
    meta: [
      { title: 'Administración | Norte' },
      { name: 'description', content: 'Panel de administración de Norte' },
    ],
  }),
  component: AdminComponent,
})

function AdminComponent() {
  const { authenticated } = Route.useRouteContext()
  return <AdminPage authenticated={authenticated} />
}

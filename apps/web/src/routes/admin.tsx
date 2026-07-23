import { createFileRoute, Outlet } from '@tanstack/react-router'
import { getAdminSession } from '../admin/auth'

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
  return <Outlet />
}

import { createFileRoute } from '@tanstack/react-router'
import { getAdminSession } from '../../admin/auth'
import { AdminResultDetailsPage } from '../../components/admin-result-details-page'

export const Route = createFileRoute('/admin/resultados/$deviceId')({
  beforeLoad: async () => ({ authenticated: await getAdminSession() }),
  head: () => ({
    meta: [
      { title: 'Resultados | Administración | Norte' },
      { name: 'description', content: 'Resultados de onboarding de Norte' },
    ],
  }),
  component: AdminResultDetailsComponent,
})

function AdminResultDetailsComponent() {
  const { authenticated } = Route.useRouteContext()
  const { deviceId } = Route.useParams()
  return <AdminResultDetailsPage authenticated={authenticated} deviceId={deviceId} />
}

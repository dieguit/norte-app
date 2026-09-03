import { AdminLoginPage, AdminResultsPage } from './admin-page-components'

export { getResultStatus } from './admin-page-hooks'

export function AdminPage({ authenticated }: { authenticated: boolean }) {
  return authenticated ? <AdminResultsPage /> : <AdminLoginPage />
}

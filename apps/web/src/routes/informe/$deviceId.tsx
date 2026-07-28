import { createFileRoute } from '@tanstack/react-router'
import type { Report } from '../../admin/report'
import { InformePage } from '../../components/informe-page'
import demoReport from '../../informe/demo.json'
import { getPublicReport } from '../../informe/server'

export const Route = createFileRoute('/informe/$deviceId')({
  loader: ({ params }) => loadInformeReport(params.deviceId),
  head: () => ({
    meta: [
      { title: 'Informe inicial de claridad | Norte' },
      { name: 'description', content: 'Tu informe inicial de claridad financiera de Norte.' },
      { name: 'theme-color', content: '#3a6e54' },
    ],
  }),
  component: InformeRoutePage,
})

export async function loadInformeReport(deviceId: string) {
  return deviceId === 'demo'
    ? (demoReport as unknown as Report)
    : getPublicReport({ data: { deviceId } })
}

function InformeRoutePage() {
  const { deviceId } = Route.useParams()
  return <InformeRouteContent report={Route.useLoaderData()} deviceId={deviceId} />
}

export function InformeRouteContent({ report, deviceId }: { report: Report | null; deviceId: string }) {
  if (!report) {
    return <main id="main" className="page-wrap py-8 sm:py-12">No se encontro el informe, por favor verifica el link</main>
  }

  return <InformePage report={report} deviceId={deviceId} />
}

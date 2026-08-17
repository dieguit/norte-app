import { createFileRoute } from '@tanstack/react-router'
import type { Report } from '@/features/admin/report'
import { InformePage } from './-components/informe-page'
import demoReport from '@/features/informe/demo.json'
import { getPublicReport } from '@/features/informe/informe.functions'

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
    ? { report: demoReport as unknown as Report, ctaClickedOn: null }
    : getPublicReport({ data: { deviceId } })
}

function InformeRoutePage() {
  const { deviceId } = Route.useParams()
  return <InformeRouteContent data={Route.useLoaderData()} deviceId={deviceId} />
}

export function InformeRouteContent({
  data,
  deviceId,
}: {
  data: { report: Report; ctaClickedOn: Date | string | null } | null
  deviceId: string
}) {
  if (!data || !data.report) {
    return <main id="main" className="page-wrap py-8 sm:py-12">No se encontro el informe, por favor verifica el link</main>
  }

  return <InformePage report={data.report} deviceId={deviceId} ctaClickedOn={data.ctaClickedOn} />
}

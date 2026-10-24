import { createFileRoute } from '@tanstack/react-router'
import { getBenefitsPage } from '../../../features/benefits/benefits.functions'
import { BenefitsPage } from './-components/BenefitsPage'

export const Route = createFileRoute('/app/finances/benefits')({
  loader: () => getBenefitsPage(),
  component: BenefitsRoute,
})

function BenefitsRoute() {
  const { catalog, preferences } = Route.useLoaderData()
  return <BenefitsPage catalog={catalog} preferences={preferences} />
}

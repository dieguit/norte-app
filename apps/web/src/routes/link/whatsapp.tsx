import { createFileRoute } from '@tanstack/react-router'
import { claimWhatsappLink } from '@/features/whatsapp/whatsapp-link.functions'
import { WhatsappLinkPage } from './-components/WhatsappLinkPage'

export const Route = createFileRoute('/link/whatsapp')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  loaderDeps: ({ search }) => ({ token: search.token }),
  loader: ({ deps }) =>
    deps.token ? claimWhatsappLink({ data: { token: deps.token } }) : ('invalid' as const),
  head: () => ({ meta: [{ title: 'Vincular WhatsApp | Norte' }] }),
  component: function WhatsappLinkRouteComponent() {
    return <WhatsappLinkPage result={Route.useLoaderData()} />
  },
})

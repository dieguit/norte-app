import { createFileRoute, isRedirect, redirect } from '@tanstack/react-router'
import { claimWhatsappLink } from '@/features/whatsapp/whatsapp-link.functions'
import { WhatsappLinkPage } from './-components/WhatsappLinkPage'

export const Route = createFileRoute('/link/whatsapp')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  loaderDeps: ({ search }) => ({ token: search.token }),
  loader: async ({ deps, location }) => {
    if (!deps.token) return 'invalid' as const
    try {
      return await claimWhatsappLink({ data: { token: deps.token } })
    } catch (error) {
      if (isRedirect(error) && error.options.to === '/sign-in/$') {
        throw redirect({ to: '/sign-in/$', params: { _splat: '' }, search: { redirect_url: location.href } })
      }
      throw error
    }
  },
  head: () => ({ meta: [{ title: 'Vincular WhatsApp | Norte' }] }),
  component: function WhatsappLinkRouteComponent() {
    return <WhatsappLinkPage result={Route.useLoaderData()} />
  },
})

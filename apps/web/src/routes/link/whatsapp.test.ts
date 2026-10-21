import { isRedirect, redirect } from '@tanstack/react-router'
import { expect, it, vi } from 'vitest'
import { claimWhatsappLink } from '@/features/whatsapp/whatsapp-link.functions'
import { Route } from './whatsapp'

vi.mock('@/features/whatsapp/whatsapp-link.functions', () => ({ claimWhatsappLink: vi.fn() }))

it('sends signed-out users back to the link after sign-in', async () => {
  vi.mocked(claimWhatsappLink).mockRejectedValue(redirect({ to: '/sign-in/$', params: { _splat: '' } }))
  const loader = Route.options.loader as (ctx: unknown) => Promise<unknown>

  const error = await loader({ deps: { token: 'tok' }, location: { href: '/link/whatsapp?token=tok' } }).catch(
    (e: unknown) => e,
  )

  expect(isRedirect(error)).toBe(true)
  expect((error as { options: { search: unknown } }).options.search).toEqual({
    redirect_url: '/link/whatsapp?token=tok',
  })
})

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { claimWhatsappLinkServer } from './whatsapp-link.server'

export type WhatsappLinkResult = 'linked' | 'invalid' | 'expired' | 'conflict'

export const claimWhatsappLink = createServerFn({ method: 'POST' })
  .validator((input: unknown) => z.object({ token: z.string().min(1) }).parse(input))
  .handler(({ data }) => claimWhatsappLinkServer(data.token))

import '@tanstack/react-start/server-only'
import { callFinancialApi } from '../financial/financial.server'
import type { WhatsappLinkResult } from './whatsapp-link.functions'

export type { WhatsappLinkResult }

export async function claimWhatsappLinkServer(token: string): Promise<WhatsappLinkResult> {
  const response = await callFinancialApi(`/whatsapp/links/${encodeURIComponent(token)}/claim`, { method: 'POST' })
  if (response.ok) return 'linked'
  if (response.status === 400 || response.status === 404) return 'invalid'
  if (response.status === 410) return 'expired'
  if (response.status === 409) return 'conflict'
  throw new Error('No se pudo vincular WhatsApp.')
}

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { callFinancialApi } from '../financial/financial.server'
import { claimWhatsappLinkServer } from './whatsapp-link.server'

vi.mock('../financial/financial.server', () => ({ callFinancialApi: vi.fn() }))

const token = 'a'.repeat(43)

describe('claimWhatsappLinkServer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    [200, 'linked'],
    [400, 'invalid'],
    [404, 'invalid'],
    [410, 'expired'],
    [409, 'conflict'],
  ] as const)('maps API %i to %s', async (status, expected) => {
    vi.mocked(callFinancialApi).mockResolvedValue(new Response('{}', { status }))
    await expect(claimWhatsappLinkServer(token)).resolves.toBe(expected)
    expect(callFinancialApi).toHaveBeenCalledWith(`/whatsapp/links/${token}/claim`, { method: 'POST' })
  })

  it('throws on unexpected API failures', async () => {
    vi.mocked(callFinancialApi).mockResolvedValue(new Response('{}', { status: 500 }))
    await expect(claimWhatsappLinkServer(token)).rejects.toThrow()
  })
})

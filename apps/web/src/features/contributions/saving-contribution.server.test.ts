import { beforeEach, describe, expect, it, vi } from 'vitest'
import { callFinancialApi } from '../financial/financial.server'
import {
  confirmSavingContributionServer,
  deleteSavingContributionServer,
  getSavingContributionContextServer,
  previewSavingContributionEditServer,
  previewSavingContributionServer,
  updateSavingContributionServer,
} from './saving-contribution.server'

vi.mock('@tanstack/react-start/server-only', () => ({}))
vi.mock('../financial/financial.server', () => ({
  callFinancialApi: vi.fn(),
  throwFinancialApiError: vi.fn(async (response: Response, fallback: string) => {
    const message = (await response.json().catch(() => null))?.message
    throw new Error(Array.isArray(message) ? message[0] : typeof message === 'string' ? message : fallback)
  }),
}))

const token = 'a'.repeat(64)
const draft = { currency: 'ARS' as const, amount: '300.00', place: { kind: 'existing' as const, placeId: '4b3d1c1e-1111-4111-8111-111111111111' } }
const contributionId = '5c1d1c1e-1111-4111-8111-111111111111'
const previewBody = {
  preview: {
    draft: { currency: 'ARS', amount: { amount: '300.00', currency: 'ARS' }, place: draft.place },
    allocations: [{ goalId: 'g1', goalName: 'Notebook', percentage: '100.00', amount: { amount: '300.00', currency: 'ARS' } }],
  },
  previewToken: token,
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('saving contribution web proxies', () => {
  beforeEach(() => {
    vi.mocked(callFinancialApi).mockReset()
  })

  it('loads the context from the API and parses the missing and present states', async () => {
    vi.mocked(callFinancialApi).mockResolvedValueOnce(json({ profile: 'missing' }))
    await expect(getSavingContributionContextServer()).resolves.toEqual({ profile: 'missing' })
    expect(callFinancialApi).toHaveBeenCalledWith('/contributions/saving/context')
  })

  it('posts the draft to the create preview route and parses the result', async () => {
    vi.mocked(callFinancialApi).mockResolvedValueOnce(json(previewBody))
    await expect(previewSavingContributionServer({ data: draft })).resolves.toMatchObject({ previewToken: token })
    expect(callFinancialApi).toHaveBeenCalledWith('/contributions/saving/preview', expect.objectContaining({ method: 'POST', body: JSON.stringify(draft) }))
  })

  it('posts edit previews to the contribution route and returns an empty token', async () => {
    vi.mocked(callFinancialApi).mockResolvedValueOnce(json({ preview: previewBody.preview }))
    await expect(previewSavingContributionEditServer({ data: { contributionId, draft } })).resolves.toEqual({ preview: previewBody.preview })
    expect(callFinancialApi).toHaveBeenCalledWith(`/contributions/saving/${contributionId}/preview`, expect.objectContaining({ method: 'POST' }))
  })

  it('returns created and stale confirmation unions and surfaces the API domain message on failure', async () => {
    vi.mocked(callFinancialApi).mockResolvedValueOnce(json({ status: 'created', contributionId }))
    await expect(confirmSavingContributionServer({ data: { draft, previewToken: token } })).resolves.toEqual({ status: 'created', contributionId })
    vi.mocked(callFinancialApi).mockResolvedValueOnce(json({ status: 'stale', preview: previewBody }))
    await expect(confirmSavingContributionServer({ data: { draft, previewToken: token } })).resolves.toMatchObject({ status: 'stale', preview: { previewToken: token } })
    vi.mocked(callFinancialApi).mockResolvedValueOnce(json({ message: 'Lugar de ahorro no encontrado.' }, 400))
    await expect(confirmSavingContributionServer({ data: { draft, previewToken: token } })).rejects.toThrow('Lugar de ahorro no encontrado.')
  })

  it('patches and deletes owned contributions by id', async () => {
    vi.mocked(callFinancialApi).mockResolvedValueOnce(json({ status: 'updated' }))
    await expect(updateSavingContributionServer({ data: { contributionId, draft } })).resolves.toEqual({ status: 'updated' })
    expect(callFinancialApi).toHaveBeenLastCalledWith(`/contributions/saving/${contributionId}`, expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ draft }) }))
    vi.mocked(callFinancialApi).mockResolvedValueOnce(json({ status: 'deleted' }))
    await expect(deleteSavingContributionServer({ data: { contributionId } })).resolves.toEqual({ status: 'deleted' })
    expect(callFinancialApi).toHaveBeenLastCalledWith(`/contributions/saving/${contributionId}`, { method: 'DELETE' })
  })
})

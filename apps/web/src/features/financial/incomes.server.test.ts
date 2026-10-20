import { beforeEach, describe, expect, it, vi } from 'vitest'
import { callFinancialApi } from './financial.server'
import {
  createIncomeServer,
  deleteIncomeServer,
  updateIncomeServer,
} from './incomes.server'

vi.mock('./financial.server', () => {
  const callFinancialApi = vi.fn()
  return {
    callFinancialApi,
    mutateFinancialApi: vi.fn(async (path, method, body, failureMessage) => {
      const response = await callFinancialApi(path, {
        method,
        ...(body === undefined
          ? {}
          : {
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            }),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => null)
        throw new Error(error?.message ?? failureMessage)
      }
      return response
    }),
  }
})

const income = {
  id: '00000000-0000-4000-8000-000000000001',
  userId: 'user',
  sourceKind: 'salary',
  sourceId: null,
  concept: null,
  amount: '10.00',
  currency: 'ARS',
  recurring: true,
  effectiveMonth: '2026-10-01',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

describe('income API adapter', () => {
  beforeEach(() => vi.clearAllMocks())

  it('posts the existing draft wrapper and returns the API contract', async () => {
    vi.mocked(callFinancialApi).mockResolvedValue(
      new Response(JSON.stringify(income), { status: 201 }),
    )
    await expect(
      createIncomeServer({ data: { draft: {} as never } }),
    ).resolves.toEqual(income)
    expect(callFinancialApi).toHaveBeenCalledWith(
      '/incomes',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ draft: {} }),
      }),
    )
  })

  it('maps update and delete IDs to REST paths without duplicating path IDs in bodies', async () => {
    vi.mocked(callFinancialApi)
      .mockResolvedValueOnce(
        new Response(JSON.stringify(income), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    const incomeId = income.id
    await updateIncomeServer({ data: { incomeId, draft: {} as never } })
    await deleteIncomeServer({ data: { incomeId } })
    expect(callFinancialApi).toHaveBeenNthCalledWith(
      1,
      `/incomes/${incomeId}`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ draft: {} }),
      }),
    )
    expect(callFinancialApi).toHaveBeenNthCalledWith(
      2,
      `/incomes/${incomeId}`,
      { method: 'DELETE' },
    )
  })
})

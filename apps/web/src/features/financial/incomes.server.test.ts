import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mutateFinancialApi } from './financial.server'
import {
  createIncomeServer,
  deleteIncomeServer,
  updateIncomeServer,
} from './incomes.server'

vi.mock('./financial.server', () => ({
  mutateFinancialApi: vi.fn(),
}))

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
    vi.mocked(mutateFinancialApi).mockResolvedValue(
      new Response(JSON.stringify(income), { status: 201 }),
    )
    await expect(
      createIncomeServer({ data: { draft: {} as never } }),
    ).resolves.toEqual(income)
    expect(mutateFinancialApi).toHaveBeenCalledWith(
      '/incomes',
      'POST',
      { draft: {} },
      'No se pudo guardar el ingreso.',
    )
  })

  it('maps update and delete IDs to REST paths without duplicating path IDs in bodies', async () => {
    vi.mocked(mutateFinancialApi)
      .mockResolvedValueOnce(
        new Response(JSON.stringify(income), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    const incomeId = income.id
    await updateIncomeServer({ data: { incomeId, draft: {} as never } })
    await deleteIncomeServer({ data: { incomeId } })
    expect(mutateFinancialApi).toHaveBeenNthCalledWith(
      1,
      `/incomes/${incomeId}`,
      'PATCH',
      { draft: {} },
      'No se pudo guardar el ingreso.',
    )
    expect(mutateFinancialApi).toHaveBeenNthCalledWith(
      2,
      `/incomes/${incomeId}`,
      'DELETE',
      undefined,
      'No se pudo guardar el ingreso.',
    )
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { auth } from '@clerk/tanstack-react-start/server'
import {
  completeFinancialOnboarding,
  createExpense,
  deleteExpense,
  getFinancesWorkspace,
  updateExpense,
} from './financial.functions'
import { getFinancesWorkspaceServer } from './financial.server'

vi.mock('@tanstack/react-start', () => ({
  createServerFn: vi.fn().mockImplementation(() => {
    let validatorFn: ((input: unknown) => unknown) | null = null
    const fnObj = {
      validator: vi.fn().mockImplementation((val) => {
        validatorFn = val
        return fnObj
      }),
      handler: vi.fn().mockImplementation((handlerFn) => {
        return vi.fn(async (arg?: { data?: unknown }) => {
          const validatedData = validatorFn && arg?.data !== undefined ? validatorFn(arg.data) : arg?.data
          return handlerFn({ data: validatedData })
        })
      }),
    }
    return fnObj
  }),
}))

vi.mock('@clerk/tanstack-react-start/server', () => ({
  auth: vi.fn(),
}))

describe('financial.server boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })


  describe('getFinancesWorkspaceServer', () => {
    it('returns null when profile does not exist for the authenticated user', async () => {
      vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_1', getToken: vi.fn().mockResolvedValue('token') } as never)
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('null')))

      const result = await getFinancesWorkspaceServer()
      expect(result).toBeNull()
      expect(fetch).toHaveBeenCalledWith('http://localhost:3001/finances', expect.objectContaining({ cache: 'no-store' }))
    })

    it('proxies the selected month and parses server-owned summaries', async () => {
      vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_1', getToken: vi.fn().mockResolvedValue('token') } as never)
      const payload = {
        goalDedicationPercentage: '85.00', month: '2026-08',
        summary: { income: { amount: '800000.00', currency: 'ARS' }, expenses: { amount: '200000.00', currency: 'ARS' }, balance: { amount: '600000.00', currency: 'ARS' }, contribution: { amount: '510000.00', currency: 'ARS' } },
        incomes: { sources: [{ id: '11111111-1111-4111-8111-111111111111', name: 'Sueldo Principal', normalizedName: 'sueldo principal' }], incomes: [{ id: '22222222-2222-4222-8222-222222222222', sourceKind: 'custom', sourceId: '11111111-1111-4111-8111-111111111111', sourceName: 'Sueldo Principal', concept: 'Sueldo Principal', amount: '800000.00', currency: 'ARS', recurring: true, effectiveMonth: '2026-01-01', arsEquivalent: null }] },
        expenses: { sources: [], expenses: [{ id: '33333333-3333-4333-8333-333333333333', sourceKind: 'housing', sourceId: null, sourceName: 'housing', concept: 'Alquiler', amount: '200000.00', currency: 'ARS', recurring: true, effectiveMonth: '2026-01-01', endMonth: null, arsEquivalent: null }] },
        savings: { places: [], movements: [] },
      }
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(payload))))
      const result = await getFinancesWorkspaceServer('2026-08')
      expect(result).toMatchObject({ month: '2026-08', summary: payload.summary, incomes: payload.incomes })
      expect(fetch).toHaveBeenCalledWith('http://localhost:3001/finances?month=2026-08', expect.objectContaining({ cache: 'no-store' }))
    })
  })

  describe('expense server functions', () => {
    it('redirects getFinancesWorkspace when unauthenticated', async () => {
      vi.mocked(auth).mockResolvedValue({ isAuthenticated: false, userId: null } as never)

      await expect(getFinancesWorkspace()).rejects.toMatchObject({
        options: expect.objectContaining({ to: '/sign-in/$' }),
      })
    })

    it('rejects createExpense when unauthenticated', async () => {
      vi.mocked(auth).mockResolvedValue({ isAuthenticated: false, userId: null } as never)

      await expect(
        createExpense({
          data: {
            draft: { source: { kind: 'housing' }, concept: 'Alquiler', amount: '100000', currency: 'ARS', recurring: true },
            effectiveMonth: '2026-08',
          },
        }),
      ).rejects.toMatchObject({
        options: expect.objectContaining({ to: '/sign-in/$' }),
      })
    })

    it('validates schema on createExpense input', async () => {
      vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_1' } as never)

      await expect(
        createExpense({
          data: {
            draft: { source: { kind: 'housing' }, concept: 'Alquiler', amount: '-500', currency: 'ARS', recurring: true },
            effectiveMonth: '2026-08',
          },
        }),
      ).rejects.toThrow()
    })

    it('validates schema on updateExpense input', async () => {
      vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_1' } as never)

      await expect(
        updateExpense({
          data: {
            expenseId: 'not-a-uuid',
            draft: { source: { kind: 'housing' }, concept: 'Alquiler', amount: '100000', currency: 'ARS', recurring: true },
            effectiveMonth: '2026-08',
          },
        }),
      ).rejects.toThrow()
    })

    it('validates schema on deleteExpense input', async () => {
      vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_1' } as never)

      await expect(
        deleteExpense({
          data: {
            expenseId: 'not-a-uuid',
            effectiveMonth: '2026-08',
          },
        }),
      ).rejects.toThrow()
    })
  })

  describe('completeFinancialOnboarding', () => {
    const validGoal = {
      type: 'emergency_fund' as const,
      name: 'Fondo de emergencia',
      targetAmount: '0',
      currency: 'USD' as const,
      desiredMonth: '',
      priority: 'high' as const,
      strategy: 'save' as const,
      annualReturnRate: '0',
      availability: 'available_now' as const,
      availableFromMonth: '',
      allocations: [],
    }

    const validIncomes = [
      {
        source: { kind: 'salary' as const },
        concept: 'Sueldo principal',
        amount: '500000.00',
        currency: 'ARS' as const,
        recurring: true,
        effectiveMonth: '2026-08',
      },
    ]

    const validExpenses = [
      {
        source: { kind: 'housing' as const },
        concept: 'Alquiler',
        amount: '250000.00',
        currency: 'ARS' as const,
        recurring: true,
      },
    ]

    it('rejects when unauthenticated', async () => {
      vi.mocked(auth).mockResolvedValue({ isAuthenticated: false, userId: null } as never)

      await expect(
        completeFinancialOnboarding({
          data: {
            goal: validGoal,
            incomes: validIncomes,
            expenses: validExpenses,
          },
        }),
      ).rejects.toMatchObject({
        options: expect.objectContaining({ to: '/sign-in/$' }),
      })
    })

    it('rejects when incomes array is empty', async () => {
      vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_1' } as never)

      await expect(
        completeFinancialOnboarding({
          data: {
            goal: validGoal,
            incomes: [],
            expenses: validExpenses,
          },
        }),
      ).rejects.toThrow('Agregá al menos un ingreso recurrente.')
    })

    it('rejects when expenses array is empty', async () => {
      vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_1' } as never)

      await expect(
        completeFinancialOnboarding({
          data: {
            goal: validGoal,
            incomes: validIncomes,
            expenses: [],
          },
        }),
      ).rejects.toThrow('Agregá al menos un gasto recurrente.')
    })

    it('rejects when income is not recurring', async () => {
      vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_1' } as never)

      await expect(
        completeFinancialOnboarding({
          data: {
            goal: validGoal,
            incomes: [{ ...validIncomes[0], recurring: false }],
            expenses: validExpenses,
          },
        }),
      ).rejects.toThrow('Los ingresos deben ser recurrentes.')
    })

    it('rejects when expense is not recurring', async () => {
      vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_1' } as never)

      await expect(
        completeFinancialOnboarding({
          data: {
            goal: validGoal,
            incomes: validIncomes,
            expenses: [{ ...validExpenses[0], recurring: false }],
          },
        }),
      ).rejects.toThrow('Los gastos deben ser recurrentes.')
    })
  })
})

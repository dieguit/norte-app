import { beforeEach, describe, expect, it, vi } from 'vitest'
import { auth } from '@clerk/tanstack-react-start/server'
import { db } from '../../db/client'
import {
  completeFinancialOnboarding,
  createExpense,
  deleteExpense,
  getFinancesWorkspace,
  updateExpense,
} from './financial.functions'
import { getFinancesWorkspaceServer } from './financial.server'
import { getInitialHomeState } from './repository.server'

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

vi.mock('../../db/client', () => ({
  db: {
    query: {
      financialProfiles: {
        findFirst: vi.fn(),
      },
      financialGoals: {
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
      allocationPlanSnapshots: {
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
      allocationPlanEntries: {
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
      savingContributions: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      investmentContributions: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      incomes: {
        findMany: vi.fn().mockResolvedValue([
          { amount: '500000.00', currency: 'ARS', recurring: true, effectiveMonth: '2026-01-01' },
        ]),
      },
      incomeSources: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn(),
      },
      expenses: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn(),
      },
      expenseSources: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn(),
      },
      savingsPlaces: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      savingsPlaceTransfers: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    },
  },
}))

describe('financial.server boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getInitialHomeState', () => {
    it('returns null when profile does not exist', async () => {
      vi.mocked(db.query.financialProfiles.findFirst).mockResolvedValue(undefined as never)

      const state = await getInitialHomeState('user_1')
      expect(state).toBeNull()
    })

    it('derives the USD emergency target and completion from the canonical Plan', async () => {
      vi.mocked(db.query.expenses.findMany).mockResolvedValue([
        { amount: '250000.00', currency: 'ARS', recurring: true, effectiveMonth: '2026-01-01', endMonth: null },
      ] as never)
      vi.mocked(db.query.financialProfiles.findFirst).mockResolvedValue({
        userId: 'user_1',
        baseCurrency: 'ARS',
        expensesKnowledge: 'known',
        plannedMonthlyContribution: '50000.00',
      } as never)
      vi.mocked(db.query.financialGoals.findFirst).mockResolvedValue({
        id: 'goal_1',
        userId: 'user_1',
        name: 'Colchón financiero',
        type: 'emergency_fund',
        targetAmount: null,
        currency: 'USD',
        emergencyFundMonths: 6,
        strategy: 'save',
      } as never)
      vi.mocked(db.query.allocationPlanSnapshots.findFirst).mockResolvedValue({
        id: 'snapshot_1',
        userId: 'user_1',
        effectiveMonth: '2026-09-01',
      } as never)
      vi.mocked(db.query.allocationPlanEntries.findFirst).mockResolvedValue({
        snapshotId: 'snapshot_1',
        goalId: 'goal_1',
        percentage: '100.00',
      } as never)

      await expect(getInitialHomeState('user_1')).resolves.toEqual({
        income: { amount: '500000.00', currency: 'ARS' },
        expensesKnowledge: 'known',
        expenses: { amount: '250000.00', currency: 'ARS' },
        plan: {
          fundingMethod: 'save',
          destinationCurrency: 'USD',
          monthlyCommitment: { amount: '50000.00', currency: 'ARS' },
          destinationAmount: { amount: '33.33', currency: 'USD' },
          effectiveMonth: '2026-09',
          allocationPercentage: '100.00',
        },
        goal: {
          type: 'emergency_fund',
          name: 'Colchón financiero',
          targetAmount: { amount: '1000.00', currency: 'USD' },
          currentAmount: { amount: '0.00', currency: 'USD' },
          emergencyFundMonths: 6,
        },
        projection: { status: 'available', completionMonth: '2029-03' },
        previousMonthShortfalls: [],
      })
    })

    it('returns unknown_expenses projection state when expenses are unknown for emergency fund', async () => {
      vi.mocked(db.query.financialProfiles.findFirst).mockResolvedValue({
        userId: 'user_1',
        baseCurrency: 'ARS',
        expensesKnowledge: 'unknown',
        plannedMonthlyContribution: '50000.00',
      } as never)
      vi.mocked(db.query.financialGoals.findFirst).mockResolvedValue({
        id: 'goal_1',
        userId: 'user_1',
        name: 'Colchón financiero',
        type: 'emergency_fund',
        targetAmount: null,
        currency: 'USD',
        emergencyFundMonths: 6,
        strategy: 'save',
      } as never)
      vi.mocked(db.query.allocationPlanSnapshots.findFirst).mockResolvedValue({
        id: 'snapshot_1',
        userId: 'user_1',
        effectiveMonth: '2026-09-01',
      } as never)
      vi.mocked(db.query.allocationPlanEntries.findFirst).mockResolvedValue({
        snapshotId: 'snapshot_1',
        goalId: 'goal_1',
        percentage: '100.00',
      } as never)

      await expect(getInitialHomeState('user_1')).resolves.toEqual({
        income: { amount: '500000.00', currency: 'ARS' },
        expensesKnowledge: 'unknown',
        expenses: undefined,
        plan: {
          fundingMethod: 'save',
          destinationCurrency: 'USD',
          monthlyCommitment: { amount: '50000.00', currency: 'ARS' },
          destinationAmount: { amount: '33.33', currency: 'USD' },
          effectiveMonth: '2026-09',
          allocationPercentage: '100.00',
        },
        goal: {
          type: 'emergency_fund',
          name: 'Colchón financiero',
          targetAmount: undefined,
          currentAmount: { amount: '0.00', currency: 'USD' },
          emergencyFundMonths: 6,
        },
        projection: { status: 'unknown_expenses' },
        previousMonthShortfalls: [],
      })
    })

    it('returns available projection state for non-emergency goal even when expenses are unknown', async () => {
      vi.mocked(db.query.financialProfiles.findFirst).mockResolvedValue({
        userId: 'user_1',
        baseCurrency: 'ARS',
        expensesKnowledge: 'unknown',
        plannedMonthlyContribution: '50000.00',
      } as never)
      vi.mocked(db.query.financialGoals.findFirst).mockResolvedValue({
        id: 'goal_1',
        userId: 'user_1',
        name: 'Ahorro fijo',
        type: 'fixed_savings',
        targetAmount: '1000000.00',
        currency: 'ARS',
        emergencyFundMonths: null,
        strategy: 'save',
      } as never)
      vi.mocked(db.query.allocationPlanSnapshots.findFirst).mockResolvedValue({
        id: 'snapshot_1',
        userId: 'user_1',
        effectiveMonth: '2026-09-01',
      } as never)
      vi.mocked(db.query.allocationPlanEntries.findFirst).mockResolvedValue({
        snapshotId: 'snapshot_1',
        goalId: 'goal_1',
        percentage: '100.00',
      } as never)

      await expect(getInitialHomeState('user_1')).resolves.toEqual({
        income: { amount: '500000.00', currency: 'ARS' },
        expensesKnowledge: 'unknown',
        expenses: undefined,
        plan: {
          fundingMethod: 'save',
          destinationCurrency: 'ARS',
          monthlyCommitment: { amount: '50000.00', currency: 'ARS' },
          destinationAmount: { amount: '50000.00', currency: 'ARS' },
          effectiveMonth: '2026-09',
          allocationPercentage: '100.00',
        },
        goal: {
          type: 'fixed_savings',
          name: 'Ahorro fijo',
          targetAmount: { amount: '1000000.00', currency: 'ARS' },
          currentAmount: { amount: '0.00', currency: 'ARS' },
          emergencyFundMonths: undefined,
        },
        projection: { status: 'available', completionMonth: '2028-04' },
        previousMonthShortfalls: [],
      })
    })

    it('returns outside_horizon projection when monthly commitment is zero', async () => {
      vi.mocked(db.query.financialProfiles.findFirst).mockResolvedValue({
        userId: 'user_1',
        baseCurrency: 'ARS',
        expensesKnowledge: 'unknown',
        plannedMonthlyContribution: '0.00',
      } as never)
      vi.mocked(db.query.financialGoals.findFirst).mockResolvedValue({
        id: 'goal_1',
        userId: 'user_1',
        name: 'Ahorro fijo',
        type: 'fixed_savings',
        targetAmount: '1000000.00',
        currency: 'ARS',
        emergencyFundMonths: null,
        strategy: 'save',
      } as never)
      vi.mocked(db.query.allocationPlanSnapshots.findFirst).mockResolvedValue({
        id: 'snapshot_1',
        userId: 'user_1',
        effectiveMonth: '2026-09-01',
      } as never)
      vi.mocked(db.query.allocationPlanEntries.findFirst).mockResolvedValue({
        snapshotId: 'snapshot_1',
        goalId: 'goal_1',
        percentage: '100.00',
      } as never)

      await expect(getInitialHomeState('user_1')).resolves.toEqual({
        income: { amount: '500000.00', currency: 'ARS' },
        expensesKnowledge: 'unknown',
        expenses: undefined,
        plan: {
          fundingMethod: 'save',
          destinationCurrency: 'ARS',
          monthlyCommitment: { amount: '0.00', currency: 'ARS' },
          destinationAmount: { amount: '0.00', currency: 'ARS' },
          effectiveMonth: '2026-09',
          allocationPercentage: '100.00',
        },
        goal: {
          type: 'fixed_savings',
          name: 'Ahorro fijo',
          targetAmount: { amount: '1000000.00', currency: 'ARS' },
          currentAmount: { amount: '0.00', currency: 'ARS' },
          emergencyFundMonths: undefined,
        },
        projection: { status: 'outside_horizon' },
        previousMonthShortfalls: [],
      })
    })
  })

  describe('getFinancesWorkspaceServer', () => {
    it('returns null when profile does not exist for the authenticated user', async () => {
      vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_1' } as never)
      vi.mocked(db.query.financialProfiles.findFirst).mockResolvedValue(undefined as never)

      const result = await getFinancesWorkspaceServer()
      expect(result).toBeNull()
    })

    it('returns income and expense workspaces for the same authenticated user', async () => {
      vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_1' } as never)
      vi.mocked(db.query.financialProfiles.findFirst).mockResolvedValue({
        userId: 'user_1',
        goalDedicationPercentage: '85.00',
      } as never)
      vi.mocked(db.query.incomeSources.findMany).mockResolvedValue([
        { id: 'inc_src_1', userId: 'user_1', name: 'Sueldo Principal', normalizedName: 'sueldo principal' },
      ] as never)
      vi.mocked(db.query.incomes.findMany).mockResolvedValue([
        {
          id: 'inc_1',
          userId: 'user_1',
          sourceKind: 'custom',
          sourceId: 'inc_src_1',
          amount: '800000.00',
          currency: 'ARS',
          recurring: true,
          effectiveMonth: '2026-01-01',
        },
      ] as never)
      vi.mocked(db.query.expenseSources.findMany).mockResolvedValue([
        { id: 'exp_src_1', userId: 'user_1', name: 'Gimnasio', normalizedName: 'gimnasio' },
      ] as never)
      vi.mocked(db.query.expenses.findMany).mockResolvedValue([
        {
          id: 'exp_1',
          userId: 'user_1',
          sourceKind: 'housing',
          sourceId: null,
          amount: '200000.00',
          currency: 'ARS',
          recurring: true,
          effectiveMonth: '2026-01-01',
          endMonth: null,
        },
      ] as never)

      const result = await getFinancesWorkspaceServer()
      expect(result).toEqual({
        goalDedicationPercentage: '85.00',
        incomes: {
          sources: [
            { id: 'inc_src_1', userId: 'user_1', name: 'Sueldo Principal', normalizedName: 'sueldo principal' },
          ],
          incomes: [
            {
              id: 'inc_1',
              sourceKind: 'custom',
              sourceId: 'inc_src_1',
              sourceName: 'Sueldo Principal',
              amount: '800000.00',
              currency: 'ARS',
              recurring: true,
              effectiveMonth: '2026-01-01',
            },
          ],
        },
        expenses: {
          sources: [
            { id: 'exp_src_1', userId: 'user_1', name: 'Gimnasio', normalizedName: 'gimnasio' },
          ],
          expenses: [
            {
              id: 'exp_1',
              sourceKind: 'housing',
              sourceId: null,
              sourceName: 'housing',
              amount: '200000.00',
              currency: 'ARS',
              recurring: true,
              effectiveMonth: '2026-01-01',
              endMonth: null,
            },
          ],
        },
        savings: { places: [], movements: [] },
      })
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
            draft: { source: { kind: 'housing' }, amount: '100000', currency: 'ARS', recurring: true },
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
            draft: { source: { kind: 'housing' }, amount: '-500', currency: 'ARS', recurring: true },
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
            draft: { source: { kind: 'housing' }, amount: '100000', currency: 'ARS', recurring: true },
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
        amount: '500000.00',
        currency: 'ARS' as const,
        recurring: true,
        effectiveMonth: '2026-08',
      },
    ]

    const validExpenses = [
      {
        source: { kind: 'housing' as const },
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

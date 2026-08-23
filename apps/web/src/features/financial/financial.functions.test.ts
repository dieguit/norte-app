import { beforeEach, describe, expect, it, vi } from 'vitest'
import { auth } from '@clerk/tanstack-react-start/server'
import { db } from '../../db/client'
import {
  allocationPlanEntries,
  allocationPlanSnapshots,
  financialGoals,
  financialProfiles,
} from '../../db/schema'
import {
  completeInitialPlan,
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

const mockCommittedState = {
  profiles: [] as unknown[],
  goals: [] as unknown[],
  snapshots: [] as unknown[],
  allocations: [] as unknown[],
}

let stagedState = {
  profiles: [] as unknown[],
  goals: [] as unknown[],
  snapshots: [] as unknown[],
  allocations: [] as unknown[],
}

const mockProfileReturning = vi.fn().mockImplementation(async () => [{ userId: 'user_1' }])
const mockProfileValues = vi.fn().mockImplementation((val) => {
  return {
    onConflictDoNothing: vi.fn().mockReturnValue({
      returning: vi.fn().mockImplementation(async () => {
        const ret = await mockProfileReturning()
        if (ret.length > 0) stagedState.profiles.push(val)
        return ret
      }),
    }),
  }
})
const mockGoalReturning = vi.fn().mockImplementation(async () => [{ id: 'goal_1' }])
const mockGoalValues = vi.fn().mockImplementation((val) => {
  return {
    returning: vi.fn().mockImplementation(async () => {
      stagedState.goals.push(val)
      return mockGoalReturning()
    }),
  }
})
const mockSnapshotReturning = vi.fn().mockImplementation(async () => [{ id: 'snapshot_1' }])
const mockSnapshotValues = vi.fn().mockImplementation((val) => {
  return {
    returning: vi.fn().mockImplementation(async () => {
      stagedState.snapshots.push(val)
      return mockSnapshotReturning()
    }),
  }
})
const mockAllocationValues = vi.fn().mockImplementation(async (val) => {
  stagedState.allocations.push(val)
  return undefined
})

const mockTx = {
  insert: vi.fn((table) => {
    if (table === financialProfiles) return { values: mockProfileValues }
    if (table === financialGoals) return { values: mockGoalValues }
    if (table === allocationPlanSnapshots) return { values: mockSnapshotValues }
    if (table === allocationPlanEntries) return { values: mockAllocationValues }
    throw new Error('Unexpected table')
  }),
}

vi.mock('../../db/client', () => ({
  db: {
    transaction: vi.fn().mockImplementation(async (callback) => {
      stagedState = { profiles: [], goals: [], snapshots: [], allocations: [] }
      try {
        const result = await callback(mockTx)
        mockCommittedState.profiles.push(...stagedState.profiles)
        mockCommittedState.goals.push(...stagedState.goals)
        mockCommittedState.snapshots.push(...stagedState.snapshots)
        mockCommittedState.allocations.push(...stagedState.allocations)
        return result
      } catch (err) {
        stagedState = { profiles: [], goals: [], snapshots: [], allocations: [] }
        throw err
      }
    }),
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
    },
  },
}))

describe('financial.server boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCommittedState.profiles = []
    mockCommittedState.goals = []
    mockCommittedState.snapshots = []
    mockCommittedState.allocations = []
    stagedState = { profiles: [], goals: [], snapshots: [], allocations: [] }
    mockProfileReturning.mockResolvedValue([{ userId: 'user_1' }])
    mockGoalReturning.mockResolvedValue([{ id: 'goal_1' }])
    mockSnapshotReturning.mockResolvedValue([{ id: 'snapshot_1' }])
    mockAllocationValues.mockImplementation(async (val) => {
      stagedState.allocations.push(val)
      return undefined
    })
  })

  const validInitialPlan = {
    goalKind: 'emergency_fund',
    income: '500.000',
    expensesKnowledge: 'known',
    expenses: '250.000',
    plannedContribution: '50.000',
    fixedTarget: '',
  }

  describe('completeInitialPlan', () => {
    it('redirects when user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue({ isAuthenticated: false, userId: null } as never)

      await expect(completeInitialPlan({ data: validInitialPlan })).rejects.toMatchObject({
        options: expect.objectContaining({ to: '/sign-in/$' }),
      })
    })

    it('creates the complete emergency-fund Plan in one transaction', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
      vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_1' } as never)

      await expect(completeInitialPlan({ data: validInitialPlan })).resolves.toEqual({ created: true })

      expect(db.transaction).toHaveBeenCalledOnce()
      expect(mockTx.insert).toHaveBeenCalledTimes(4)
      expect(mockProfileValues).toHaveBeenCalledWith({
        userId: 'user_1',
        baseCurrency: 'ARS',
        approximateMonthlyIncome: '500000.00',
        approximateMonthlyExpenses: '250000.00',
        expensesKnowledge: 'known',
        plannedMonthlyContribution: '50000.00',
        onboardingCompleted: true,
      })
      expect(mockGoalValues).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_1',
          name: 'Colchón financiero',
          type: 'emergency_fund',
          targetAmount: null,
          currency: 'USD',
          emergencyFundMonths: 6,
          strategy: 'save',
        }),
      )
      expect(mockSnapshotValues).toHaveBeenCalledWith({
        userId: 'user_1',
        effectiveMonth: '2026-09-01',
        plannedMonthlyContribution: '50000.00',
      })
      expect(mockAllocationValues).toHaveBeenCalledWith({
        snapshotId: 'snapshot_1',
        goalId: 'goal_1',
        percentage: '100.00',
      })

      expect(mockCommittedState.profiles).toHaveLength(1)
      expect(mockCommittedState.goals).toHaveLength(1)
      expect(mockCommittedState.snapshots).toHaveLength(1)
      expect(mockCommittedState.allocations).toHaveLength(1)

      vi.useRealTimers()
    })

    it('returns the existing completion without creating duplicate Plan records', async () => {
      vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_1' } as never)
      mockProfileReturning.mockResolvedValueOnce([])

      await expect(completeInitialPlan({ data: validInitialPlan })).resolves.toEqual({ created: false })

      expect(mockTx.insert).toHaveBeenCalledTimes(1)
      expect(mockGoalValues).not.toHaveBeenCalled()
      expect(mockSnapshotValues).not.toHaveBeenCalled()
      expect(mockCommittedState.profiles).toHaveLength(0)
    })

    it('rolls back all records and leaves no partial state persisted when any Plan write fails', async () => {
      vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_1' } as never)
      mockAllocationValues.mockRejectedValueOnce(new Error('database unavailable'))

      await expect(completeInitialPlan({ data: validInitialPlan })).rejects.toThrow('database unavailable')
      expect(db.transaction).toHaveBeenCalledOnce()
      expect(mockCommittedState.profiles).toHaveLength(0)
      expect(mockCommittedState.goals).toHaveLength(0)
      expect(mockCommittedState.snapshots).toHaveLength(0)
      expect(mockCommittedState.allocations).toHaveLength(0)
    })
  })

  describe('getInitialHomeState', () => {
    it('returns null when profile does not exist', async () => {
      vi.mocked(db.query.financialProfiles.findFirst).mockResolvedValue(undefined as never)

      const state = await getInitialHomeState('user_1')
      expect(state).toBeNull()
    })

    it('derives the USD emergency target and completion from the canonical Plan', async () => {
      vi.mocked(db.query.financialProfiles.findFirst).mockResolvedValue({
        userId: 'user_1',
        baseCurrency: 'ARS',
        approximateMonthlyIncome: '500000.00',
        approximateMonthlyExpenses: '250000.00',
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
        approximateMonthlyIncome: '500000.00',
        approximateMonthlyExpenses: null,
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
        approximateMonthlyIncome: '500000.00',
        approximateMonthlyExpenses: null,
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
        approximateMonthlyIncome: '500000.00',
        approximateMonthlyExpenses: null,
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
})

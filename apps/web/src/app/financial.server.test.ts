import { beforeEach, describe, expect, it, vi } from 'vitest'
import { auth } from '@clerk/tanstack-react-start/server'
import { db } from '../db/client'
import { financialProfiles } from '../db/schema'
import { completeInitialPlan, getInitialHomeState } from './financial.server'

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

const mockProfileOnConflict = vi.fn().mockResolvedValue(undefined)
const mockProfileValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockProfileOnConflict })

const mockGoalReturning = vi.fn().mockResolvedValue([{ id: 'goal_1', name: 'Colchón financiero' }])
const mockGoalValues = vi.fn().mockReturnValue({ returning: mockGoalReturning })

const mockTx = {
  insert: vi.fn().mockImplementation((table) => {
    if (table === financialProfiles) {
      return { values: mockProfileValues }
    }
    return { values: mockGoalValues }
  }),
}

vi.mock('../db/client', () => ({
  db: {
    transaction: vi.fn().mockImplementation(async (callback) => callback(mockTx)),
    query: {
      financialProfiles: {
        findFirst: vi.fn(),
      },
      financialGoals: {
        findFirst: vi.fn(),
      },
    },
  },
}))

describe('financial.server boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProfileValues.mockReturnValue({ onConflictDoUpdate: mockProfileOnConflict })
    mockGoalReturning.mockResolvedValue([{ id: 'goal_1', name: 'Colchón financiero' }])
    mockGoalValues.mockReturnValue({ returning: mockGoalReturning })
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

    it('derives the Clerk user and inserts the profile and goal in one transaction', async () => {
      vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_1' } as never)

      const result = await completeInitialPlan({ data: validInitialPlan })

      expect(db.transaction).toHaveBeenCalledOnce()
      expect(mockTx.insert).toHaveBeenCalledTimes(2)
      expect(mockProfileValues).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_1',
          approximateMonthlyIncome: '500000.00',
          approximateMonthlyExpenses: '250000.00',
          expensesKnowledge: 'known',
          plannedMonthlyContribution: '50000.00',
          onboardingCompleted: true,
        }),
      )
      expect(mockGoalValues).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_1',
          name: 'Colchón financiero',
          type: 'emergency_fund',
          targetAmount: '1500000.00',
          emergencyFundMonths: 6,
        }),
      )
      expect(result).toEqual({ goal: { id: 'goal_1', name: 'Colchón financiero' } })
    })

    it('does not return a partial success when the goal write fails', async () => {
      vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_1' } as never)
      mockGoalReturning.mockRejectedValueOnce(new Error('database unavailable'))

      await expect(completeInitialPlan({ data: validInitialPlan })).rejects.toThrow('database unavailable')
    })
  })

  describe('getInitialHomeState', () => {
    it('returns null when profile does not exist', async () => {
      vi.mocked(db.query.financialProfiles.findFirst).mockResolvedValue(undefined as never)

      const state = await getInitialHomeState('user_1')
      expect(state).toBeNull()
    })

    it('returns available projection state for known expenses emergency fund', async () => {
      vi.mocked(db.query.financialProfiles.findFirst).mockResolvedValue({
        userId: 'user_1',
        approximateMonthlyIncome: '500000.00',
        approximateMonthlyExpenses: '250000.00',
        expensesKnowledge: 'known',
        plannedMonthlyContribution: '50000.00',
      } as never)
      vi.mocked(db.query.financialGoals.findFirst).mockResolvedValue({
        id: 'g1',
        userId: 'user_1',
        name: 'Colchón financiero',
        type: 'emergency_fund',
        targetAmount: '1500000.00',
        currency: 'ARS',
        emergencyFundMonths: 6,
      } as never)

      const state = await getInitialHomeState('user_1')
      expect(state).toEqual({
        income: { amount: '500000.00', currency: 'ARS' },
        expensesKnowledge: 'known',
        expenses: { amount: '250000.00', currency: 'ARS' },
        plannedContribution: { amount: '50000.00', currency: 'ARS' },
        goal: {
          type: 'emergency_fund',
          name: 'Colchón financiero',
          targetAmount: { amount: '1500000.00', currency: 'ARS' },
          emergencyFundMonths: 6,
        },
        projectionState: 'available',
      })
    })

    it('returns unknown_expenses projection state when expenses are unknown for emergency fund', async () => {
      vi.mocked(db.query.financialProfiles.findFirst).mockResolvedValue({
        userId: 'user_1',
        approximateMonthlyIncome: '500000.00',
        approximateMonthlyExpenses: null,
        expensesKnowledge: 'unknown',
        plannedMonthlyContribution: '50000.00',
      } as never)
      vi.mocked(db.query.financialGoals.findFirst).mockResolvedValue({
        id: 'g1',
        userId: 'user_1',
        name: 'Colchón financiero',
        type: 'emergency_fund',
        targetAmount: null,
        currency: 'ARS',
        emergencyFundMonths: 6,
      } as never)

      const state = await getInitialHomeState('user_1')
      expect(state).toEqual({
        income: { amount: '500000.00', currency: 'ARS' },
        expensesKnowledge: 'unknown',
        expenses: undefined,
        plannedContribution: { amount: '50000.00', currency: 'ARS' },
        goal: {
          type: 'emergency_fund',
          name: 'Colchón financiero',
          targetAmount: undefined,
          emergencyFundMonths: 6,
        },
        projectionState: 'unknown_expenses',
      })
    })

    it('returns available projection state for non-emergency goal even when expenses are unknown', async () => {
      vi.mocked(db.query.financialProfiles.findFirst).mockResolvedValue({
        userId: 'user_1',
        approximateMonthlyIncome: '500000.00',
        approximateMonthlyExpenses: null,
        expensesKnowledge: 'unknown',
        plannedMonthlyContribution: '50000.00',
      } as never)
      vi.mocked(db.query.financialGoals.findFirst).mockResolvedValue({
        id: 'g2',
        userId: 'user_1',
        name: 'Ahorro fijo',
        type: 'fixed_savings',
        targetAmount: '1000000.00',
        currency: 'ARS',
        emergencyFundMonths: null,
      } as never)

      const state = await getInitialHomeState('user_1')
      expect(state).toEqual({
        income: { amount: '500000.00', currency: 'ARS' },
        expensesKnowledge: 'unknown',
        expenses: undefined,
        plannedContribution: { amount: '50000.00', currency: 'ARS' },
        goal: {
          type: 'fixed_savings',
          name: 'Ahorro fijo',
          targetAmount: { amount: '1000000.00', currency: 'ARS' },
          emergencyFundMonths: undefined,
        },
        projectionState: 'available',
      })
    })
  })
})

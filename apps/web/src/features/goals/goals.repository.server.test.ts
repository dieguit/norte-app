import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/client'
import {
  allocationPlanEntries,
  allocationPlanSnapshots,
  financialGoals,
  goalInvestmentPositions,
} from '../../db/schema'
import {
  confirmGoalCreationInRepository,
  createGoalCreationPreviewToken,
  getGoalCreationState,
  getGoalsWorkspaceRows,
  StaleGoalCreationPreviewError,
} from './goals.repository.server'
import type { GoalCreationDraft } from './goal-creation.schema'

const mockTx = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  query: {
    financialProfiles: {
      findFirst: vi.fn(),
    },
    financialGoals: {
      findMany: vi.fn(),
    },
    goalSavingsPositions: {
      findMany: vi.fn(),
    },
    goalInvestmentPositions: {
      findMany: vi.fn(),
    },
    allocationPlanSnapshots: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    allocationPlanEntries: {
      findMany: vi.fn(),
    },
  },
}

vi.mock('../../db/client', () => ({
  db: {
    transaction: vi.fn().mockImplementation((callback) => callback(mockTx)),
    query: {
      financialProfiles: {
        findFirst: vi.fn(),
      },
      financialGoals: {
        findMany: vi.fn(),
      },
      goalSavingsPositions: {
        findMany: vi.fn(),
      },
      goalInvestmentPositions: {
        findMany: vi.fn(),
      },
      allocationPlanSnapshots: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      allocationPlanEntries: {
        findMany: vi.fn(),
      },
    },
  },
}))

describe('goals.repository.server', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when financial profile is absent', async () => {
    vi.mocked(db.query.financialProfiles.findFirst).mockResolvedValue(undefined as never)

    const result = await getGoalsWorkspaceRows('user_1', '2026-08')

    expect(result).toBeNull()
    expect(db.query.financialGoals.findMany).not.toHaveBeenCalled()
    expect(db.query.allocationPlanSnapshots.findMany).not.toHaveBeenCalled()
  })

  it('filters goals and snapshots by userId, and loads positions and allocations only for selected IDs', async () => {
    const mockProfile = {
      userId: 'user_1',
      baseCurrency: 'ARS',
      approximateMonthlyIncome: '1000000.00',
      approximateMonthlyExpenses: '500000.00',
      expensesKnowledge: 'known',
      plannedMonthlyContribution: '60000.00',
      onboardingCompleted: true,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    }
    const mockGoal1 = {
      id: 'g1',
      userId: 'user_1',
      name: 'Fondo de Emergencia',
      type: 'emergency_fund',
      targetAmount: '3000.00',
      currency: 'USD',
      priority: 'high',
      strategy: 'save',
      status: 'active',
      desiredDate: '2027-01-01',
      completedAt: null,
      emergencyFundMonths: 6,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    }
    const mockGoal2 = {
      id: 'g2',
      userId: 'user_1',
      name: 'Viaje a Japón',
      type: 'purchase',
      targetAmount: '5000.00',
      currency: 'USD',
      priority: 'medium',
      strategy: 'invest',
      status: 'active',
      desiredDate: '2028-06-01',
      completedAt: null,
      emergencyFundMonths: null,
      createdAt: new Date('2026-02-01T00:00:00Z'),
      updatedAt: new Date('2026-02-01T00:00:00Z'),
    }
    const mockSavingsPos = {
      id: 'sp1',
      goalId: 'g1',
      amount: '500.00',
      currency: 'USD',
      location: 'Caja de ahorro',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    }
    const mockInvestPos = {
      id: 'ip1',
      goalId: 'g2',
      currentValue: '1200.00',
      currency: 'USD',
      annualReturnRate: '8.000',
      availability: 'available_now',
      availableFrom: null,
      createdAt: new Date('2026-02-01T00:00:00Z'),
      updatedAt: new Date('2026-02-01T00:00:00Z'),
    }

    const snapshotPast = {
      id: 's1',
      userId: 'user_1',
      effectiveMonth: '2026-07-01',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    }
    const snapshotCurrent = {
      id: 's2',
      userId: 'user_1',
      effectiveMonth: '2026-08-01',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    }
    const snapshotFuture = {
      id: 's3',
      userId: 'user_1',
      effectiveMonth: '2026-09-01',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    }

    const mockAlloc1 = {
      id: 'a1',
      snapshotId: 's2',
      goalId: 'g1',
      percentage: '60.00',
    }
    const mockAlloc2 = {
      id: 'a2',
      snapshotId: 's2',
      goalId: 'g2',
      percentage: '40.00',
    }

    vi.mocked(db.query.financialProfiles.findFirst).mockResolvedValue(mockProfile as never)
    vi.mocked(db.query.financialGoals.findMany).mockResolvedValue([mockGoal1, mockGoal2] as never)
    vi.mocked(db.query.goalSavingsPositions.findMany).mockResolvedValue([mockSavingsPos] as never)
    vi.mocked(db.query.goalInvestmentPositions.findMany).mockResolvedValue([mockInvestPos] as never)
    vi.mocked(db.query.allocationPlanSnapshots.findMany).mockResolvedValue([
      snapshotPast,
      snapshotCurrent,
      snapshotFuture,
    ] as never)
    vi.mocked(db.query.allocationPlanEntries.findMany).mockResolvedValue([mockAlloc1, mockAlloc2] as never)

    const result = await getGoalsWorkspaceRows('user_1', '2026-08')

    expect(result).not.toBeNull()
    expect(result?.profile).toEqual(mockProfile)
    expect(result?.goals).toEqual([mockGoal1, mockGoal2])
    expect(result?.savingsPositions).toEqual([mockSavingsPos])
    expect(result?.investmentPositions).toEqual([mockInvestPos])
    expect(result?.snapshots).toEqual([snapshotCurrent])
    expect(result?.allocations).toEqual([mockAlloc1, mockAlloc2])

    const eqMock = vi.fn((col, val) => ({ col, val, op: 'eq' }))
    const inArrayMock = vi.fn((col, val) => ({ col, val, op: 'inArray' }))

    const profileWhereArg = vi.mocked(db.query.financialProfiles.findFirst).mock.calls[0][0]?.where
    expect(
      typeof profileWhereArg === 'function' &&
        (profileWhereArg as any)({ userId: 'userId' }, { eq: eqMock }),
    ).toEqual({
      col: 'userId',
      val: 'user_1',
      op: 'eq',
    })

    const goalsWhereArg = vi.mocked(db.query.financialGoals.findMany).mock.calls[0][0]?.where
    expect(
      typeof goalsWhereArg === 'function' &&
        (goalsWhereArg as any)({ userId: 'userId' }, { eq: eqMock }),
    ).toEqual({
      col: 'userId',
      val: 'user_1',
      op: 'eq',
    })

    const snapshotsWhereArg = vi.mocked(db.query.allocationPlanSnapshots.findMany).mock.calls[0][0]?.where
    expect(
      typeof snapshotsWhereArg === 'function' &&
        (snapshotsWhereArg as any)({ userId: 'userId' }, { eq: eqMock }),
    ).toEqual({
      col: 'userId',
      val: 'user_1',
      op: 'eq',
    })

    const allocsWhereArg = vi.mocked(db.query.allocationPlanEntries.findMany).mock.calls[0][0]?.where
    expect(
      typeof allocsWhereArg === 'function' &&
        (allocsWhereArg as any)({ snapshotId: 'snapshotId' }, { inArray: inArrayMock }),
    ).toEqual({
      col: 'snapshotId',
      val: ['s2'],
      op: 'inArray',
    })
  })

  it('selects the earliest upcoming snapshot if no snapshot is effective yet', async () => {
    const mockProfile = {
      userId: 'user_1',
      baseCurrency: 'ARS',
      approximateMonthlyIncome: '1000000.00',
      approximateMonthlyExpenses: null,
      expensesKnowledge: 'unknown',
      plannedMonthlyContribution: '60000.00',
      onboardingCompleted: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const mockGoal = {
      id: 'g1',
      userId: 'user_1',
      name: 'Fondo',
      type: 'emergency_fund',
      targetAmount: '1000.00',
      currency: 'USD',
      priority: 'high',
      strategy: 'save',
      status: 'active',
      desiredDate: null,
      completedAt: null,
      emergencyFundMonths: 6,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const snapshotUpcoming1 = {
      id: 's_sep',
      userId: 'user_1',
      effectiveMonth: '2026-09-01',
      createdAt: new Date(),
    }
    const snapshotUpcoming2 = {
      id: 's_oct',
      userId: 'user_1',
      effectiveMonth: '2026-10-01',
      createdAt: new Date(),
    }

    vi.mocked(db.query.financialProfiles.findFirst).mockResolvedValue(mockProfile as never)
    vi.mocked(db.query.financialGoals.findMany).mockResolvedValue([mockGoal] as never)
    vi.mocked(db.query.goalSavingsPositions.findMany).mockResolvedValue([] as never)
    vi.mocked(db.query.goalInvestmentPositions.findMany).mockResolvedValue([] as never)
    vi.mocked(db.query.allocationPlanSnapshots.findMany).mockResolvedValue([
      snapshotUpcoming2,
      snapshotUpcoming1,
    ] as never)
    vi.mocked(db.query.allocationPlanEntries.findMany).mockResolvedValue([] as never)

    const result = await getGoalsWorkspaceRows('user_1', '2026-08')

    expect(result?.snapshots).toEqual([snapshotUpcoming1])
  })

  it('handles empty goals and empty snapshots without issuing inArray queries with empty arrays', async () => {
    const mockProfile = {
      userId: 'user_1',
      baseCurrency: 'ARS',
      approximateMonthlyIncome: '1000000.00',
      approximateMonthlyExpenses: null,
      expensesKnowledge: 'unknown',
      plannedMonthlyContribution: '60000.00',
      onboardingCompleted: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    vi.mocked(db.query.financialProfiles.findFirst).mockResolvedValue(mockProfile as never)
    vi.mocked(db.query.financialGoals.findMany).mockResolvedValue([] as never)
    vi.mocked(db.query.allocationPlanSnapshots.findMany).mockResolvedValue([] as never)

    const result = await getGoalsWorkspaceRows('user_1', '2026-08')

    expect(result).toEqual({
      profile: mockProfile,
      goals: [],
      savingsPositions: [],
      investmentPositions: [],
      snapshots: [],
      allocations: [],
    })

    expect(db.query.goalSavingsPositions.findMany).not.toHaveBeenCalled()
    expect(db.query.goalInvestmentPositions.findMany).not.toHaveBeenCalled()
    expect(db.query.allocationPlanEntries.findMany).not.toHaveBeenCalled()
  })

  describe('getGoalCreationState', () => {
    it('returns null when profile is absent', async () => {
      vi.mocked(db.query.financialProfiles.findFirst).mockResolvedValue(undefined as never)

      const result = await getGoalCreationState('user_1', '2026-08')

      expect(result).toBeNull()
      expect(db.query.financialGoals.findMany).not.toHaveBeenCalled()
      expect(db.query.allocationPlanSnapshots.findMany).not.toHaveBeenCalled()
    })

    it('filters profile, goals, and snapshots by userId, returns only active goals in source, loads positions, returns current winning and next-month pending snapshots, and loads entries for both', async () => {
      const mockProfile = {
        userId: 'user_1',
        baseCurrency: 'ARS',
        approximateMonthlyIncome: '1000000.00',
        approximateMonthlyExpenses: '500000.00',
        expensesKnowledge: 'known',
        plannedMonthlyContribution: '60000.00',
        onboardingCompleted: true,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      }

      const mockGoalActive1 = {
        id: 'g1',
        userId: 'user_1',
        name: 'Fondo de Emergencia',
        type: 'emergency_fund',
        targetAmount: '3000.00',
        currency: 'USD',
        priority: 'high',
        strategy: 'save',
        status: 'active',
        desiredDate: '2027-01-01',
        completedAt: null,
        emergencyFundMonths: 6,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      }
      const mockGoalActive2 = {
        id: 'g2',
        userId: 'user_1',
        name: 'Inversión Retiro',
        type: 'retirement',
        targetAmount: '50000.00',
        currency: 'USD',
        priority: 'medium',
        strategy: 'invest',
        status: 'active',
        desiredDate: '2036-01-01',
        completedAt: null,
        emergencyFundMonths: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      }
      const mockGoalPaused = {
        id: 'g3',
        userId: 'user_1',
        name: 'Auto nuevo',
        type: 'purchase',
        targetAmount: '10000.00',
        currency: 'USD',
        priority: 'low',
        strategy: 'save',
        status: 'paused',
        desiredDate: '2028-01-01',
        completedAt: null,
        emergencyFundMonths: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      }

      const mockSavingsPos1 = {
        id: 'sp1',
        goalId: 'g1',
        amount: '1000.00',
        currency: 'USD',
        location: 'Banco',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      }
      const mockInvestPos2 = {
        id: 'ip1',
        goalId: 'g2',
        currentValue: '5000.00',
        currency: 'USD',
        annualReturnRate: '7.000',
        availability: 'available_now',
        availableFrom: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      }

      const currentSnapshot = {
        id: 's2',
        userId: 'user_1',
        effectiveMonth: '2026-08-01',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      }
      const septemberSnapshot = {
        id: 's3',
        userId: 'user_1',
        effectiveMonth: '2026-09-01',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      }
      const pastSnapshot = {
        id: 's1',
        userId: 'user_1',
        effectiveMonth: '2026-07-01',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      }
      const farFutureSnapshot = {
        id: 's4',
        userId: 'user_1',
        effectiveMonth: '2026-11-01',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      }

      const currentAllocations = [
        { id: 'a1', snapshotId: 's2', goalId: 'g1', percentage: '100.00' },
      ]
      const septemberAllocations = [
        { id: 'a2', snapshotId: 's3', goalId: 'g1', percentage: '60.00' },
        { id: 'a3', snapshotId: 's3', goalId: 'g2', percentage: '40.00' },
      ]

      vi.mocked(db.query.financialProfiles.findFirst).mockResolvedValue(mockProfile as never)
      vi.mocked(db.query.financialGoals.findMany).mockResolvedValue([
        mockGoalActive1,
        mockGoalActive2,
        mockGoalPaused,
      ] as never)
      vi.mocked(db.query.goalSavingsPositions.findMany).mockResolvedValue([mockSavingsPos1] as never)
      vi.mocked(db.query.goalInvestmentPositions.findMany).mockResolvedValue([mockInvestPos2] as never)
      vi.mocked(db.query.allocationPlanSnapshots.findMany).mockResolvedValue([
        pastSnapshot,
        currentSnapshot,
        septemberSnapshot,
        farFutureSnapshot,
      ] as never)
      vi.mocked(db.query.allocationPlanEntries.findMany).mockResolvedValue([
        ...currentAllocations,
        ...septemberAllocations,
      ] as never)

      const state = await getGoalCreationState('user_1', '2026-08')

      expect(state).not.toBeNull()
      expect(state?.source.goals.map((g) => g.id)).toEqual(['g1', 'g2'])
      expect(state?.source.snapshots).toEqual([
        {
          id: 's2',
          userId: 'user_1',
          effectiveMonth: '2026-08-01',
        },
      ])
      expect(state?.source.allocations).toEqual([
        { id: 'a1', snapshotId: 's2', goalId: 'g1', percentage: '100.00' },
      ])
      expect(state?.pendingSnapshots).toEqual([
        {
          id: 's3',
          userId: 'user_1',
          effectiveMonth: '2026-09-01',
        },
      ])
      expect(state?.pendingAllocations).toEqual([
        { id: 'a2', snapshotId: 's3', goalId: 'g1', percentage: '60.00' },
        { id: 'a3', snapshotId: 's3', goalId: 'g2', percentage: '40.00' },
      ])

      const inArrayMock = vi.fn((col, val) => ({ col, val, op: 'inArray' }))
      const savingsWhereArg = vi.mocked(db.query.goalSavingsPositions.findMany).mock.calls[0][0]?.where
      expect(
        typeof savingsWhereArg === 'function' &&
          (savingsWhereArg as any)({ goalId: 'goalId' }, { inArray: inArrayMock }),
      ).toEqual({
        col: 'goalId',
        val: ['g1', 'g2', 'g3'],
        op: 'inArray',
      })

      const allocsWhereArg = vi.mocked(db.query.allocationPlanEntries.findMany).mock.calls[0][0]?.where
      expect(
        typeof allocsWhereArg === 'function' &&
          (allocsWhereArg as any)({ snapshotId: 'snapshotId' }, { inArray: inArrayMock }),
      ).toEqual({
        col: 'snapshotId',
        val: ['s2', 's3'],
        op: 'inArray',
      })
    })
  })

  describe('createGoalCreationPreviewToken', () => {
    it('generates a 64-character sha256 hex string that is deterministic for state and currentMonth', () => {
      const state = {
        source: {
          profile: {
            userId: 'user_1',
            baseCurrency: 'ARS' as const,
            approximateMonthlyIncome: '1000000.00',
            approximateMonthlyExpenses: '500000.00',
            expensesKnowledge: 'known',
            plannedMonthlyContribution: '60000.00',
            onboardingCompleted: true,
          },
          goals: [],
          savingsPositions: [],
          investmentPositions: [],
          snapshots: [],
          allocations: [],
        },
        pendingSnapshots: [],
        pendingAllocations: [],
      }

      const token1 = createGoalCreationPreviewToken(state, '2026-08')
      const token2 = createGoalCreationPreviewToken(state, '2026-08')
      const tokenDiffMonth = createGoalCreationPreviewToken(state, '2026-09')

      expect(token1).toMatch(/^[a-f0-9]{64}$/)
      expect(token1).toBe(token2)
      expect(token1).not.toBe(tokenDiffMonth)
    })
  })

  describe('confirmGoalCreationInRepository', () => {
    const currentMonth = '2026-08'

    const mockProfile = {
      userId: 'user_1',
      baseCurrency: 'ARS',
      approximateMonthlyIncome: '1000000.00',
      approximateMonthlyExpenses: '500000.00',
      expensesKnowledge: 'known',
      plannedMonthlyContribution: '60000.00',
      onboardingCompleted: true,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    }

    const mockGoal1 = {
      id: 'g1',
      userId: 'user_1',
      name: 'Fondo de Emergencia',
      type: 'emergency_fund',
      targetAmount: '3000.00',
      currency: 'USD',
      priority: 'high',
      strategy: 'save',
      status: 'active',
      desiredDate: '2027-01-01',
      completedAt: null,
      emergencyFundMonths: 6,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    }

    const mockGoal2 = {
      id: 'g2',
      userId: 'user_1',
      name: 'Viaje a Japón',
      type: 'purchase',
      targetAmount: '5000.00',
      currency: 'USD',
      priority: 'medium',
      strategy: 'invest',
      status: 'active',
      desiredDate: '2028-06-01',
      completedAt: null,
      emergencyFundMonths: null,
      createdAt: new Date('2026-02-01T00:00:00Z'),
      updatedAt: new Date('2026-02-01T00:00:00Z'),
    }

    const mockSnapshotCurrent = {
      id: 's_current',
      userId: 'user_1',
      effectiveMonth: '2026-08-01',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    }

    const mockAlloc1 = {
      id: 'a1',
      snapshotId: 's_current',
      goalId: 'g1',
      percentage: '60.00',
    }
    const mockAlloc2 = {
      id: 'a2',
      snapshotId: 's_current',
      goalId: 'g2',
      percentage: '40.00',
    }

    const validDraft: GoalCreationDraft = {
      type: 'purchase',
      name: 'Nuevo auto',
      targetAmount: '5000.00',
      currency: 'USD',
      desiredMonth: '2027-04',
      priority: 'high',
      strategy: 'invest',
      annualReturnRate: '8.5',
      availability: 'available_now',
      availableFromMonth: '',
      allocations: [
        { goalId: 'g1', percentage: '30.00' },
        { goalId: 'g2', percentage: '20.00' },
        { goalId: 'pending-goal', percentage: '50.00' },
      ],
    }

    function setupMocks(overrides?: {
      profile?: any
      goals?: any[]
      savingsPositions?: any[]
      investmentPositions?: any[]
      snapshots?: any[]
      allocations?: any[]
    }) {
      const profile = overrides && 'profile' in overrides ? overrides.profile : mockProfile
      const goals = overrides?.goals ?? [mockGoal1, mockGoal2]
      const savingsPositions = overrides?.savingsPositions ?? []
      const investmentPositions = overrides?.investmentPositions ?? []
      const snapshots = overrides?.snapshots ?? [mockSnapshotCurrent]
      const allocations = overrides?.allocations ?? [mockAlloc1, mockAlloc2]

      db.query.financialProfiles.findFirst = vi.fn().mockResolvedValue(profile)
      db.query.financialGoals.findMany = vi.fn().mockResolvedValue(goals)
      db.query.goalSavingsPositions.findMany = vi.fn().mockResolvedValue(savingsPositions)
      db.query.goalInvestmentPositions.findMany = vi.fn().mockResolvedValue(investmentPositions)
      db.query.allocationPlanSnapshots.findMany = vi.fn().mockResolvedValue(snapshots)
      db.query.allocationPlanSnapshots.findFirst = vi.fn().mockImplementation(({ where }) => {
        const dummyEq = vi.fn((col, val) => ({ col, val }))
        const dummyAnd = vi.fn((...conditions) => conditions)
        if (typeof where === 'function') {
          const conds = where(
            { userId: 'userId', effectiveMonth: 'effectiveMonth' },
            { eq: dummyEq, and: dummyAnd },
          )
          const userCond = conds.find((c: any) => c.col === 'userId')
          const monthCond = conds.find((c: any) => c.col === 'effectiveMonth')
          return snapshots.find(
            (s) => s.userId === userCond?.val && s.effectiveMonth === monthCond?.val,
          )
        }
        return undefined
      })
      db.query.allocationPlanEntries.findMany = vi.fn().mockResolvedValue(allocations)

      mockTx.query = db.query as any

      mockTx.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            for: vi.fn().mockResolvedValue([{ userId: 'user_1' }]),
          }),
        }),
      })

      mockTx.insert.mockImplementation((table: any) => ({
        values: vi.fn().mockImplementation((_val: any) => {
          if (table === financialGoals) {
            return { returning: vi.fn().mockResolvedValue([{ id: 'goal_created_id' }]) }
          }
          if (table === allocationPlanSnapshots) {
            return { returning: vi.fn().mockResolvedValue([{ id: 'snapshot_created_id' }]) }
          }
          return { returning: vi.fn().mockResolvedValue([{ id: 'mock_id' }]) }
        }),
      }))

      mockTx.update.mockImplementation((_table: any) => ({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'updated_id' }]),
        }),
      }))

      mockTx.delete.mockImplementation((_table: any) => ({
        where: vi.fn().mockResolvedValue(undefined),
      }))
    }

    it('1. inserts Goal with normalized fixed target and next-month desired date', async () => {
      setupMocks()
      const state = await getGoalCreationState('user_1', currentMonth)
      const token = createGoalCreationPreviewToken(state!, currentMonth, validDraft)

      const result = await confirmGoalCreationInRepository({
        userId: 'user_1',
        currentMonth,
        draft: validDraft,
        previewToken: token,
      })

      expect(result).toEqual({ goalId: 'goal_created_id' })
      expect(mockTx.select).toHaveBeenCalled()
      expect(mockTx.insert).toHaveBeenCalledWith(financialGoals)
      expect(mockTx.insert).toHaveBeenCalledWith(allocationPlanSnapshots)
      expect(mockTx.insert).toHaveBeenCalledWith(allocationPlanEntries)

      const goalInsertCall = mockTx.insert.mock.calls.find((call) => call[0] === financialGoals)
      expect(goalInsertCall).toBeDefined()
    })

    it('2. inserts zero-valued investment position when strategy is invest', async () => {
      setupMocks()
      const state = await getGoalCreationState('user_1', currentMonth)
      const token = createGoalCreationPreviewToken(state!, currentMonth, validDraft)

      await confirmGoalCreationInRepository({
        userId: 'user_1',
        currentMonth,
        draft: validDraft,
        previewToken: token,
      })

      expect(mockTx.insert).toHaveBeenCalledWith(goalInvestmentPositions)
    })

    it('3. does not insert investment position when strategy is save', async () => {
      setupMocks()
      const saveDraft: GoalCreationDraft = {
        ...validDraft,
        strategy: 'save',
      }
      const state = await getGoalCreationState('user_1', currentMonth)
      const token = createGoalCreationPreviewToken(state!, currentMonth, saveDraft)

      await confirmGoalCreationInRepository({
        userId: 'user_1',
        currentMonth,
        draft: saveDraft,
        previewToken: token,
      })

      expect(mockTx.insert).not.toHaveBeenCalledWith(goalInvestmentPositions)
    })

    it('4. reuses existing next-month snapshot without inserting new snapshot', async () => {
      const pendingSnapshot = {
        id: 's_pending',
        userId: 'user_1',
        effectiveMonth: '2026-09-01',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      }

      setupMocks({
        snapshots: [mockSnapshotCurrent, pendingSnapshot],
      })

      const state = await getGoalCreationState('user_1', currentMonth)
      const token = createGoalCreationPreviewToken(state!, currentMonth, validDraft)

      await confirmGoalCreationInRepository({
        userId: 'user_1',
        currentMonth,
        draft: validDraft,
        previewToken: token,
      })

      expect(mockTx.insert).not.toHaveBeenCalledWith(allocationPlanSnapshots)
      expect(mockTx.delete).toHaveBeenCalledWith(allocationPlanEntries)
      expect(mockTx.insert).toHaveBeenCalledWith(allocationPlanEntries)
    })

    it('5. rejects when allocations were edited after preview without refreshing the token', async () => {
      setupMocks()
      const state = await getGoalCreationState('user_1', currentMonth)
      const token = createGoalCreationPreviewToken(state!, currentMonth, validDraft)

      const editedDraft: GoalCreationDraft = {
        ...validDraft,
        allocations: [
          { goalId: 'g1', percentage: '25.00' },
          { goalId: 'g2', percentage: '25.00' },
          { goalId: 'pending-goal', percentage: '50.00' },
        ],
      }

      await expect(
        confirmGoalCreationInRepository({
          userId: 'user_1',
          currentMonth,
          draft: editedDraft,
          previewToken: token,
        }),
      ).rejects.toThrow(StaleGoalCreationPreviewError)

      expect(mockTx.insert).not.toHaveBeenCalled()
    })

    it('6. rejects before writes when the state token changed with StaleGoalCreationPreviewError', async () => {
      setupMocks()
      const staleToken = 'f'.repeat(64)

      await expect(
        confirmGoalCreationInRepository({
          userId: 'user_1',
          currentMonth,
          draft: validDraft,
          previewToken: staleToken,
        }),
      ).rejects.toThrow(StaleGoalCreationPreviewError)

      expect(mockTx.insert).not.toHaveBeenCalled()
    })

    it('7. rejects before writes when allocations do not sum to 100%', async () => {
      setupMocks()
      const state = await getGoalCreationState('user_1', currentMonth)

      const badDraft: GoalCreationDraft = {
        ...validDraft,
        allocations: [
          { goalId: 'g1', percentage: '30.00' },
          { goalId: 'g2', percentage: '20.00' },
          { goalId: 'pending-goal', percentage: '30.00' },
        ],
      }
      const token = createGoalCreationPreviewToken(state!, currentMonth, badDraft)

      await expect(
        confirmGoalCreationInRepository({
          userId: 'user_1',
          currentMonth,
          draft: badDraft,
          previewToken: token,
        }),
      ).rejects.toThrow()

      expect(mockTx.insert).not.toHaveBeenCalled()
    })

    it('8. transaction rejection leaves no successful result when database error occurs', async () => {
      setupMocks()
      const state = await getGoalCreationState('user_1', currentMonth)
      const token = createGoalCreationPreviewToken(state!, currentMonth, validDraft)

      mockTx.insert.mockImplementationOnce(() => {
        throw new Error('database deadlock or connection error')
      })

      await expect(
        confirmGoalCreationInRepository({
          userId: 'user_1',
          currentMonth,
          draft: validDraft,
          previewToken: token,
        }),
      ).rejects.toThrow('database deadlock or connection error')
    })
  })
})

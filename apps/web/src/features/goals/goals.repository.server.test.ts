import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/client'
import {
  channelPlanAllocations,
  channelPlanSnapshots,
  contributionChannels,
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
    contributionChannels: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    goalSavingsPositions: {
      findMany: vi.fn(),
    },
    goalInvestmentPositions: {
      findMany: vi.fn(),
    },
    channelPlanSnapshots: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    channelPlanAllocations: {
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
      contributionChannels: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      goalSavingsPositions: {
        findMany: vi.fn(),
      },
      goalInvestmentPositions: {
        findMany: vi.fn(),
      },
      channelPlanSnapshots: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      channelPlanAllocations: {
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
    expect(db.query.contributionChannels.findMany).not.toHaveBeenCalled()
  })

  it('filters goals and channels by userId, and loads positions and allocations only for selected IDs', async () => {
    const mockProfile = {
      userId: 'user_1',
      baseCurrency: 'ARS',
      approximateMonthlyIncome: '1000000.00',
      approximateMonthlyExpenses: '500000.00',
      expensesKnowledge: 'known',
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
      status: 'active',
      desiredDate: '2027-01-01',
      completedAt: null,
      emergencyFundMonths: 6,
      saveEnabled: true,
      investEnabled: false,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    }
    const mockGoal2 = {
      id: 'g2',
      userId: 'user_1',
      name: 'Viaje a Japón',
      type: 'custom',
      targetAmount: '5000.00',
      currency: 'USD',
      priority: 'medium',
      status: 'active',
      desiredDate: '2028-06-01',
      completedAt: null,
      emergencyFundMonths: null,
      saveEnabled: false,
      investEnabled: true,
      createdAt: new Date('2026-02-01T00:00:00Z'),
      updatedAt: new Date('2026-02-01T00:00:00Z'),
    }
    const mockChannel1 = {
      id: 'c1',
      userId: 'user_1',
      fundingMethod: 'save',
      destinationCurrency: 'USD',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
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

    // Two snapshots around 2026-08-01:
    // s1 is effective 2026-07-01, s2 is effective 2026-08-01, s3 is effective 2026-09-01
    const snapshotPast = {
      id: 's1',
      channelId: 'c1',
      monthlyCommitmentAmount: '100.00',
      baseCurrency: 'ARS',
      commitmentStatus: 'active',
      effectiveMonth: '2026-07-01',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    }
    const snapshotCurrent = {
      id: 's2',
      channelId: 'c1',
      monthlyCommitmentAmount: '200.00',
      baseCurrency: 'ARS',
      commitmentStatus: 'active',
      effectiveMonth: '2026-08-01',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    }
    const snapshotFuture = {
      id: 's3',
      channelId: 'c1',
      monthlyCommitmentAmount: '300.00',
      baseCurrency: 'ARS',
      commitmentStatus: 'active',
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
    vi.mocked(db.query.contributionChannels.findMany).mockResolvedValue([mockChannel1] as never)
    vi.mocked(db.query.goalSavingsPositions.findMany).mockResolvedValue([mockSavingsPos] as never)
    vi.mocked(db.query.goalInvestmentPositions.findMany).mockResolvedValue([mockInvestPos] as never)
    vi.mocked(db.query.channelPlanSnapshots.findMany).mockResolvedValue([
      snapshotPast,
      snapshotCurrent,
      snapshotFuture,
    ] as never)
    vi.mocked(db.query.channelPlanAllocations.findMany).mockResolvedValue([mockAlloc1, mockAlloc2] as never)

    const result = await getGoalsWorkspaceRows('user_1', '2026-08')

    expect(result).not.toBeNull()
    expect(result?.profile).toEqual(mockProfile)
    expect(result?.goals).toEqual([mockGoal1, mockGoal2])
    expect(result?.savingsPositions).toEqual([mockSavingsPos])
    expect(result?.investmentPositions).toEqual([mockInvestPos])
    expect(result?.channels).toEqual([mockChannel1])
    // Selected snapshot must be s2 (latest on or before 2026-08)
    expect(result?.snapshots).toEqual([snapshotCurrent])
    expect(result?.allocations).toEqual([mockAlloc1, mockAlloc2])

    // Verify where condition helpers
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

    const channelsWhereArg = vi.mocked(db.query.contributionChannels.findMany).mock.calls[0][0]?.where
    expect(
      typeof channelsWhereArg === 'function' &&
        (channelsWhereArg as any)({ userId: 'userId' }, { eq: eqMock }),
    ).toEqual({
      col: 'userId',
      val: 'user_1',
      op: 'eq',
    })

    const savingsWhereArg = vi.mocked(db.query.goalSavingsPositions.findMany).mock.calls[0][0]?.where
    expect(
      typeof savingsWhereArg === 'function' &&
        (savingsWhereArg as any)({ goalId: 'goalId' }, { inArray: inArrayMock }),
    ).toEqual({
      col: 'goalId',
      val: ['g1', 'g2'],
      op: 'inArray',
    })

    const allocsWhereArg = vi.mocked(db.query.channelPlanAllocations.findMany).mock.calls[0][0]?.where
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
      status: 'active',
      desiredDate: null,
      completedAt: null,
      emergencyFundMonths: 6,
      saveEnabled: true,
      investEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const mockChannel = {
      id: 'c1',
      userId: 'user_1',
      fundingMethod: 'save',
      destinationCurrency: 'USD',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const snapshotUpcoming1 = {
      id: 's_sep',
      channelId: 'c1',
      monthlyCommitmentAmount: '150.00',
      baseCurrency: 'ARS',
      commitmentStatus: 'active',
      effectiveMonth: '2026-09-01',
      createdAt: new Date(),
    }
    const snapshotUpcoming2 = {
      id: 's_oct',
      channelId: 'c1',
      monthlyCommitmentAmount: '200.00',
      baseCurrency: 'ARS',
      commitmentStatus: 'active',
      effectiveMonth: '2026-10-01',
      createdAt: new Date(),
    }

    vi.mocked(db.query.financialProfiles.findFirst).mockResolvedValue(mockProfile as never)
    vi.mocked(db.query.financialGoals.findMany).mockResolvedValue([mockGoal] as never)
    vi.mocked(db.query.contributionChannels.findMany).mockResolvedValue([mockChannel] as never)
    vi.mocked(db.query.goalSavingsPositions.findMany).mockResolvedValue([] as never)
    vi.mocked(db.query.goalInvestmentPositions.findMany).mockResolvedValue([] as never)
    vi.mocked(db.query.channelPlanSnapshots.findMany).mockResolvedValue([
      snapshotUpcoming2,
      snapshotUpcoming1,
    ] as never)
    vi.mocked(db.query.channelPlanAllocations.findMany).mockResolvedValue([] as never)

    const result = await getGoalsWorkspaceRows('user_1', '2026-08')

    expect(result?.snapshots).toEqual([snapshotUpcoming1])
  })

  it('handles empty goals and empty channels without issuing inArray queries with empty arrays', async () => {
    const mockProfile = {
      userId: 'user_1',
      baseCurrency: 'ARS',
      approximateMonthlyIncome: '1000000.00',
      approximateMonthlyExpenses: null,
      expensesKnowledge: 'unknown',
      onboardingCompleted: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    vi.mocked(db.query.financialProfiles.findFirst).mockResolvedValue(mockProfile as never)
    vi.mocked(db.query.financialGoals.findMany).mockResolvedValue([] as never)
    vi.mocked(db.query.contributionChannels.findMany).mockResolvedValue([] as never)

    const result = await getGoalsWorkspaceRows('user_1', '2026-08')

    expect(result).toEqual({
      profile: mockProfile,
      goals: [],
      savingsPositions: [],
      investmentPositions: [],
      channels: [],
      snapshots: [],
      allocations: [],
    })

    expect(db.query.goalSavingsPositions.findMany).not.toHaveBeenCalled()
    expect(db.query.goalInvestmentPositions.findMany).not.toHaveBeenCalled()
    expect(db.query.channelPlanSnapshots.findMany).not.toHaveBeenCalled()
    expect(db.query.channelPlanAllocations.findMany).not.toHaveBeenCalled()
  })

  it('keeps a goal with no optional position or allocation in the returned result', async () => {
    const mockProfile = {
      userId: 'user_1',
      baseCurrency: 'ARS',
      approximateMonthlyIncome: '1000000.00',
      approximateMonthlyExpenses: null,
      expensesKnowledge: 'unknown',
      onboardingCompleted: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const mockGoal = {
      id: 'g_lone',
      userId: 'user_1',
      name: 'Objetivo sin fondos',
      type: 'custom',
      targetAmount: '1000.00',
      currency: 'USD',
      priority: 'low',
      status: 'active',
      desiredDate: null,
      completedAt: null,
      emergencyFundMonths: null,
      saveEnabled: false,
      investEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    vi.mocked(db.query.financialProfiles.findFirst).mockResolvedValue(mockProfile as never)
    vi.mocked(db.query.financialGoals.findMany).mockResolvedValue([mockGoal] as never)
    vi.mocked(db.query.contributionChannels.findMany).mockResolvedValue([] as never)
    vi.mocked(db.query.goalSavingsPositions.findMany).mockResolvedValue([] as never)
    vi.mocked(db.query.goalInvestmentPositions.findMany).mockResolvedValue([] as never)

    const result = await getGoalsWorkspaceRows('user_1', '2026-08')

    expect(result?.goals).toHaveLength(1)
    expect(result?.goals[0].id).toBe('g_lone')
    expect(result?.savingsPositions).toEqual([])
    expect(result?.investmentPositions).toEqual([])
    expect(result?.channels).toEqual([])
    expect(result?.snapshots).toEqual([])
    expect(result?.allocations).toEqual([])
  })

  describe('getGoalCreationState', () => {
    it('returns null when profile is absent', async () => {
      vi.mocked(db.query.financialProfiles.findFirst).mockResolvedValue(undefined as never)

      const result = await getGoalCreationState('user_1', '2026-08')

      expect(result).toBeNull()
      expect(db.query.financialGoals.findMany).not.toHaveBeenCalled()
      expect(db.query.contributionChannels.findMany).not.toHaveBeenCalled()
    })

    it('filters profile, goals, and channels by userId, returns only active goals in source, loads positions for owned goals, returns current winning and next-month pending snapshots, and loads allocations for both', async () => {
      const mockProfile = {
        userId: 'user_1',
        baseCurrency: 'ARS',
        approximateMonthlyIncome: '1000000.00',
        approximateMonthlyExpenses: '500000.00',
        expensesKnowledge: 'known',
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
        status: 'active',
        desiredDate: '2027-01-01',
        completedAt: null,
        emergencyFundMonths: 6,
        saveEnabled: true,
        investEnabled: false,
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
        status: 'active',
        desiredDate: '2036-01-01',
        completedAt: null,
        emergencyFundMonths: null,
        saveEnabled: false,
        investEnabled: true,
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
        status: 'paused',
        desiredDate: '2028-01-01',
        completedAt: null,
        emergencyFundMonths: null,
        saveEnabled: true,
        investEnabled: false,
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

      const mockChannel1 = {
        id: 'c1',
        userId: 'user_1',
        fundingMethod: 'save',
        destinationCurrency: 'USD',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      }

      // Snapshots for c1:
      // s1 is past, s2 is current (2026-08-01), s3 is next-month pending (2026-09-01), s4 is distant future (2026-11-01)
      const currentSnapshot = {
        id: 's2',
        channelId: 'c1',
        monthlyCommitmentAmount: '200000.00',
        baseCurrency: 'ARS',
        commitmentStatus: 'active',
        effectiveMonth: '2026-08-01',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      }
      const septemberSnapshot = {
        id: 's3',
        channelId: 'c1',
        monthlyCommitmentAmount: '250000.00',
        baseCurrency: 'ARS',
        commitmentStatus: 'active',
        effectiveMonth: '2026-09-01',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      }
      const pastSnapshot = {
        id: 's1',
        channelId: 'c1',
        monthlyCommitmentAmount: '150000.00',
        baseCurrency: 'ARS',
        commitmentStatus: 'active',
        effectiveMonth: '2026-07-01',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      }
      const farFutureSnapshot = {
        id: 's4',
        channelId: 'c1',
        monthlyCommitmentAmount: '300000.00',
        baseCurrency: 'ARS',
        commitmentStatus: 'active',
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
      vi.mocked(db.query.contributionChannels.findMany).mockResolvedValue([mockChannel1] as never)
      vi.mocked(db.query.goalSavingsPositions.findMany).mockResolvedValue([mockSavingsPos1] as never)
      vi.mocked(db.query.goalInvestmentPositions.findMany).mockResolvedValue([mockInvestPos2] as never)
      vi.mocked(db.query.channelPlanSnapshots.findMany).mockResolvedValue([
        pastSnapshot,
        currentSnapshot,
        septemberSnapshot,
        farFutureSnapshot,
      ] as never)
      vi.mocked(db.query.channelPlanAllocations.findMany).mockResolvedValue([
        ...currentAllocations,
        ...septemberAllocations,
      ] as never)

      const state = await getGoalCreationState('user_1', '2026-08')

      expect(state).not.toBeNull()
      // Only active goals are kept in source.goals as allocation candidates
      expect(state?.source.goals.map((g) => g.id)).toEqual(['g1', 'g2'])
      expect(state?.source.snapshots).toEqual([
        {
          id: 's2',
          channelId: 'c1',
          monthlyCommitmentAmount: '200000.00',
          baseCurrency: 'ARS',
          commitmentStatus: 'active',
          effectiveMonth: '2026-08-01',
        },
      ])
      expect(state?.source.allocations).toEqual([
        { id: 'a1', snapshotId: 's2', goalId: 'g1', percentage: '100.00' },
      ])
      expect(state?.pendingSnapshots).toEqual([
        {
          id: 's3',
          channelId: 'c1',
          monthlyCommitmentAmount: '250000.00',
          baseCurrency: 'ARS',
          commitmentStatus: 'active',
          effectiveMonth: '2026-09-01',
        },
      ])
      expect(state?.pendingAllocations).toEqual([
        { id: 'a2', snapshotId: 's3', goalId: 'g1', percentage: '60.00' },
        { id: 'a3', snapshotId: 's3', goalId: 'g2', percentage: '40.00' },
      ])

      // Verify positions loaded for all owned goals
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

      // Verify allocations loaded for winning snapshot ('s2') and pending next-month snapshot ('s3')
      const allocsWhereArg = vi.mocked(db.query.channelPlanAllocations.findMany).mock.calls[0][0]?.where
      expect(
        typeof allocsWhereArg === 'function' &&
          (allocsWhereArg as any)({ snapshotId: 'snapshotId' }, { inArray: inArrayMock }),
      ).toEqual({
        col: 'snapshotId',
        val: ['s2', 's3'],
        op: 'inArray',
      })
    })

    it('handles empty goals and empty channels without issuing inArray queries with empty arrays', async () => {
      const mockProfile = {
        userId: 'user_1',
        baseCurrency: 'ARS',
        approximateMonthlyIncome: '1000000.00',
        approximateMonthlyExpenses: null,
        expensesKnowledge: 'unknown',
        onboardingCompleted: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(db.query.financialProfiles.findFirst).mockResolvedValue(mockProfile as never)
      vi.mocked(db.query.financialGoals.findMany).mockResolvedValue([] as never)
      vi.mocked(db.query.contributionChannels.findMany).mockResolvedValue([] as never)

      const result = await getGoalCreationState('user_1', '2026-08')

      expect(result).toEqual({
        source: {
          profile: {
            userId: 'user_1',
            baseCurrency: 'ARS',
            approximateMonthlyIncome: '1000000.00',
            approximateMonthlyExpenses: null,
            expensesKnowledge: 'unknown',
            onboardingCompleted: true,
          },
          goals: [],
          savingsPositions: [],
          investmentPositions: [],
          channels: [],
          snapshots: [],
          allocations: [],
        },
        pendingSnapshots: [],
        pendingAllocations: [],
      })

      expect(db.query.goalSavingsPositions.findMany).not.toHaveBeenCalled()
      expect(db.query.goalInvestmentPositions.findMany).not.toHaveBeenCalled()
      expect(db.query.channelPlanSnapshots.findMany).not.toHaveBeenCalled()
      expect(db.query.channelPlanAllocations.findMany).not.toHaveBeenCalled()
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
            onboardingCompleted: true,
          },
          goals: [],
          savingsPositions: [],
          investmentPositions: [],
          channels: [],
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
      status: 'active',
      desiredDate: '2027-01-01',
      completedAt: null,
      emergencyFundMonths: 6,
      saveEnabled: true,
      investEnabled: false,
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
      status: 'active',
      desiredDate: '2028-06-01',
      completedAt: null,
      emergencyFundMonths: null,
      saveEnabled: true,
      investEnabled: true,
      createdAt: new Date('2026-02-01T00:00:00Z'),
      updatedAt: new Date('2026-02-01T00:00:00Z'),
    }

    const mockChannelSaveUsd = {
      id: 'c_save_usd',
      userId: 'user_1',
      fundingMethod: 'save',
      destinationCurrency: 'USD',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    }

    const mockSnapshotCurrent = {
      id: 's_current',
      channelId: 'c_save_usd',
      monthlyCommitmentAmount: '200000.00',
      baseCurrency: 'ARS',
      commitmentStatus: 'active',
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
      targetAmount: '5.000.000',
      currency: 'USD',
      desiredMonth: '2027-04',
      priority: 'high',
      saveEnabled: true,
      investEnabled: true,
      defineSaveCommitment: true,
      saveMonthlyCommitment: '250.000',
      defineInvestCommitment: false,
      investMonthlyCommitment: '',
      annualReturnRate: '8.5',
      availability: 'available_now',
      availableFromMonth: '',
      allocations: [
        {
          key: 'save:USD',
          fundingMethod: 'save',
          destinationCurrency: 'USD',
          entries: [
            { goalId: 'g1', percentage: '30.00' },
            { goalId: 'g2', percentage: '20.00' },
            { goalId: 'pending-goal', percentage: '50.00' },
          ],
        },
        {
          key: 'invest:USD',
          fundingMethod: 'invest',
          destinationCurrency: 'USD',
          entries: [
            { goalId: 'g1', percentage: '0.00' },
            { goalId: 'g2', percentage: '0.00' },
            { goalId: 'pending-goal', percentage: '100.00' },
          ],
        },
      ],
    }

    function setupMocks(overrides?: {
      profile?: any
      goals?: any[]
      channels?: any[]
      savingsPositions?: any[]
      investmentPositions?: any[]
      snapshots?: any[]
      allocations?: any[]
    }) {
      const profile = overrides && 'profile' in overrides ? overrides.profile : mockProfile
      const goals = overrides?.goals ?? [mockGoal1, mockGoal2]
      const channels = overrides?.channels ?? [mockChannelSaveUsd]
      const savingsPositions = overrides?.savingsPositions ?? []
      const investmentPositions = overrides?.investmentPositions ?? []
      const snapshots = overrides?.snapshots ?? [mockSnapshotCurrent]
      const allocations = overrides?.allocations ?? [mockAlloc1, mockAlloc2]

      db.query.financialProfiles.findFirst = vi.fn().mockResolvedValue(profile)
      db.query.financialGoals.findMany = vi.fn().mockResolvedValue(goals)
      db.query.contributionChannels.findMany = vi.fn().mockResolvedValue(channels)
      db.query.contributionChannels.findFirst = vi.fn().mockImplementation(({ where }) => {
        const dummyEq = vi.fn((col, val) => ({ col, val }))
        const dummyAnd = vi.fn((...conditions) => conditions)
        if (typeof where === 'function') {
          const conds = where(
            { userId: 'userId', fundingMethod: 'fundingMethod', destinationCurrency: 'destinationCurrency' },
            { eq: dummyEq, and: dummyAnd },
          )
          const methodCond = conds.find((c: any) => c.col === 'fundingMethod')
          const currCond = conds.find((c: any) => c.col === 'destinationCurrency')
          return channels.find(
            (c) => c.fundingMethod === methodCond?.val && c.destinationCurrency === currCond?.val,
          )
        }
        return undefined
      })
      db.query.goalSavingsPositions.findMany = vi.fn().mockResolvedValue(savingsPositions)
      db.query.goalInvestmentPositions.findMany = vi.fn().mockResolvedValue(investmentPositions)
      db.query.channelPlanSnapshots.findMany = vi.fn().mockResolvedValue(snapshots)
      db.query.channelPlanSnapshots.findFirst = vi.fn().mockImplementation(({ where }) => {
        const dummyEq = vi.fn((col, val) => ({ col, val }))
        const dummyAnd = vi.fn((...conditions) => conditions)
        if (typeof where === 'function') {
          const conds = where(
            { channelId: 'channelId', effectiveMonth: 'effectiveMonth' },
            { eq: dummyEq, and: dummyAnd },
          )
          const channelCond = conds.find((c: any) => c.col === 'channelId')
          const monthCond = conds.find((c: any) => c.col === 'effectiveMonth')
          return snapshots.find(
            (s) => s.channelId === channelCond?.val && s.effectiveMonth === monthCond?.val,
          )
        }
        return undefined
      })
      db.query.channelPlanAllocations.findMany = vi.fn().mockResolvedValue(allocations)

      mockTx.query = db.query as any

      mockTx.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            for: vi.fn().mockResolvedValue([{ id: 'profile_1' }]),
          }),
        }),
      })

      mockTx.insert.mockImplementation((table: any) => ({
        values: vi.fn().mockImplementation((_val: any) => {
          if (table === financialGoals) {
            return { returning: vi.fn().mockResolvedValue([{ id: 'goal_created_id' }]) }
          }
          if (table === contributionChannels) {
            return { returning: vi.fn().mockResolvedValue([{ id: 'channel_created_id' }]) }
          }
          if (table === channelPlanSnapshots) {
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

      const goalInsertCall = mockTx.insert.mock.calls.find((call) => call[0] === financialGoals)
      expect(goalInsertCall).toBeDefined()
    })

    it('2. inserts zero-valued investment position when investing is enabled', async () => {
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

    it('3. creates new method/currency combination and inserts next-month snapshot', async () => {
      setupMocks()
      const state = await getGoalCreationState('user_1', currentMonth)
      const token = createGoalCreationPreviewToken(state!, currentMonth, validDraft)

      await confirmGoalCreationInRepository({
        userId: 'user_1',
        currentMonth,
        draft: validDraft,
        previewToken: token,
      })

      expect(mockTx.insert).toHaveBeenCalledWith(contributionChannels)
      expect(mockTx.insert).toHaveBeenCalledWith(channelPlanSnapshots)
    })

    it('4. uses existing combination and inserts new next-month snapshot when none was pending', async () => {
      setupMocks()
      const state = await getGoalCreationState('user_1', currentMonth)
      const token = createGoalCreationPreviewToken(state!, currentMonth, validDraft)

      await confirmGoalCreationInRepository({
        userId: 'user_1',
        currentMonth,
        draft: validDraft,
        previewToken: token,
      })

      expect(mockTx.update).not.toHaveBeenCalledWith(channelPlanSnapshots)
    })

    it('5. updates existing next-month snapshot and preserves existing commitmentStatus (e.g. paused)', async () => {
      const pendingSnapshot = {
        id: 's_pending',
        channelId: 'c_save_usd',
        monthlyCommitmentAmount: '220000.00',
        baseCurrency: 'ARS',
        commitmentStatus: 'paused',
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

      expect(mockTx.update).toHaveBeenCalledWith(channelPlanSnapshots)
      const updateCall = mockTx.update.mock.results[0]?.value?.set?.mock?.calls?.[0]?.[0]
      expect(updateCall?.commitmentStatus).toBe('paused')
      expect(mockTx.delete).toHaveBeenCalledWith(channelPlanAllocations)
    })

    it('6. writes explicit 0% rows for every compatible active Goal', async () => {
      setupMocks()
      const state = await getGoalCreationState('user_1', currentMonth)
      const token = createGoalCreationPreviewToken(state!, currentMonth, validDraft)

      await confirmGoalCreationInRepository({
        userId: 'user_1',
        currentMonth,
        draft: validDraft,
        previewToken: token,
      })

      expect(mockTx.insert).toHaveBeenCalledWith(channelPlanAllocations)
    })

    it('7. rejects when allocations were edited after preview without refreshing the token', async () => {
      setupMocks()
      const state = await getGoalCreationState('user_1', currentMonth)
      // Token generated for validDraft (30/20/50)
      const token = createGoalCreationPreviewToken(state!, currentMonth, validDraft)

      // User modified draft to 25/25/50 after preview
      const editedDraft: GoalCreationDraft = {
        ...validDraft,
        allocations: [
          {
            key: 'save:USD',
            fundingMethod: 'save',
            destinationCurrency: 'USD',
            entries: [
              { goalId: 'g1', percentage: '25.00' },
              { goalId: 'g2', percentage: '25.00' },
              { goalId: 'pending-goal', percentage: '50.00' },
            ],
          },
          validDraft.allocations![1],
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
    })

    it('8. rejects before writes when the state token changed with StaleGoalCreationPreviewError', async () => {
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

    it('9. rejects before writes when allocations do not sum to 100%', async () => {
      setupMocks()
      const state = await getGoalCreationState('user_1', currentMonth)

      const badDraft = {
        ...validDraft,
        allocations: [
          {
            key: 'save:USD',
            fundingMethod: 'save' as const,
            destinationCurrency: 'USD' as const,
            entries: [
              { goalId: 'g1', percentage: '30.00' },
              { goalId: 'g2', percentage: '20.00' },
              { goalId: 'pending-goal', percentage: '30.00' }, // 80% != 100%
            ],
          },
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

    it('10. transaction rejection leaves no successful result when database error occurs', async () => {
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

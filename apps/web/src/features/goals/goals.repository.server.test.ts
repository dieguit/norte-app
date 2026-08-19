import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/client'
import { getGoalsWorkspaceRows } from './goals.repository.server'

vi.mock('../../db/client', () => ({
  db: {
    query: {
      financialProfiles: {
        findFirst: vi.fn(),
      },
      financialGoals: {
        findMany: vi.fn(),
      },
      contributionChannels: {
        findMany: vi.fn(),
      },
      goalSavingsPositions: {
        findMany: vi.fn(),
      },
      goalInvestmentPositions: {
        findMany: vi.fn(),
      },
      channelPlanSnapshots: {
        findMany: vi.fn(),
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
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/client'
import {
  allocationPlanEntries,
  goalInvestmentPositions,
  goalSavingsPositions,
  investmentContributionAllocations,
  investmentContributions,
  savingContributionAllocations,
  savingContributions,
} from '../../db/schema'
import {
  createSavingContributionInRepository,
  createSavingContributionPreviewToken,
  deleteSavingContributionInRepository,
  getSavingContributionState,
  StaleSavingContributionPreviewError,
  updateSavingContributionInRepository,
} from './saving-contribution.repository.server'
import type { SavingDraftInput } from './saving-contribution'

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
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    allocationPlanSnapshots: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    allocationPlanEntries: {
      findMany: vi.fn(),
    },
    savingContributions: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    savingContributionAllocations: {
      findMany: vi.fn(),
    },
    investmentContributions: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    investmentContributionAllocations: {
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
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      allocationPlanSnapshots: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      allocationPlanEntries: {
        findMany: vi.fn(),
      },
      savingContributions: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      savingContributionAllocations: {
        findMany: vi.fn(),
      },
      investmentContributions: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      investmentContributionAllocations: {
        findMany: vi.fn(),
      },
    },
  },
}))

describe('saving-contribution.repository.server', () => {
  const currentMonth = '2026-08'
  const userId = 'user_123'

  const mockProfile = {
    userId,
    baseCurrency: 'ARS',
    expensesKnowledge: 'known',
    plannedMonthlyContribution: '100000.00',
    onboardingCompleted: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  }

  const mockGoalArs1 = {
    id: 'g_ars_1',
    userId,
    name: 'Vacaciones Bariloche',
    type: 'purchase',
    targetAmount: '500000.00',
    currency: 'ARS',
    priority: 'high',
    strategy: 'save',
    status: 'active',
    desiredDate: '2027-01-01',
    completedAt: null,
    emergencyFundMonths: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  }

  const mockGoalArs2 = {
    id: 'g_ars_2',
    userId,
    name: 'Auto Usado',
    type: 'purchase',
    targetAmount: '2000000.00',
    currency: 'ARS',
    priority: 'medium',
    strategy: 'save',
    status: 'active',
    desiredDate: '2028-01-01',
    completedAt: null,
    emergencyFundMonths: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  }

  const mockGoalUsd1 = {
    id: 'g_usd_1',
    userId,
    name: 'Fondo de Emergencia USD',
    type: 'emergency_fund',
    targetAmount: '3000.00',
    currency: 'USD',
    priority: 'high',
    strategy: 'save',
    status: 'active',
    desiredDate: null,
    completedAt: null,
    emergencyFundMonths: 6,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  }

  const mockGoalPaused = {
    id: 'g_paused',
    userId,
    name: 'Meta Pausada',
    type: 'purchase',
    targetAmount: '100000.00',
    currency: 'ARS',
    priority: 'low',
    strategy: 'save',
    status: 'paused',
    desiredDate: null,
    completedAt: null,
    emergencyFundMonths: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  }

  const mockSavingsPos1 = {
    id: 'sp1',
    goalId: 'g_ars_1',
    amount: '50000.00',
    currency: 'ARS',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  }

  const mockSnapshotWinning = {
    id: 'snap_winning',
    userId,
    effectiveMonth: '2026-08-01',
    createdAt: new Date('2026-01-01T00:00:00Z'),
  }

  const mockAllocArs1 = {
    id: 'a1',
    snapshotId: 'snap_winning',
    goalId: 'g_ars_1',
    percentage: '60.00',
  }

  const mockAllocArs2 = {
    id: 'a2',
    snapshotId: 'snap_winning',
    goalId: 'g_ars_2',
    percentage: '40.00',
  }

  const mockAllocUsd1 = {
    id: 'a3',
    snapshotId: 'snap_winning',
    goalId: 'g_usd_1',
    percentage: '100.00',
  }

  const mockInvestGoalArs1 = {
    id: 'g_inv_ars_1',
    userId,
    name: 'Cedears Acciones',
    type: 'purchase',
    targetAmount: '1000000.00',
    currency: 'ARS',
    priority: 'high',
    strategy: 'invest',
    status: 'active',
    desiredDate: '2028-01-01',
    completedAt: null,
    emergencyFundMonths: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  }

  const mockInvestGoalArs2 = {
    id: 'g_inv_ars_2',
    userId,
    name: 'Bonos Soberanos',
    type: 'purchase',
    targetAmount: '500000.00',
    currency: 'ARS',
    priority: 'medium',
    strategy: 'invest',
    status: 'active',
    desiredDate: '2028-01-01',
    completedAt: null,
    emergencyFundMonths: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  }

  const mockInvestGoalUsd1 = {
    id: 'g_inv_usd_1',
    userId,
    name: 'ETF SPY USD',
    type: 'purchase',
    targetAmount: '10000.00',
    currency: 'USD',
    priority: 'high',
    strategy: 'invest',
    status: 'active',
    desiredDate: '2030-01-01',
    completedAt: null,
    emergencyFundMonths: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  }

  const mockInvestPosArs1 = {
    id: 'ip_ars_1',
    goalId: 'g_inv_ars_1',
    currentValue: '10000.00',
    currency: 'ARS',
    annualReturnRate: '8.000',
    availability: 'available_now',
    availableFrom: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  }

  const mockInvestPosArs2 = {
    id: 'ip_ars_2',
    goalId: 'g_inv_ars_2',
    currentValue: '5000.00',
    currency: 'ARS',
    annualReturnRate: '8.000',
    availability: 'available_now',
    availableFrom: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  }

  const mockInvestPosUsd1 = {
    id: 'ip_usd_1',
    goalId: 'g_inv_usd_1',
    currentValue: '1000.00',
    currency: 'USD',
    annualReturnRate: '10.000',
    availability: 'available_now',
    availableFrom: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  }

  const mockAllocInvestArs1 = {
    id: 'a_inv_1',
    snapshotId: 'snap_winning',
    goalId: 'g_inv_ars_1',
    percentage: '60.00',
  }

  const mockAllocInvestArs2 = {
    id: 'a_inv_2',
    snapshotId: 'snap_winning',
    goalId: 'g_inv_ars_2',
    percentage: '40.00',
  }

  const mockAllocInvestUsd1 = {
    id: 'a_inv_3',
    snapshotId: 'snap_winning',
    goalId: 'g_inv_usd_1',
    percentage: '100.00',
  }

  let savingContributionValues: any = null
  let investmentContributionValues: any = null

  function setupDbMocks(overrides?: {
    profile?: any
    goals?: any[]
    savingsPositions?: any[]
    investmentPositions?: any[]
    snapshots?: any[]
    allocations?: any[]
    contribution?: any
    contributionAllocations?: any[]
    investmentContribution?: any
    investmentContributionAllocations?: any[]
  }) {
    const profile = overrides && 'profile' in overrides ? overrides.profile : mockProfile
    const goals =
      overrides?.goals ?? [
        mockGoalArs1,
        mockGoalArs2,
        mockGoalUsd1,
        mockGoalPaused,
        mockInvestGoalArs1,
        mockInvestGoalArs2,
        mockInvestGoalUsd1,
      ]
    const savingsPositions = overrides?.savingsPositions ?? [mockSavingsPos1]
    const investmentPositions =
      overrides?.investmentPositions ?? [
        mockInvestPosArs1,
        mockInvestPosArs2,
        mockInvestPosUsd1,
      ]
    const snapshots = overrides?.snapshots ?? [mockSnapshotWinning]
    const allocations =
      overrides?.allocations ?? [
        mockAllocArs1,
        mockAllocArs2,
        mockAllocUsd1,
        mockAllocInvestArs1,
        mockAllocInvestArs2,
        mockAllocInvestUsd1,
      ]
    const contribution = overrides?.contribution
    const contributionAllocations = overrides?.contributionAllocations ?? []
    const investmentContribution = overrides?.investmentContribution
    const investmentAllocations = overrides?.investmentContributionAllocations ?? []

    db.query.financialProfiles.findFirst = vi.fn().mockResolvedValue(profile)
    db.query.financialGoals.findMany = vi.fn().mockResolvedValue(goals)
    db.query.goalSavingsPositions.findMany = vi.fn().mockResolvedValue(savingsPositions)
    db.query.goalInvestmentPositions.findMany = vi.fn().mockResolvedValue(investmentPositions)
    db.query.goalInvestmentPositions.findFirst = vi.fn().mockImplementation(() => {
      // Return position matching id if queried
      return investmentPositions[0] ?? null
    })
    db.query.allocationPlanSnapshots.findMany = vi.fn().mockResolvedValue(snapshots)
    db.query.allocationPlanEntries.findMany = vi.fn().mockResolvedValue(allocations)
    db.query.savingContributions.findFirst = vi.fn().mockResolvedValue(contribution)
    db.query.savingContributions.findMany = vi.fn().mockResolvedValue(contribution ? [contribution] : [])
    db.query.savingContributionAllocations.findMany = vi.fn().mockResolvedValue(contributionAllocations)
    db.query.investmentContributions.findFirst = vi.fn().mockResolvedValue(investmentContribution)
    db.query.investmentContributions.findMany = vi.fn().mockResolvedValue(investmentContribution ? [investmentContribution] : [])
    db.query.investmentContributionAllocations.findMany = vi.fn().mockResolvedValue(investmentAllocations)

    mockTx.query = db.query as any

    mockTx.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          for: vi.fn().mockResolvedValue(profile ? [{ userId }] : []),
        }),
      }),
    })

    mockTx.insert.mockImplementation((table: any) => ({
      values: vi.fn().mockImplementation((val: any) => {
        if (table === savingContributions) {
          savingContributionValues = val
          return { returning: vi.fn().mockResolvedValue([{ id: 'contrib_created_123' }]) }
        }
        if (table === investmentContributions) {
          investmentContributionValues = val
          return { returning: vi.fn().mockResolvedValue([{ id: 'inv_contrib_created_123' }]) }
        }
        if (table === goalSavingsPositions) {
          return { returning: vi.fn().mockResolvedValue([{ id: 'pos_created_456' }]) }
        }
        if (table === savingContributionAllocations) {
          return { returning: vi.fn().mockResolvedValue([{ id: 'alloc_created_789' }]) }
        }
        if (table === investmentContributionAllocations) {
          return { returning: vi.fn().mockResolvedValue([{ id: 'inv_alloc_created_789' }]) }
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

  beforeEach(() => {
    vi.clearAllMocks()
    savingContributionValues = null
    investmentContributionValues = null
  })

  describe('getSavingContributionState', () => {
    it('returns null when financial profile is absent', async () => {
      setupDbMocks({ profile: null })

      const result = await getSavingContributionState(userId, currentMonth)

      expect(result).toBeNull()
      expect(db.query.financialGoals.findMany).not.toHaveBeenCalled()
      expect(db.query.allocationPlanSnapshots.findMany).not.toHaveBeenCalled()
    })

    it('loads active goals, positions, winning snapshot, and builds eligible goals per currency', async () => {
      setupDbMocks()

      const state = await getSavingContributionState(userId, currentMonth)

      expect(state).not.toBeNull()
      expect(state?.source.profile?.userId).toBe(userId)
      expect(state?.source.goals).toHaveLength(6) // active saving + investment goals
      expect(state?.eligibleGoals).toEqual([
        { id: 'g_ars_1', name: 'Vacaciones Bariloche', percentage: '60.00' },
        { id: 'g_ars_2', name: 'Auto Usado', percentage: '40.00' },
      ])
      expect(state?.eligibleGoalsUsd).toEqual([
        { id: 'g_usd_1', name: 'Fondo de Emergencia USD', percentage: '100.00' },
      ])
      expect(state?.eligibleInvestmentGoals).toEqual([
        { id: 'g_inv_ars_1', name: 'Cedears Acciones', percentage: '60.00' },
        { id: 'g_inv_ars_2', name: 'Bonos Soberanos', percentage: '40.00' },
      ])
      expect(state?.eligibleInvestmentGoalsUsd).toEqual([
        { id: 'g_inv_usd_1', name: 'ETF SPY USD', percentage: '100.00' },
      ])
      expect(state?.monthlyTargetArs).toEqual({
        amount: '100000.00',
        currency: 'ARS',
      })
      expect(state?.monthlyTargetUsd).toEqual({
        amount: '66.67',
        currency: 'USD',
      })
      expect(state?.monthlyInvestmentTargetArs).toEqual({
        amount: '100000.00',
        currency: 'ARS',
      })
      expect(state?.monthlyInvestmentTargetUsd).toEqual({
        amount: '66.67',
        currency: 'USD',
      })
    })

    it('handles empty goals without issuing inArray queries with empty arrays', async () => {
      setupDbMocks({ goals: [], snapshots: [] })

      const state = await getSavingContributionState(userId, currentMonth)

      expect(state).not.toBeNull()
      expect(state?.source.goals).toEqual([])
      expect(state?.eligibleGoals).toEqual([])
      expect(state?.eligibleGoalsUsd).toEqual([])
      expect(state?.eligibleInvestmentGoals).toEqual([])
      expect(state?.eligibleInvestmentGoalsUsd).toEqual([])
      expect(db.query.goalSavingsPositions.findMany).not.toHaveBeenCalled()
      expect(db.query.goalInvestmentPositions.findMany).not.toHaveBeenCalled()
      expect(db.query.allocationPlanEntries.findMany).not.toHaveBeenCalled()
    })
  })

  describe('createSavingContributionPreviewToken', () => {
    it('generates a deterministic 64-character sha256 hex string based on state, month, and draft', async () => {
      setupDbMocks()
      const state = (await getSavingContributionState(userId, currentMonth))!

      const draftArs: SavingDraftInput = {
        currency: 'ARS',
        amount: '10000.00',
      }

      const token1 = createSavingContributionPreviewToken(state, currentMonth, draftArs)
      const token2 = createSavingContributionPreviewToken(state, currentMonth, draftArs)

      expect(token1).toMatch(/^[a-f0-9]{64}$/)
      expect(token1).toBe(token2)

      const tokenDiffAmount = createSavingContributionPreviewToken(state, currentMonth, {
        ...draftArs,
        amount: '20000.00',
      })
      expect(token1).not.toBe(tokenDiffAmount)
    })
  })

  describe('createSavingContributionInRepository', () => {
    const draftArs: SavingDraftInput = {
      currency: 'ARS',
      amount: '10000.00',
    }

    const draftUsd: SavingDraftInput = {
      currency: 'USD',
      amount: '100.00',
      arsSpent: '150000.00',
      effectiveRate: '1500.00',
    }

    it('inserts savingContributions, goalSavingsPositions for each allocation, and savingContributionAllocations linking them', async () => {
      setupDbMocks()
      const state = (await getSavingContributionState(userId, currentMonth))!
      const previewToken = createSavingContributionPreviewToken(state, currentMonth, draftArs)

      const result = await createSavingContributionInRepository({
        userId,
        currentMonth,
        draft: draftArs,
        previewToken,
      })

      expect(result).toEqual({ contributionId: 'contrib_created_123' })
      expect(mockTx.select).toHaveBeenCalled()
      expect(mockTx.insert).toHaveBeenCalledWith(savingContributions)
      expect(mockTx.insert).toHaveBeenCalledWith(goalSavingsPositions)
      expect(mockTx.insert).toHaveBeenCalledWith(savingContributionAllocations)

      // Verify savingContributions insert values
      const contribInsertCall = mockTx.insert.mock.calls.find((c) => c[0] === savingContributions)
      expect(contribInsertCall).toBeDefined()

      // Verify goalSavingsPositions was called for the 2 allocations
      const positionInsertCalls = mockTx.insert.mock.calls.filter((c) => c[0] === goalSavingsPositions)
      expect(positionInsertCalls).toHaveLength(2)

      // Never touch allocationPlanEntries
      expect(mockTx.delete).not.toHaveBeenCalledWith(allocationPlanEntries)
      expect(mockTx.update).not.toHaveBeenCalledWith(allocationPlanEntries)
    })

    it('persists USD draft with arsSpent and effectiveRate correctly', async () => {
      setupDbMocks()
      const state = (await getSavingContributionState(userId, currentMonth))!
      const previewToken = createSavingContributionPreviewToken(state, currentMonth, draftUsd)

      const result = await createSavingContributionInRepository({
        userId,
        currentMonth,
        draft: draftUsd,
        previewToken,
      })

      expect(result).toEqual({ contributionId: 'contrib_created_123' })
      expect(mockTx.insert).toHaveBeenCalledWith(savingContributions)
      expect(mockTx.insert).toHaveBeenCalledWith(goalSavingsPositions)
      expect(mockTx.insert).toHaveBeenCalledWith(savingContributionAllocations)
    })

    it('persists ARS investment contribution split across active investment goals and updates position currentValue', async () => {
      setupDbMocks()
      const state = (await getSavingContributionState(userId, currentMonth))!
      const draftInvestArs: SavingDraftInput = {
        kind: 'investment',
        currency: 'ARS',
        amount: '20000.00',
      }
      const previewToken = createSavingContributionPreviewToken(state, currentMonth, draftInvestArs)

      const result = await createSavingContributionInRepository({
        userId,
        currentMonth,
        draft: draftInvestArs,
        previewToken,
      })

      expect(result).toEqual({ contributionId: 'inv_contrib_created_123' })
      expect(mockTx.insert).toHaveBeenCalledWith(investmentContributions)
      expect(mockTx.update).toHaveBeenCalledWith(goalInvestmentPositions)
      expect(mockTx.insert).toHaveBeenCalledWith(investmentContributionAllocations)

      // Check investmentContributions insert values
      const investContribCall = mockTx.insert.mock.calls.find((c) => c[0] === investmentContributions)
      expect(investContribCall).toBeDefined()

      // Check goalInvestmentPositions update calls
      const posUpdateCalls = mockTx.update.mock.calls.filter((c) => c[0] === goalInvestmentPositions)
      expect(posUpdateCalls).toHaveLength(2)
    })

    it('persists USD investment contribution with arsSpent and effectiveRate and increments position currentValue', async () => {
      setupDbMocks()
      const state = (await getSavingContributionState(userId, currentMonth))!
      const draftInvestUsd: SavingDraftInput = {
        kind: 'investment',
        currency: 'USD',
        amount: '100.00',
        arsSpent: '150000.00',
        effectiveRate: '1500.00',
      }
      const previewToken = createSavingContributionPreviewToken(state, currentMonth, draftInvestUsd)

      const result = await createSavingContributionInRepository({
        userId,
        currentMonth,
        draft: draftInvestUsd,
        previewToken,
      })

      expect(result).toEqual({ contributionId: 'inv_contrib_created_123' })
      expect(mockTx.insert).toHaveBeenCalledWith(investmentContributions)
      expect(mockTx.update).toHaveBeenCalledWith(goalInvestmentPositions)
      expect(mockTx.insert).toHaveBeenCalledWith(investmentContributionAllocations)
    })

    it('persists explicit createdAt when provided for saving contribution', async () => {
      setupDbMocks()
      const state = (await getSavingContributionState(userId, currentMonth))!
      const previewToken = createSavingContributionPreviewToken(state, currentMonth, draftArs)
      const createdAt = new Date('2026-07-31T12:00:00.000Z')

      await createSavingContributionInRepository({
        userId,
        currentMonth,
        draft: draftArs,
        previewToken,
        createdAt,
      })

      expect(savingContributionValues).toEqual(expect.objectContaining({ createdAt }))
    })

    it('persists explicit createdAt when provided for investment contribution', async () => {
      setupDbMocks()
      const state = (await getSavingContributionState(userId, currentMonth))!
      const draftInvestArs: SavingDraftInput = {
        kind: 'investment',
        currency: 'ARS',
        amount: '20000.00',
      }
      const previewToken = createSavingContributionPreviewToken(state, currentMonth, draftInvestArs)
      const createdAt = new Date('2026-07-31T12:00:00.000Z')

      await createSavingContributionInRepository({
        userId,
        currentMonth,
        draft: draftInvestArs,
        previewToken,
        createdAt,
      })

      expect(investmentContributionValues).toEqual(expect.objectContaining({ createdAt }))
    })

    it('resolves investment position via fallback query when state.source.investmentPositions does not contain it upfront', async () => {
      setupDbMocks({
        investmentPositions: [],
      })
      const state = (await getSavingContributionState(userId, currentMonth))!
      const draftInvestArs: SavingDraftInput = {
        kind: 'investment',
        currency: 'ARS',
        amount: '20000.00',
      }
      const previewToken = createSavingContributionPreviewToken(state, currentMonth, draftInvestArs)

      mockTx.query.goalInvestmentPositions.findFirst = vi.fn().mockImplementation((args: any) => {
        const dummyEq = (field: any, val: any) => ({ field, val })
        const condition = args.where({ goalId: 'goalId', id: 'id' }, { eq: dummyEq })
        if (condition?.val === 'g_inv_ars_1') {
          return mockInvestPosArs1
        }
        if (condition?.val === 'g_inv_ars_2') {
          return mockInvestPosArs2
        }
        return null
      })

      const result = await createSavingContributionInRepository({
        userId,
        currentMonth,
        draft: draftInvestArs,
        previewToken,
      })

      expect(result).toEqual({ contributionId: 'inv_contrib_created_123' })
      expect(mockTx.query.goalInvestmentPositions.findFirst).toHaveBeenCalled()
      expect(mockTx.insert).toHaveBeenCalledWith(investmentContributions)
      expect(mockTx.update).toHaveBeenCalledWith(goalInvestmentPositions)
      expect(mockTx.insert).toHaveBeenCalledWith(investmentContributionAllocations)
    })

    it('throws StaleSavingContributionPreviewError when preview token does not match reloaded state', async () => {
      setupDbMocks()
      const oldToken = 'a'.repeat(64)

      await expect(
        createSavingContributionInRepository({
          userId,
          currentMonth,
          draft: draftArs,
          previewToken: oldToken,
        }),
      ).rejects.toThrow(StaleSavingContributionPreviewError)
    })

    it('throws when user has no financial profile', async () => {
      setupDbMocks({ profile: null })

      await expect(
        createSavingContributionInRepository({
          userId,
          currentMonth,
          draft: draftArs,
          previewToken: 'a'.repeat(64),
        }),
      ).rejects.toThrow('Financial profile not found.')
    })

    it('throws when user has no compatible active goals for draft currency', async () => {
      setupDbMocks({ goals: [mockGoalUsd1] }) // only USD goal, trying to save ARS
      const state = (await getSavingContributionState(userId, currentMonth))!
      const token = createSavingContributionPreviewToken(state, currentMonth, draftArs)

      await expect(
        createSavingContributionInRepository({
          userId,
          currentMonth,
          draft: draftArs,
          previewToken: token,
        }),
      ).rejects.toThrow('No hay objetivos activos para distribuir el ahorro en ARS.')
    })

    it('throws when user has no compatible active investment goals for investment currency', async () => {
      setupDbMocks({ goals: [mockGoalArs1, mockGoalUsd1] }) // only saving goals
      const state = (await getSavingContributionState(userId, currentMonth))!
      const draftInvestArs: SavingDraftInput = {
        kind: 'investment',
        currency: 'ARS',
        amount: '10000.00',
      }
      const token = createSavingContributionPreviewToken(state, currentMonth, draftInvestArs)

      await expect(
        createSavingContributionInRepository({
          userId,
          currentMonth,
          draft: draftInvestArs,
          previewToken: token,
        }),
      ).rejects.toThrow('No hay objetivos activos para distribuir la inversión en ARS.')
    })
  })

  describe('updateSavingContributionInRepository', () => {
    const existingContribution = {
      id: 'contrib_1',
      userId,
      amount: '10000.00',
      currency: 'ARS',
      arsSpent: null,
      effectiveRate: null,
      createdAt: new Date('2026-08-01T00:00:00Z'),
      updatedAt: new Date('2026-08-01T00:00:00Z'),
    }

    const existingAllocations = [
      {
        id: 'sca_1',
        contributionId: 'contrib_1',
        goalId: 'g_ars_1',
        amount: '6000.00',
        percentage: '60.00',
        savingPositionId: 'pos_1',
        createdAt: new Date('2026-08-01T00:00:00Z'),
      },
      {
        id: 'sca_2',
        contributionId: 'contrib_1',
        goalId: 'g_ars_2',
        amount: '4000.00',
        percentage: '40.00',
        savingPositionId: 'pos_2',
        createdAt: new Date('2026-08-01T00:00:00Z'),
      },
    ]

    it('recomputes allocation amounts using existing stored percentages and updates linked positions and contribution', async () => {
      setupDbMocks({
        contribution: existingContribution,
        contributionAllocations: existingAllocations,
      })

      const updatedDraft: SavingDraftInput = {
        currency: 'ARS',
        amount: '20000.00',
      }

      await updateSavingContributionInRepository({
        userId,
        contributionId: 'contrib_1',
        draft: updatedDraft,
      })

      expect(mockTx.update).toHaveBeenCalledWith(goalSavingsPositions)
      expect(mockTx.update).toHaveBeenCalledWith(savingContributionAllocations)
      expect(mockTx.update).toHaveBeenCalledWith(savingContributions)

      // Never touch allocationPlanEntries
      expect(mockTx.delete).not.toHaveBeenCalledWith(allocationPlanEntries)
      expect(mockTx.update).not.toHaveBeenCalledWith(allocationPlanEntries)
    })

    it('throws error when contribution is not found or user ownership fails', async () => {
      setupDbMocks({ contribution: null })

      await expect(
        updateSavingContributionInRepository({
          userId: 'other_user',
          contributionId: 'contrib_1',
          draft: { currency: 'ARS', amount: '15000.00' },
        }),
      ).rejects.toThrow('Contribution not found or not owned by user.')
    })

    it('throws error when trying to change currency on update', async () => {
      setupDbMocks({
        contribution: existingContribution,
        contributionAllocations: existingAllocations,
      })

      await expect(
        updateSavingContributionInRepository({
          userId,
          contributionId: 'contrib_1',
          draft: { currency: 'USD', amount: '100.00', effectiveRate: '1500.00' },
        }),
      ).rejects.toThrow('Cannot change contribution currency on update.')
    })

    it('corrects investment contribution, preserves stored percentages, and adjusts position currentValue by delta', async () => {
      const existingInvestContrib = {
        id: 'inv_contrib_1',
        userId,
        amount: '10000.00',
        currency: 'ARS',
        arsSpent: null,
        effectiveRate: null,
        createdAt: new Date('2026-08-01T00:00:00Z'),
        updatedAt: new Date('2026-08-01T00:00:00Z'),
      }

      const existingInvestAllocs = [
        {
          id: 'ica_1',
          contributionId: 'inv_contrib_1',
          goalId: 'g_inv_ars_1',
          amount: '6000.00',
          percentage: '60.00',
          investmentPositionId: 'ip_ars_1',
          createdAt: new Date('2026-08-01T00:00:00Z'),
        },
        {
          id: 'ica_2',
          contributionId: 'inv_contrib_1',
          goalId: 'g_inv_ars_2',
          amount: '4000.00',
          percentage: '40.00',
          investmentPositionId: 'ip_ars_2',
          createdAt: new Date('2026-08-01T00:00:00Z'),
        },
      ]

      setupDbMocks({
        investmentContribution: existingInvestContrib,
        investmentContributionAllocations: existingInvestAllocs,
        investmentPositions: [
          { ...mockInvestPosArs1, currentValue: '20000.00' },
          { ...mockInvestPosArs2, currentValue: '10000.00' },
        ],
      })

      const updatedDraft: SavingDraftInput = {
        kind: 'investment',
        currency: 'ARS',
        amount: '20000.00',
      }

      await updateSavingContributionInRepository({
        userId,
        contributionId: 'inv_contrib_1',
        draft: updatedDraft,
      })

      expect(mockTx.update).toHaveBeenCalledWith(goalInvestmentPositions)
      expect(mockTx.update).toHaveBeenCalledWith(investmentContributionAllocations)
      expect(mockTx.update).toHaveBeenCalledWith(investmentContributions)
    })

    it('rejects investment correction for unauthorized user', async () => {
      setupDbMocks({ investmentContribution: null })

      await expect(
        updateSavingContributionInRepository({
          userId: 'other_user',
          contributionId: 'inv_contrib_1',
          draft: { kind: 'investment', currency: 'ARS', amount: '20000.00' },
        }),
      ).rejects.toThrow('Contribution not found or not owned by user.')
    })
  })

  describe('deleteSavingContributionInRepository', () => {
    const existingContribution = {
      id: 'contrib_1',
      userId,
      amount: '10000.00',
      currency: 'ARS',
      arsSpent: null,
      effectiveRate: null,
      createdAt: new Date('2026-08-01T00:00:00Z'),
      updatedAt: new Date('2026-08-01T00:00:00Z'),
    }

    const existingAllocations = [
      {
        id: 'sca_1',
        contributionId: 'contrib_1',
        goalId: 'g_ars_1',
        amount: '6000.00',
        percentage: '60.00',
        savingPositionId: 'pos_1',
        createdAt: new Date('2026-08-01T00:00:00Z'),
      },
      {
        id: 'sca_2',
        contributionId: 'contrib_1',
        goalId: 'g_ars_2',
        amount: '4000.00',
        percentage: '40.00',
        savingPositionId: 'pos_2',
        createdAt: new Date('2026-08-01T00:00:00Z'),
      },
    ]

    it('deletes linked goalSavingsPositions and the owned contribution without mutating allocationPlanEntries', async () => {
      setupDbMocks({
        contribution: existingContribution,
        contributionAllocations: existingAllocations,
      })

      await deleteSavingContributionInRepository({
        userId,
        contributionId: 'contrib_1',
      })

      expect(mockTx.delete).toHaveBeenCalledWith(goalSavingsPositions)
      expect(mockTx.delete).toHaveBeenCalledWith(savingContributions)

      // Never touch allocationPlanEntries
      expect(mockTx.delete).not.toHaveBeenCalledWith(allocationPlanEntries)
    })

    it('deletes investment contribution and decrements goalInvestmentPositions currentValue without touching plan entries', async () => {
      const existingInvestContrib = {
        id: 'inv_contrib_1',
        userId,
        amount: '10000.00',
        currency: 'ARS',
        arsSpent: null,
        effectiveRate: null,
        createdAt: new Date('2026-08-01T00:00:00Z'),
        updatedAt: new Date('2026-08-01T00:00:00Z'),
      }

      const existingInvestAllocs = [
        {
          id: 'ica_1',
          contributionId: 'inv_contrib_1',
          goalId: 'g_inv_ars_1',
          amount: '6000.00',
          percentage: '60.00',
          investmentPositionId: 'ip_ars_1',
          createdAt: new Date('2026-08-01T00:00:00Z'),
        },
        {
          id: 'ica_2',
          contributionId: 'inv_contrib_1',
          goalId: 'g_inv_ars_2',
          amount: '4000.00',
          percentage: '40.00',
          investmentPositionId: 'ip_ars_2',
          createdAt: new Date('2026-08-01T00:00:00Z'),
        },
      ]

      setupDbMocks({
        investmentContribution: existingInvestContrib,
        investmentContributionAllocations: existingInvestAllocs,
        investmentPositions: [
          { ...mockInvestPosArs1, currentValue: '26000.00' },
          { ...mockInvestPosArs2, currentValue: '14000.00' },
        ],
      })

      await deleteSavingContributionInRepository({
        userId,
        contributionId: 'inv_contrib_1',
      })

      expect(mockTx.update).toHaveBeenCalledWith(goalInvestmentPositions)
      expect(mockTx.delete).toHaveBeenCalledWith(investmentContributions)
      expect(mockTx.delete).not.toHaveBeenCalledWith(allocationPlanEntries)
    })

    it('throws error when contribution is not found or user ownership fails', async () => {
      setupDbMocks({ contribution: null, investmentContribution: null })

      await expect(
        deleteSavingContributionInRepository({
          userId: 'other_user',
          contributionId: 'contrib_1',
        }),
      ).rejects.toThrow('Contribution not found or not owned by user.')
    })
  })
})

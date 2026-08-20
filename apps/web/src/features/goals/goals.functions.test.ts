import { beforeEach, describe, expect, it, vi } from 'vitest'
import { auth } from '@clerk/tanstack-react-start/server'
import {
  confirmGoalCreation,
  getGoalCreationContext,
  getGoalsWorkspace,
  previewGoalCreation,
} from './goals.functions'
import {
  confirmGoalCreationInRepository,
  createGoalCreationPreviewToken,
  getGoalCreationState,
  getGoalsWorkspaceRows,
  StaleGoalCreationPreviewError,
} from './goals.repository.server'
import { buildGoalCreationProposal, type GoalCreationState } from './goal-creation'
import type { GoalCreationDraft } from './goal-creation.schema'

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

vi.mock('./goals.repository.server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./goals.repository.server')>()
  return {
    ...actual,
    getGoalsWorkspaceRows: vi.fn(),
    getGoalCreationState: vi.fn(),
    confirmGoalCreationInRepository: vi.fn(),
    mapRowsToGoalsWorkspaceSource: vi.fn().mockImplementation((rows) => ({
      profile: {
        userId: rows.profile.userId,
        baseCurrency: rows.profile.baseCurrency,
        approximateMonthlyIncome: rows.profile.approximateMonthlyIncome,
        approximateMonthlyExpenses: rows.profile.approximateMonthlyExpenses,
        expensesKnowledge: rows.profile.expensesKnowledge,
        plannedMonthlyContribution: rows.profile.plannedMonthlyContribution,
        onboardingCompleted: rows.profile.onboardingCompleted,
      },
      goals: rows.goals.map((g: any) => ({
        ...g,
        createdAt: g.createdAt instanceof Date ? g.createdAt.toISOString() : String(g.createdAt),
        completedAt: g.completedAt instanceof Date ? g.completedAt.toISOString() : g.completedAt ?? null,
      })),
      savingsPositions: rows.savingsPositions,
      investmentPositions: rows.investmentPositions,
      snapshots: rows.snapshots,
      allocations: rows.allocations,
    })),
  }
})

describe('getGoalsWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to /sign-in/$ when user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: false, userId: null } as never)

    await expect(getGoalsWorkspace()).rejects.toMatchObject({
      options: expect.objectContaining({ to: '/sign-in/$' }),
    })
  })

  it('passes the authenticated userId and UTC YYYY-MM to the repository and returns missing profile state', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)
    vi.mocked(getGoalsWorkspaceRows).mockResolvedValue(null)

    const result = await getGoalsWorkspace()

    expect(getGoalsWorkspaceRows).toHaveBeenCalledWith('user_456', '2026-08')
    expect(result).toEqual({ profile: 'missing' })

    vi.useRealTimers()
  })

  it('assembles and returns the goals workspace when profile is present', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)

    const mockRows = {
      profile: {
        userId: 'user_456',
        baseCurrency: 'ARS',
        approximateMonthlyIncome: '1000000.00',
        approximateMonthlyExpenses: '500000.00',
        expensesKnowledge: 'known',
        plannedMonthlyContribution: '60000.00',
        onboardingCompleted: true,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      },
      goals: [
        {
          id: 'g1',
          userId: 'user_456',
          name: 'Reserva',
          type: 'emergency_fund',
          targetAmount: '2000.00',
          currency: 'USD',
          priority: 'high',
          strategy: 'save',
          status: 'active',
          desiredDate: null,
          completedAt: null,
          emergencyFundMonths: 6,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
        },
      ],
      savingsPositions: [
        {
          id: 'sp1',
          goalId: 'g1',
          amount: '500.00',
          currency: 'USD',
          location: null,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
        },
      ],
      investmentPositions: [],
      snapshots: [
        {
          id: 's1',
          userId: 'user_456',
          effectiveMonth: '2026-08-01',
          createdAt: new Date('2026-01-01T00:00:00Z'),
        },
      ],
      allocations: [
        {
          id: 'a1',
          snapshotId: 's1',
          goalId: 'g1',
          percentage: '100.00',
        },
      ],
    }

    vi.mocked(getGoalsWorkspaceRows).mockResolvedValue(mockRows as never)

    const result = await getGoalsWorkspace()

    expect(getGoalsWorkspaceRows).toHaveBeenCalledWith('user_456', '2026-08')
    expect(result).toMatchObject({
      profile: 'present',
      workspace: {
        groups: [
          {
            status: 'active',
            goals: [
              expect.objectContaining({
                id: 'g1',
                name: 'Reserva',
                actualValue: { amount: '500.00', currency: 'USD' },
              }),
            ],
          },
          { status: 'paused', goals: [] },
          { status: 'completed', goals: [] },
        ],
      },
    })

    vi.useRealTimers()
  })
})

describe('getGoalCreationContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to /sign-in/$ when user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: false, userId: null } as never)

    await expect(getGoalCreationContext()).rejects.toMatchObject({
      options: expect.objectContaining({ to: '/sign-in/$' }),
    })
  })

  it('passes authenticated userId and UTC YYYY-MM to repository and returns missing profile state', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)
    vi.mocked(getGoalCreationState).mockResolvedValue(null)

    const result = await getGoalCreationContext()

    expect(getGoalCreationState).toHaveBeenCalledWith('user_456', '2026-08')
    expect(result).toEqual({ profile: 'missing' })

    vi.useRealTimers()
  })

  it('returns present profile state with route-safe goal creation context and planned contribution', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)

    const mockState: GoalCreationState = {
      source: {
        profile: {
          userId: 'user_456',
          baseCurrency: 'ARS',
          approximateMonthlyIncome: '1000000.00',
          approximateMonthlyExpenses: '500000.00',
          expensesKnowledge: 'known',
          plannedMonthlyContribution: '60000.00',
          onboardingCompleted: true,
        },
        goals: [
          {
            id: 'g1',
            userId: 'user_456',
            name: 'Reserva',
            type: 'emergency_fund',
            targetAmount: '2000.00',
            currency: 'USD',
            priority: 'high',
            strategy: 'save',
            status: 'active',
            desiredDate: null,
            completedAt: null,
            emergencyFundMonths: 6,
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        savingsPositions: [
          { id: 'sp1', goalId: 'g1', amount: '500.00', currency: 'USD', location: null },
        ],
        investmentPositions: [],
        snapshots: [
          {
            id: 's1',
            userId: 'user_456',
            effectiveMonth: '2026-08-01',
          },
        ],
        allocations: [
          {
            id: 'a1',
            snapshotId: 's1',
            goalId: 'g1',
            percentage: '100.00',
          },
        ],
      },
      pendingSnapshots: [
        {
          id: 's1_next',
          userId: 'user_456',
          effectiveMonth: '2026-09-01',
        },
      ],
      pendingAllocations: [
        {
          id: 'a1_next',
          snapshotId: 's1_next',
          goalId: 'g1',
          percentage: '100.00',
        },
      ],
    }

    vi.mocked(getGoalCreationState).mockResolvedValue(mockState)

    const result = await getGoalCreationContext()

    expect(getGoalCreationState).toHaveBeenCalledWith('user_456', '2026-08')
    expect(result).toEqual({
      profile: 'present',
      context: {
        currentMonth: '2026-08',
        expensesKnowledge: 'known',
        hasEmergencyFund: true,
        plannedMonthlyContribution: { amount: '60000.00', currency: 'ARS' },
        currentAllocation: {
          effectiveMonth: '2026-08-01',
          entries: [
            { goalId: 'g1', percentage: '100.00' },
          ],
        },
      },
    })

    expect((result as any).context.source).toBeUndefined()
    expect((result as any).context.savingsPositions).toBeUndefined()
    expect((result as any).context.snapshots).toBeUndefined()
    expect((result as any).context.fundingOptions).toBeUndefined()

    vi.useRealTimers()
  })
})

describe('previewGoalCreation', () => {
  const validDraft: GoalCreationDraft = {
    type: 'purchase',
    name: 'Viaje al sur',
    targetAmount: '2000.00',
    currency: 'USD',
    desiredMonth: '2027-01',
    priority: 'medium',
    strategy: 'save',
    annualReturnRate: '',
    availability: 'available_now',
    availableFromMonth: '',
    allocations: [
      { goalId: 'g1', percentage: '40.00' },
      { goalId: 'pending-goal', percentage: '60.00' },
    ],
  }

  const mockState: GoalCreationState = {
    source: {
      profile: {
        userId: 'user_456',
        baseCurrency: 'ARS',
        approximateMonthlyIncome: '1000000.00',
        approximateMonthlyExpenses: '500000.00',
        expensesKnowledge: 'known',
        plannedMonthlyContribution: '60000.00',
        onboardingCompleted: true,
      },
      goals: [
        {
          id: 'g1',
          userId: 'user_456',
          name: 'Reserva',
          type: 'emergency_fund',
          targetAmount: '2000.00',
          currency: 'USD',
          priority: 'high',
          strategy: 'save',
          status: 'active',
          desiredDate: null,
          completedAt: null,
          emergencyFundMonths: 6,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      savingsPositions: [
        { id: 'sp1', goalId: 'g1', amount: '500.00', currency: 'USD', location: null },
      ],
      investmentPositions: [],
      snapshots: [
        {
          id: 's1',
          userId: 'user_456',
          effectiveMonth: '2026-08-01',
        },
      ],
      allocations: [
        {
          id: 'a1',
          snapshotId: 's1',
          goalId: 'g1',
          percentage: '100.00',
        },
      ],
    },
    pendingSnapshots: [],
    pendingAllocations: [],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to /sign-in/$ when user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: false, userId: null } as never)

    await expect(previewGoalCreation({ data: validDraft })).rejects.toMatchObject({
      options: expect.objectContaining({ to: '/sign-in/$' }),
    })
  })

  it('throws when financial profile is missing', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)
    vi.mocked(getGoalCreationState).mockResolvedValue(null)

    await expect(previewGoalCreation({ data: validDraft })).rejects.toThrow(
      'Completá tu perfil financiero antes de crear un objetivo.',
    )

    vi.useRealTimers()
  })

  it('rejects invalid draft input through validator / schema rejection', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)
    vi.mocked(getGoalCreationState).mockResolvedValue(mockState)

    const invalidDraft = {
      ...validDraft,
      allocations: [
        { goalId: 'g1', percentage: '30.00' },
        { goalId: 'pending-goal', percentage: '50.00' },
      ],
    }

    await expect(previewGoalCreation({ data: invalidDraft })).rejects.toThrow()

    vi.useRealTimers()
  })

  it('returns read-only proposal and a 64-character preview token without persisting data', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)
    vi.mocked(getGoalCreationState).mockResolvedValue(mockState)

    const result = await previewGoalCreation({ data: validDraft })

    expect(getGoalCreationState).toHaveBeenCalledWith('user_456', '2026-08')
    expect(result.previewToken).toMatch(/^[a-f0-9]{64}$/)
    expect(result.proposal.normalizedGoal.name).toBe('Viaje al sur')
    expect(result.proposal.normalizedGoal.type).toBe('purchase')
    expect(result.proposal.normalizedGoal.targetAmount).toEqual({
      amount: '2000.00',
      currency: 'USD',
    })
    expect(result.proposal.allocation.entries).toHaveLength(2)
    expect(result.proposal.impacts).toHaveLength(2)

    vi.useRealTimers()
  })
})

describe('confirmGoalCreation', () => {
  const currentMonth = '2026-08'
  const validToken = 'a'.repeat(64)
  const staleToken = 'b'.repeat(64)

  const validDraft: GoalCreationDraft = {
    type: 'purchase',
    name: 'Viaje al sur',
    targetAmount: '2000.00',
    currency: 'USD',
    desiredMonth: '2027-01',
    priority: 'medium',
    strategy: 'save',
    annualReturnRate: '',
    availability: 'available_now',
    availableFromMonth: '',
    allocations: [
      { goalId: 'g1', percentage: '40.00' },
      { goalId: 'pending-goal', percentage: '60.00' },
    ],
  }

  const mockState: GoalCreationState = {
    source: {
      profile: {
        userId: 'user_456',
        baseCurrency: 'ARS',
        approximateMonthlyIncome: '1000000.00',
        approximateMonthlyExpenses: '500000.00',
        expensesKnowledge: 'known',
        plannedMonthlyContribution: '60000.00',
        onboardingCompleted: true,
      },
      goals: [
        {
          id: 'g1',
          userId: 'user_456',
          name: 'Reserva',
          type: 'emergency_fund',
          targetAmount: '2000.00',
          currency: 'USD',
          priority: 'high',
          strategy: 'save',
          status: 'active',
          desiredDate: null,
          completedAt: null,
          emergencyFundMonths: 6,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      savingsPositions: [
        { id: 'sp1', goalId: 'g1', amount: '500.00', currency: 'USD', location: null },
      ],
      investmentPositions: [],
      snapshots: [
        {
          id: 's1',
          userId: 'user_456',
          effectiveMonth: '2026-08-01',
        },
      ],
      allocations: [
        {
          id: 'a1',
          snapshotId: 's1',
          goalId: 'g1',
          percentage: '100.00',
        },
      ],
    },
    pendingSnapshots: [],
    pendingAllocations: [],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to /sign-in/$ when user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: false, userId: null } as never)

    await expect(
      confirmGoalCreation({ data: { draft: validDraft, previewToken: validToken } }),
    ).rejects.toMatchObject({
      options: expect.objectContaining({ to: '/sign-in/$' }),
    })
  })

  it('rejects invalid payload or malformed previewToken through validator schema', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)

    await expect(
      confirmGoalCreation({ data: { draft: validDraft, previewToken: 'short_token' } }),
    ).rejects.toThrow()

    vi.useRealTimers()
  })

  it('returns created status with goalId on successful confirmation in repository', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)
    vi.mocked(confirmGoalCreationInRepository).mockResolvedValue({ goalId: 'goal-new-123' })

    const result = await confirmGoalCreation({
      data: { draft: validDraft, previewToken: validToken },
    })

    expect(confirmGoalCreationInRepository).toHaveBeenCalledWith({
      userId: 'user_456',
      currentMonth: '2026-08',
      draft: expect.objectContaining({ name: 'Viaje al sur' }),
      previewToken: validToken,
    })
    expect(result).toEqual({
      status: 'created',
      goalId: 'goal-new-123',
    })

    vi.useRealTimers()
  })

  it('returns stale status with refreshed preview when repository throws StaleGoalCreationPreviewError', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)

    const refreshedProposal = buildGoalCreationProposal({
      draft: validDraft,
      state: mockState,
      currentMonth,
    })
    const refreshedToken = createGoalCreationPreviewToken(mockState, currentMonth)
    const staleError = new StaleGoalCreationPreviewError({
      proposal: refreshedProposal,
      previewToken: refreshedToken,
    })

    vi.mocked(confirmGoalCreationInRepository).mockRejectedValue(staleError)

    const result = await confirmGoalCreation({
      data: { draft: validDraft, previewToken: staleToken },
    })

    expect(result).toEqual({
      status: 'stale',
      preview: {
        proposal: refreshedProposal,
        previewToken: refreshedToken,
      },
    })

    vi.useRealTimers()
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { auth } from '@clerk/tanstack-react-start/server'
import {
  confirmAllocationChange,
  confirmGoalCreation,
  confirmGoalEdit,
  confirmGoalLifecycle,
  getAllocationChangeContext,
  getGoalCreationContext,
  getGoalEditContext,
  getGoalLifecycleContext,
  getGoalsWorkspace,
  previewAllocationChange,
  previewGoalCreation,
  previewGoalEdit,
  previewGoalLifecycle,
} from './goals.functions'
import {
  confirmAllocationChangeInRepository,
  confirmGoalCreationInRepository,
  confirmGoalEditInRepository,
  confirmGoalLifecycleInRepository,
  createAllocationChangePreviewToken,
  createGoalCreationPreviewToken,
  createGoalEditPreviewToken,
  createGoalLifecyclePreviewToken,
  getAllocationChangeState,
  getGoalCreationState,
  getGoalEditState,
  getGoalLifecycleState,
  getGoalsWorkspaceRows,
  StaleAllocationChangePreviewError,
  StaleGoalCreationPreviewError,
  StaleGoalEditPreviewError,
  StaleGoalLifecyclePreviewError,
} from './goals.repository.server'
import { buildGoalCreationProposal, type GoalCreationState } from './goal-creation'
import type { GoalCreationDraft } from './goal-creation.schema'
import {
  buildAllocationChangeProposal,
  type AllocationChangeState,
} from './allocation-change'
import type { AllocationChangeDraft } from './allocation-change.schema'
import {
  buildGoalLifecycleProposal,
  type GoalLifecycleState,
} from './goal-lifecycle'

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
    getGoalEditState: vi.fn(),
    confirmGoalEditInRepository: vi.fn(),
    getAllocationChangeState: vi.fn(),
    confirmAllocationChangeInRepository: vi.fn(),
    getGoalLifecycleState: vi.fn(),
    confirmGoalLifecycleInRepository: vi.fn(),
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

describe('getAllocationChangeContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to /sign-in/$ when user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: false, userId: null } as never)

    await expect(getAllocationChangeContext()).rejects.toMatchObject({
      options: expect.objectContaining({ to: '/sign-in/$' }),
    })
  })

  it('passes authenticated userId and UTC YYYY-MM to repository and returns missing profile state', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)
    vi.mocked(getAllocationChangeState).mockResolvedValue(null)

    const result = await getAllocationChangeContext()

    expect(getAllocationChangeState).toHaveBeenCalledWith('user_456', '2026-08')
    expect(result).toEqual({ profile: 'missing' })

    vi.useRealTimers()
  })

  it('returns present profile state with active goals, planned monthly contribution, and current/pending allocations', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)

    const mockState: AllocationChangeState = {
      source: {
        profile: {
          userId: 'user_456',
          baseCurrency: 'ARS',
          approximateMonthlyIncome: '1000000.00',
          approximateMonthlyExpenses: '500000.00',
          expensesKnowledge: 'known',
          plannedMonthlyContribution: '60000.00',
          goalDedicationPercentage: '90.00',
          onboardingCompleted: true,
        },
        incomes: [
          {
            id: 'inc-1',
            sourceKind: 'salary',
            sourceId: null,
            sourceName: 'salary',
            amount: '1000000.00',
            currency: 'ARS',
            recurring: true,
            effectiveMonth: '2026-01-01',
          },
        ],
        expenses: [
          {
            id: 'exp-1',
            sourceKind: 'housing',
            sourceId: null,
            sourceName: 'housing',
            amount: '500000.00',
            currency: 'ARS',
            recurring: true,
            effectiveMonth: '2026-01-01',
            endMonth: null,
          },
        ],
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
          {
            id: 'g2',
            userId: 'user_456',
            name: 'Vacaciones',
            type: 'purchase',
            targetAmount: '1000.00',
            currency: 'USD',
            priority: 'medium',
            strategy: 'save',
            status: 'active',
            desiredDate: null,
            completedAt: null,
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
            percentage: '60.00',
          },
          {
            id: 'a2',
            snapshotId: 's1',
            goalId: 'g2',
            percentage: '40.00',
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
          percentage: '50.00',
        },
        {
          id: 'a2_next',
          snapshotId: 's1_next',
          goalId: 'g2',
          percentage: '50.00',
        },
      ],
    }

    vi.mocked(getAllocationChangeState).mockResolvedValue(mockState)

    const result = await getAllocationChangeContext()

    expect(getAllocationChangeState).toHaveBeenCalledWith('user_456', '2026-08')
    expect(result).toEqual({
      profile: 'present',
      context: {
        currentMonth: '2026-08',
        financialSummary: {
          month: '2026-08',
          income: { amount: '1000000.00', currency: 'ARS' },
          expenses: { amount: '500000.00', currency: 'ARS' },
          balance: { amount: '500000.00', currency: 'ARS' },
          dedicationPercentage: '90.00',
          contribution: { amount: '450000.00', currency: 'ARS' },
        },
        plannedMonthlyContribution: { amount: '60000.00', currency: 'ARS' },
        activeGoals: [
          { id: 'g1', name: 'Reserva', currency: 'USD' },
          { id: 'g2', name: 'Vacaciones', currency: 'USD' },
        ],
        currentAllocation: {
          effectiveMonth: '2026-08-01',
          entries: [
            { goalId: 'g1', percentage: '60.00' },
            { goalId: 'g2', percentage: '40.00' },
          ],
        },
        pendingAllocation: {
          effectiveMonth: '2026-09-01',
          entries: [
            { goalId: 'g1', percentage: '50.00' },
            { goalId: 'g2', percentage: '50.00' },
          ],
        },
      },
    })

    expect((result as any).context.source).toBeUndefined()
    expect((result as any).context.savingsPositions).toBeUndefined()
    expect((result as any).context.snapshots).toBeUndefined()

    vi.useRealTimers()
  })
})

describe('previewAllocationChange', () => {
  const validDraft: AllocationChangeDraft = {
    dedicationPercentage: 90,
    allocations: [
      { goalId: 'g1', percentage: '50.00' },
      { goalId: 'g2', percentage: '50.00' },
    ],
  }

  const mockState: AllocationChangeState = {
    source: {
      profile: {
        userId: 'user_456',
        baseCurrency: 'ARS',
        approximateMonthlyIncome: '1000000.00',
        approximateMonthlyExpenses: '500000.00',
        expensesKnowledge: 'known',
        plannedMonthlyContribution: '60000.00',
        goalDedicationPercentage: '90.00',
        onboardingCompleted: true,
      },
      incomes: [
        {
          id: 'inc-1',
          sourceKind: 'salary',
          sourceId: null,
          sourceName: 'salary',
          amount: '1000000.00',
          currency: 'ARS',
          recurring: true,
          effectiveMonth: '2026-01-01',
        },
      ],
      expenses: [
        {
          id: 'exp-1',
          sourceKind: 'housing',
          sourceId: null,
          sourceName: 'housing',
          amount: '500000.00',
          currency: 'ARS',
          recurring: true,
          effectiveMonth: '2026-01-01',
          endMonth: null,
        },
      ],
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
        {
          id: 'g2',
          userId: 'user_456',
          name: 'Vacaciones',
          type: 'purchase',
          targetAmount: '1000.00',
          currency: 'USD',
          priority: 'medium',
          strategy: 'save',
          status: 'active',
          desiredDate: null,
          completedAt: null,
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
          percentage: '60.00',
        },
        {
          id: 'a2',
          snapshotId: 's1',
          goalId: 'g2',
          percentage: '40.00',
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

    await expect(previewAllocationChange({ data: validDraft })).rejects.toMatchObject({
      options: expect.objectContaining({ to: '/sign-in/$' }),
    })
  })

  it('throws when financial profile is missing', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)
    vi.mocked(getAllocationChangeState).mockResolvedValue(null)

    await expect(previewAllocationChange({ data: validDraft })).rejects.toThrow(
      'Completá tu perfil financiero antes de cambiar la planificación.',
    )

    vi.useRealTimers()
  })

  it('rejects invalid draft input through validator / schema rejection', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)
    vi.mocked(getAllocationChangeState).mockResolvedValue(mockState)

    const invalidDraft = {
      dedicationPercentage: 90,
      allocations: [
        { goalId: 'g1', percentage: '30.00' },
        { goalId: 'g2', percentage: '50.00' },
      ],
    }

    await expect(previewAllocationChange({ data: invalidDraft as any })).rejects.toThrow()

    vi.useRealTimers()
  })

  it('returns read-only proposal and a 64-character preview token without persisting data', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)
    vi.mocked(getAllocationChangeState).mockResolvedValue(mockState)

    const result = await previewAllocationChange({ data: validDraft })

    expect(getAllocationChangeState).toHaveBeenCalledWith('user_456', '2026-08')
    expect(result.previewToken).toMatch(/^[a-f0-9]{64}$/)
    expect(result.proposal.allocation.entries).toHaveLength(2)
    expect(result.proposal.impacts).toHaveLength(2)

    vi.useRealTimers()
  })
})

describe('confirmAllocationChange', () => {
  const currentMonth = '2026-08'
  const validToken = 'a'.repeat(64)
  const staleToken = 'b'.repeat(64)

  const validDraft: AllocationChangeDraft = {
    dedicationPercentage: 90,
    allocations: [
      { goalId: 'g1', percentage: '50.00' },
      { goalId: 'g2', percentage: '50.00' },
    ],
  }

  const mockState: AllocationChangeState = {
    source: {
      profile: {
        userId: 'user_456',
        baseCurrency: 'ARS',
        approximateMonthlyIncome: '1000000.00',
        approximateMonthlyExpenses: '500000.00',
        expensesKnowledge: 'known',
        plannedMonthlyContribution: '60000.00',
        goalDedicationPercentage: '90.00',
        onboardingCompleted: true,
      },
      incomes: [
        {
          id: 'inc-1',
          sourceKind: 'salary',
          sourceId: null,
          sourceName: 'salary',
          amount: '1000000.00',
          currency: 'ARS',
          recurring: true,
          effectiveMonth: '2026-01-01',
        },
      ],
      expenses: [
        {
          id: 'exp-1',
          sourceKind: 'housing',
          sourceId: null,
          sourceName: 'housing',
          amount: '500000.00',
          currency: 'ARS',
          recurring: true,
          effectiveMonth: '2026-01-01',
          endMonth: null,
        },
      ],
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
        {
          id: 'g2',
          userId: 'user_456',
          name: 'Vacaciones',
          type: 'purchase',
          targetAmount: '1000.00',
          currency: 'USD',
          priority: 'medium',
          strategy: 'save',
          status: 'active',
          desiredDate: null,
          completedAt: null,
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
          percentage: '60.00',
        },
        {
          id: 'a2',
          snapshotId: 's1',
          goalId: 'g2',
          percentage: '40.00',
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
      confirmAllocationChange({ data: { draft: validDraft, previewToken: validToken } }),
    ).rejects.toMatchObject({
      options: expect.objectContaining({ to: '/sign-in/$' }),
    })
  })

  it('rejects invalid payload or malformed previewToken through validator schema', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)

    await expect(
      confirmAllocationChange({ data: { draft: validDraft, previewToken: 'short_token' } }),
    ).rejects.toThrow()

    vi.useRealTimers()
  })

  it('returns updated status on successful confirmation in repository', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)
    vi.mocked(confirmAllocationChangeInRepository).mockResolvedValue(undefined)

    const result = await confirmAllocationChange({
      data: { draft: validDraft, previewToken: validToken },
    })

    expect(confirmAllocationChangeInRepository).toHaveBeenCalledWith({
      userId: 'user_456',
      currentMonth: '2026-08',
      draft: validDraft,
      previewToken: validToken,
    })
    expect(result).toEqual({
      status: 'updated',
    })

    vi.useRealTimers()
  })

  it('returns stale status with refreshed preview when repository throws StaleAllocationChangePreviewError', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)

    const refreshedProposal = buildAllocationChangeProposal({
      draft: validDraft,
      state: mockState,
      currentMonth,
    })
    const refreshedToken = createAllocationChangePreviewToken(mockState, currentMonth, validDraft)
    const staleError = new StaleAllocationChangePreviewError({
      proposal: refreshedProposal,
      previewToken: refreshedToken,
    })

    vi.mocked(confirmAllocationChangeInRepository).mockRejectedValue(staleError)

    const result = await confirmAllocationChange({
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

describe('getGoalEditContext', () => {
  const validGoalId = '123e4567-e89b-12d3-a456-426614174000'
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
          id: validGoalId,
          userId: 'user_456',
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
          createdAt: '2026-02-01T00:00:00.000Z',
        },
      ],
      savingsPositions: [],
      investmentPositions: [
        {
          id: 'ip1',
          goalId: validGoalId,
          currentValue: '1200.00',
          currency: 'USD',
          annualReturnRate: '8.500',
          availability: 'available_now',
          availableFrom: null,
        },
      ],
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
          goalId: validGoalId,
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

    await expect(getGoalEditContext({ data: { goalId: validGoalId } })).rejects.toMatchObject({
      options: expect.objectContaining({ to: '/sign-in/$' }),
    })
  })

  it('rejects non-UUID goalId through validator schema', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)

    await expect(getGoalEditContext({ data: { goalId: 'not-a-uuid' } })).rejects.toThrow()

    vi.useRealTimers()
  })

  it('passes authenticated userId, UTC YYYY-MM, and goalId to repository and returns missing profile state', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)
    vi.mocked(getGoalEditState).mockResolvedValue(null)

    const result = await getGoalEditContext({ data: { goalId: validGoalId } })

    expect(getGoalEditState).toHaveBeenCalledWith('user_456', '2026-08', validGoalId)
    expect(result).toEqual({ profile: 'missing' })

    vi.useRealTimers()
  })

  it('throws when goal is absent or not active in repository', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)
    vi.mocked(getGoalEditState).mockRejectedValue(new Error('Goal not found or is not active.'))

    await expect(getGoalEditContext({ data: { goalId: validGoalId } })).rejects.toThrow(
      'Goal not found or is not active.',
    )

    vi.useRealTimers()
  })

  it('returns present profile state with mapped draft, goalId, and route-safe context', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)
    vi.mocked(getGoalEditState).mockResolvedValue(mockState)

    const result = await getGoalEditContext({ data: { goalId: validGoalId } })

    expect(getGoalEditState).toHaveBeenCalledWith('user_456', '2026-08', validGoalId)
    expect(result).toEqual({
      profile: 'present',
      goalId: validGoalId,
      status: 'active',
      draft: {
        type: 'purchase',
        name: 'Viaje a Japón',
        targetAmount: '5000.00',
        currency: 'USD',
        desiredMonth: '2028-06',
        priority: 'medium',
        strategy: 'invest',
        annualReturnRate: '8.500',
        availability: 'available_now',
        availableFromMonth: '',
        allocations: [
          { goalId: validGoalId, percentage: '100.00' },
        ],
      },
      context: {
        currentMonth: '2026-08',
        expensesKnowledge: 'known',
        hasEmergencyFund: false,
        plannedMonthlyContribution: { amount: '60000.00', currency: 'ARS' },
        currentAllocation: {
          effectiveMonth: '2026-08-01',
          entries: [
            { goalId: validGoalId, percentage: '100.00' },
          ],
        },
      },
    })

    vi.useRealTimers()
  })
})

describe('previewGoalEdit', () => {
  const validGoalId = '123e4567-e89b-12d3-a456-426614174000'
  const validDraft: GoalCreationDraft = {
    type: 'purchase',
    name: 'Viaje a Japón Modificado',
    targetAmount: '6000.00',
    currency: 'USD',
    desiredMonth: '2028-12',
    priority: 'high',
    strategy: 'invest',
    annualReturnRate: '9.0',
    availability: 'available_now',
    availableFromMonth: '',
    allocations: [
      { goalId: validGoalId, percentage: '100.00' },
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
          id: validGoalId,
          userId: 'user_456',
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
          createdAt: '2026-02-01T00:00:00.000Z',
        },
      ],
      savingsPositions: [],
      investmentPositions: [
        {
          id: 'ip1',
          goalId: validGoalId,
          currentValue: '1200.00',
          currency: 'USD',
          annualReturnRate: '8.500',
          availability: 'available_now',
          availableFrom: null,
        },
      ],
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
          goalId: validGoalId,
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
      previewGoalEdit({ data: { goalId: validGoalId, draft: validDraft } }),
    ).rejects.toMatchObject({
      options: expect.objectContaining({ to: '/sign-in/$' }),
    })
  })

  it('throws when financial profile is missing', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)
    vi.mocked(getGoalEditState).mockResolvedValue(null)

    await expect(
      previewGoalEdit({ data: { goalId: validGoalId, draft: validDraft } }),
    ).rejects.toThrow('Completá tu perfil financiero antes de editar un objetivo.')

    vi.useRealTimers()
  })

  it('rejects when target goal is not found in active goals', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)
    vi.mocked(getGoalEditState).mockRejectedValue(new Error('Goal not found or is not active.'))

    await expect(
      previewGoalEdit({ data: { goalId: validGoalId, draft: validDraft } }),
    ).rejects.toThrow('Goal not found or is not active.')

    vi.useRealTimers()
  })

  it('rejects when draft modifies immutable fields (type, currency, strategy)', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)
    vi.mocked(getGoalEditState).mockResolvedValue(mockState)

    const invalidTypeDraft = { ...validDraft, type: 'emergency_fund' as const }
    await expect(
      previewGoalEdit({ data: { goalId: validGoalId, draft: invalidTypeDraft } }),
    ).rejects.toThrow('Cannot modify immutable goal fields (type, currency, strategy).')

    const invalidCurrencyDraft = { ...validDraft, currency: 'ARS' as const }
    await expect(
      previewGoalEdit({ data: { goalId: validGoalId, draft: invalidCurrencyDraft } }),
    ).rejects.toThrow('Cannot modify immutable goal fields (type, currency, strategy).')

    const invalidStrategyDraft = { ...validDraft, strategy: 'save' as const }
    await expect(
      previewGoalEdit({ data: { goalId: validGoalId, draft: invalidStrategyDraft } }),
    ).rejects.toThrow('Cannot modify immutable goal fields (type, currency, strategy).')

    vi.useRealTimers()
  })

  it('returns proposal with subjectGoalId simulation and 64-character preview token without persisting data', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)
    vi.mocked(getGoalEditState).mockResolvedValue(mockState)

    const result = await previewGoalEdit({ data: { goalId: validGoalId, draft: validDraft } })

    expect(getGoalEditState).toHaveBeenCalledWith('user_456', '2026-08', validGoalId)
    expect(result.previewToken).toMatch(/^[a-f0-9]{64}$/)
    expect(result.proposal.normalizedGoal.name).toBe('Viaje a Japón Modificado')
    expect(result.proposal.normalizedGoal.targetAmount).toEqual({
      amount: '6000.00',
      currency: 'USD',
    })
    expect(result.proposal.allocation.entries).toHaveLength(1)
    expect(result.proposal.impacts).toHaveLength(1)
    expect(result.proposal.impacts[0].goalId).toBe(validGoalId)

    vi.useRealTimers()
  })
})

describe('confirmGoalEdit', () => {
  const currentMonth = '2026-08'
  const validGoalId = '123e4567-e89b-12d3-a456-426614174000'
  const validToken = 'a'.repeat(64)
  const staleToken = 'b'.repeat(64)

  const validDraft: GoalCreationDraft = {
    type: 'purchase',
    name: 'Viaje a Japón Modificado',
    targetAmount: '6000.00',
    currency: 'USD',
    desiredMonth: '2028-12',
    priority: 'high',
    strategy: 'invest',
    annualReturnRate: '9.0',
    availability: 'available_now',
    availableFromMonth: '',
    allocations: [
      { goalId: validGoalId, percentage: '100.00' },
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
          id: validGoalId,
          userId: 'user_456',
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
          createdAt: '2026-02-01T00:00:00.000Z',
        },
      ],
      savingsPositions: [],
      investmentPositions: [
        {
          id: 'ip1',
          goalId: validGoalId,
          currentValue: '1200.00',
          currency: 'USD',
          annualReturnRate: '8.500',
          availability: 'available_now',
          availableFrom: null,
        },
      ],
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
          goalId: validGoalId,
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
      confirmGoalEdit({
        data: { goalId: validGoalId, draft: validDraft, previewToken: validToken },
      }),
    ).rejects.toMatchObject({
      options: expect.objectContaining({ to: '/sign-in/$' }),
    })
  })

  it('rejects invalid payload or malformed previewToken through validator schema', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)

    await expect(
      confirmGoalEdit({
        data: { goalId: validGoalId, draft: validDraft, previewToken: 'invalid-token' },
      }),
    ).rejects.toThrow()

    await expect(
      confirmGoalEdit({
        data: { goalId: 'not-a-uuid', draft: validDraft, previewToken: validToken },
      }),
    ).rejects.toThrow()

    vi.useRealTimers()
  })

  it('returns updated status on successful confirmation in repository', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)
    vi.mocked(confirmGoalEditInRepository).mockResolvedValue(undefined)

    const result = await confirmGoalEdit({
      data: { goalId: validGoalId, draft: validDraft, previewToken: validToken },
    })

    expect(confirmGoalEditInRepository).toHaveBeenCalledWith({
      userId: 'user_456',
      goalId: validGoalId,
      currentMonth: '2026-08',
      draft: expect.objectContaining({ name: 'Viaje a Japón Modificado' }),
      previewToken: validToken,
    })
    expect(result).toEqual({
      status: 'updated',
    })

    vi.useRealTimers()
  })

  it('returns stale status with refreshed preview when repository throws StaleGoalEditPreviewError', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)

    const refreshedProposal = buildGoalCreationProposal({
      draft: validDraft,
      state: mockState,
      currentMonth,
      subjectGoalId: validGoalId,
    })
    const refreshedToken = createGoalEditPreviewToken(mockState, currentMonth, validGoalId, validDraft)
    const staleError = new StaleGoalEditPreviewError({
      proposal: refreshedProposal,
      previewToken: refreshedToken,
    })

    vi.mocked(confirmGoalEditInRepository).mockRejectedValue(staleError)

    const result = await confirmGoalEdit({
      data: { goalId: validGoalId, draft: validDraft, previewToken: staleToken },
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

describe('getGoalLifecycleContext', () => {
  const validGoalId = '11111111-1111-4111-8111-111111111111'

  const mockState: GoalLifecycleState = {
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
          id: validGoalId,
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
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      savingsPositions: [],
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
          goalId: validGoalId,
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
      getGoalLifecycleContext({ data: { goalId: validGoalId, lifecycle: 'pause' } }),
    ).rejects.toMatchObject({
      options: expect.objectContaining({ to: '/sign-in/$' }),
    })
  })

  it('passes authenticated userId and UTC YYYY-MM to repository and returns missing profile state', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)
    vi.mocked(getGoalLifecycleState).mockResolvedValue(null)

    const result = await getGoalLifecycleContext({
      data: { goalId: validGoalId, lifecycle: 'pause' },
    })

    expect(getGoalLifecycleState).toHaveBeenCalledWith('user_456', '2026-08')
    expect(result).toEqual({ profile: 'missing' })

    vi.useRealTimers()
  })

  it('returns present profile state with route-safe lifecycle context', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)
    vi.mocked(getGoalLifecycleState).mockResolvedValue(mockState)

    const result = await getGoalLifecycleContext({
      data: { goalId: validGoalId, lifecycle: 'pause' },
    })

    expect(getGoalLifecycleState).toHaveBeenCalledWith('user_456', '2026-08')
    expect(result).toEqual({
      profile: 'present',
      goalId: validGoalId,
      lifecycle: 'pause',
      goalName: 'Reserva',
      currentMonth: '2026-08',
      plannedMonthlyContribution: { amount: '60000.00', currency: 'ARS' },
      activeGoals: [{ id: validGoalId, name: 'Reserva', currency: 'USD' }],
      currentAllocation: {
        effectiveMonth: '2026-08-01',
        entries: [{ goalId: validGoalId, percentage: '100.00' }],
      },
      pendingAllocation: undefined,
    })

    vi.useRealTimers()
  })
})

describe('previewGoalLifecycle', () => {
  const validGoalId = '11111111-1111-4111-8111-111111111111'

  const mockState: GoalLifecycleState = {
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
          id: validGoalId,
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
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      savingsPositions: [],
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
          goalId: validGoalId,
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
      previewGoalLifecycle({ data: { goalId: validGoalId, lifecycle: 'pause' } }),
    ).rejects.toMatchObject({
      options: expect.objectContaining({ to: '/sign-in/$' }),
    })
  })

  it('throws when financial profile is missing', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)
    vi.mocked(getGoalLifecycleState).mockResolvedValue(null)

    await expect(
      previewGoalLifecycle({ data: { goalId: validGoalId, lifecycle: 'pause' } }),
    ).rejects.toThrow('Completá tu perfil financiero antes de pausar o reanudar un objetivo.')

    vi.useRealTimers()
  })

  it('returns read-only proposal and a 64-character preview token without persisting data', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)
    vi.mocked(getGoalLifecycleState).mockResolvedValue(mockState)

    const result = await previewGoalLifecycle({
      data: { goalId: validGoalId, lifecycle: 'pause' },
    })

    expect(getGoalLifecycleState).toHaveBeenCalledWith('user_456', '2026-08')
    expect(result.previewToken).toMatch(/^[a-f0-9]{64}$/)
    expect(result.proposal.lifecycle).toBe('pause')
    expect(result.proposal.goalId).toBe(validGoalId)
    expect(result.proposal.nextStatus).toBe('paused')
    expect(result.proposal.pauseMonthlyCommitment).toBe(true)

    vi.useRealTimers()
  })
})

describe('confirmGoalLifecycle', () => {
  const currentMonth = '2026-08'
  const validGoalId = '11111111-1111-4111-8111-111111111111'
  const validToken = 'a'.repeat(64)
  const staleToken = 'b'.repeat(64)

  const mockState: GoalLifecycleState = {
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
          id: validGoalId,
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
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      savingsPositions: [],
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
          goalId: validGoalId,
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
      confirmGoalLifecycle({
        data: {
          goalId: validGoalId,
          lifecycle: 'pause',
          allocations: [],
          previewToken: validToken,
        },
      }),
    ).rejects.toMatchObject({
      options: expect.objectContaining({ to: '/sign-in/$' }),
    })
  })

  it('rejects invalid payload or malformed previewToken through validator schema', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)

    await expect(
      confirmGoalLifecycle({
        data: {
          goalId: 'not-a-uuid',
          lifecycle: 'pause',
          allocations: [],
          previewToken: 'short_token',
        },
      }),
    ).rejects.toThrow()

    vi.useRealTimers()
  })

  it('returns updated status on successful confirmation in repository', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)
    vi.mocked(confirmGoalLifecycleInRepository).mockResolvedValue(undefined)

    const result = await confirmGoalLifecycle({
      data: {
        goalId: validGoalId,
        lifecycle: 'pause',
        allocations: [],
        previewToken: validToken,
      },
    })

    expect(confirmGoalLifecycleInRepository).toHaveBeenCalledWith({
      userId: 'user_456',
      goalId: validGoalId,
      lifecycle: 'pause',
      currentMonth: '2026-08',
      draft: { allocations: [] },
      previewToken: validToken,
    })
    expect(result).toEqual({
      status: 'updated',
    })

    vi.useRealTimers()
  })

  it('returns stale status with refreshed preview when repository throws StaleGoalLifecyclePreviewError', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true, userId: 'user_456' } as never)

    const refreshedProposal = buildGoalLifecycleProposal({
      lifecycle: 'pause',
      goalId: validGoalId,
      state: mockState,
      currentMonth,
      draft: { allocations: [] },
    })
    const refreshedToken = createGoalLifecyclePreviewToken(
      'pause',
      validGoalId,
      mockState,
      currentMonth,
      { allocations: [] },
    )
    const staleError = new StaleGoalLifecyclePreviewError({
      proposal: refreshedProposal,
      previewToken: refreshedToken,
    })

    vi.mocked(confirmGoalLifecycleInRepository).mockRejectedValue(staleError)

    const result = await confirmGoalLifecycle({
      data: {
        goalId: validGoalId,
        lifecycle: 'pause',
        allocations: [],
        previewToken: staleToken,
      },
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




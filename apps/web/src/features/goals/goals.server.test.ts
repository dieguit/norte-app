import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  confirmGoalCompletionServer,
  getGoalCompletionContextServer,
  mapAllocationChangeContext,
  mapGoalCreationContext,
  mapGoalEditContext,
  mapGoalLifecycleContext,
  previewGoalCompletionServer,
} from './goals.server'
import type { GoalCreationState } from './goal-creation'
import type { AllocationChangeState } from './allocation-change'
import type { GoalLifecycleState } from './goal-lifecycle'
import type { GoalCompletionState } from './goal-completion'
import {
  confirmGoalCompletionInRepository,
  createGoalCompletionPreviewToken,
  getGoalCompletionState,
  GoalCompletionStateInvalidError,
  StaleGoalCompletionPreviewError,
} from './goal-completion.repository.server'

vi.mock('../financial/auth.server', () => ({
  requireFinancialUser: vi.fn(),
}))

vi.mock('./goal-completion.repository.server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./goal-completion.repository.server')>()
  return {
    ...actual,
    getGoalCompletionState: vi.fn(),
    createGoalCompletionPreviewToken: vi.fn(),
    confirmGoalCompletionInRepository: vi.fn(),
  }
})

import { requireFinancialUser } from '../financial/auth.server'

const completionState: GoalCompletionState = {
  source: {
    profile: {
      userId: 'user-1',
      baseCurrency: 'ARS',
      expensesKnowledge: 'known',
      plannedMonthlyContribution: '60000.00',
      onboardingCompleted: true,
    },
    goals: [
      {
        id: 'goal-complete',
        userId: 'user-1',
        name: 'Notebook',
        type: 'purchase',
        targetAmount: '100.00',
        currency: 'ARS',
        priority: 'high',
        strategy: 'save',
        status: 'active',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    savingsPositions: [
      { id: 'saving-1', goalId: 'goal-complete', amount: '100.00', currency: 'ARS' },
    ],
    investmentPositions: [],
    snapshots: [],
    allocations: [],
  },
  pendingSnapshots: [],
  pendingAllocations: [],
  savingsPlaces: [{ id: 'place-1', name: 'Banco', balance: { amount: '100.00', currency: 'ARS' } }],
}

const completionDraft = {
  goalId: 'goal-complete',
  withdrawals: [{ placeId: 'place-1', amount: '100.00' }],
  allocations: [],
}

function createMockState(goals: GoalCreationState['source']['goals'] = []): GoalCreationState {
  return {
    source: {
      profile: {
        userId: 'user-1',
        baseCurrency: 'ARS',
        expensesKnowledge: 'known',
        plannedMonthlyContribution: '60000.00',
        onboardingCompleted: true,
      },
      goals,
      savingsPositions: [],
      investmentPositions: [],
      snapshots: [],
      allocations: [],
    },
    pendingSnapshots: [],
    pendingAllocations: [],
  }
}

describe('mapGoalCreationContext', () => {
  it('maps hasEmergencyFund to true when state contains a completed emergency fund goal', () => {
    const state = createMockState([
      {
        id: 'goal-cushion',
        userId: 'user-1',
        name: 'Colchón de emergencia',
        type: 'emergency_fund',
        targetAmount: '3000.00',
        currency: 'USD',
        priority: 'high',
        strategy: 'save',
        status: 'completed',
        createdAt: '2026-01-01T00:00:00.000Z',
        completedAt: '2026-06-01T00:00:00.000Z',
      },
    ])

    expect(mapGoalCreationContext(state, '2026-08')).toMatchObject({
      hasEmergencyFund: true,
      plannedMonthlyContribution: { amount: '60000.00', currency: 'ARS' },
    })
  })

  it('maps hasEmergencyFund to false when state contains no emergency fund goal', () => {
    const state = createMockState([
      {
        id: 'goal-purchase',
        userId: 'user-1',
        name: 'Auto nuevo',
        type: 'purchase',
        targetAmount: '5000000.00',
        currency: 'ARS',
        priority: 'medium',
        strategy: 'save',
        status: 'active',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ])

    expect(mapGoalCreationContext(state, '2026-08')).toMatchObject({
      hasEmergencyFund: false,
      plannedMonthlyContribution: { amount: '60000.00', currency: 'ARS' },
    })
  })
})

describe('goal completion server handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'))
    vi.mocked(requireFinancialUser).mockResolvedValue('user-1')
  })

  afterEach(() => vi.useRealTimers())

  it.each([
    ['context', () => getGoalCompletionContextServer({ data: { goalId: 'goal-complete' } })],
    ['preview', () => previewGoalCompletionServer({ data: completionDraft })],
    ['confirm', () => confirmGoalCompletionServer({
      data: { ...completionDraft, previewToken: 'a'.repeat(64) },
    })],
  ])('rejects %s when requireFinancialUser rejects before calling repositories', async (_name, call) => {
    const failure = new Error('unauthenticated')
    vi.mocked(requireFinancialUser).mockRejectedValue(failure)

    await expect(call()).rejects.toBe(failure)
    expect(getGoalCompletionState).not.toHaveBeenCalled()
    expect(confirmGoalCompletionInRepository).not.toHaveBeenCalled()
  })

  it('authenticates, delegates the current month, and maps a present context', async () => {
    vi.mocked(getGoalCompletionState).mockResolvedValue(completionState)

    const result = await getGoalCompletionContextServer({
      data: { goalId: 'goal-complete' },
    })

    expect(requireFinancialUser).toHaveBeenCalledOnce()
    expect(getGoalCompletionState).toHaveBeenCalledWith('user-1', '2026-08', 'goal-complete')
    expect(result).toEqual({
      profile: 'present',
      context: expect.objectContaining({
        goalId: 'goal-complete',
        goalName: 'Notebook',
        currentMonth: '2026-08',
      }),
    })
  })

  it('returns missing profile when the completion state has no profile', async () => {
    vi.mocked(getGoalCompletionState).mockResolvedValue(null)

    await expect(
      getGoalCompletionContextServer({ data: { goalId: 'goal-complete' } }),
    ).resolves.toEqual({ profile: 'missing' })
  })

  it('preserves the generic error for an unowned goal', async () => {
    vi.mocked(getGoalCompletionState).mockRejectedValue(new Error('Objetivo no encontrado.'))

    await expect(
      getGoalCompletionContextServer({ data: { goalId: 'goal-complete' } }),
    ).rejects.toThrow('Objetivo no encontrado.')
  })

  it('builds a proposal and delegates a SHA preview token', async () => {
    vi.mocked(getGoalCompletionState).mockResolvedValue(completionState)
    vi.mocked(createGoalCompletionPreviewToken).mockReturnValue('a'.repeat(64))

    const result = await previewGoalCompletionServer({ data: completionDraft })

    expect(result.previewToken).toBe('a'.repeat(64))
    expect(result.proposal.goalId).toBe('goal-complete')
    expect(createGoalCompletionPreviewToken).toHaveBeenCalledWith(
      completionState,
      '2026-08',
      completionDraft,
    )
  })

  it('returns completed with the repository completion timestamp', async () => {
    const completedAt = '2026-08-19T12:00:00.000Z'
    vi.mocked(confirmGoalCompletionInRepository).mockResolvedValue({ completedAt })

    const result = await confirmGoalCompletionServer({
      data: { ...completionDraft, previewToken: 'a'.repeat(64) },
    })

    expect(confirmGoalCompletionInRepository).toHaveBeenCalledWith({
      userId: 'user-1',
      currentMonth: '2026-08',
      draft: completionDraft,
      previewToken: 'a'.repeat(64),
    })
    expect(result).toEqual({ status: 'completed', completedAt })
  })

  it('maps stale confirmations to the refreshed preview', async () => {
    const preview = { proposal: { goalId: 'goal-complete' }, previewToken: 'b'.repeat(64) } as never
    vi.mocked(confirmGoalCompletionInRepository).mockRejectedValue(
      new StaleGoalCompletionPreviewError(preview),
    )

    await expect(
      confirmGoalCompletionServer({
        data: { ...completionDraft, previewToken: 'a'.repeat(64) },
      }),
    ).resolves.toEqual({ status: 'stale', preview })
  })

  it('maps invalid state without returning a preview', async () => {
    vi.mocked(confirmGoalCompletionInRepository).mockRejectedValue(
      new GoalCompletionStateInvalidError(),
    )

    const result = await confirmGoalCompletionServer({
      data: { ...completionDraft, previewToken: 'a'.repeat(64) },
    })

    expect(result).toEqual({
      status: 'invalid',
      message: 'No se puede completar el objetivo con el estado actual.',
    })
    expect(result).not.toHaveProperty('preview')
  })

  it('propagates unexpected repository errors', async () => {
    const failure = new Error('database failure')
    vi.mocked(confirmGoalCompletionInRepository).mockRejectedValue(failure)

    await expect(
      confirmGoalCompletionServer({
        data: { ...completionDraft, previewToken: 'a'.repeat(64) },
      }),
    ).rejects.toBe(failure)
  })
})

describe('mapAllocationChangeContext', () => {
  it('maps active goals, planned contribution, and winning and pending snapshots', () => {
    const state: AllocationChangeState = {
      source: {
        profile: {
          userId: 'user-1',
          baseCurrency: 'ARS',
          expensesKnowledge: 'known',
          plannedMonthlyContribution: '75000.00',
          goalDedicationPercentage: '90.00',
          onboardingCompleted: true,
        },
        incomes: [
          {
            id: 'inc-1',
            sourceKind: 'salary',
            sourceId: null,
            sourceName: 'salary',
            concept: null,
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
            concept: null,
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
            userId: 'user-1',
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
          {
            id: 'g2',
            userId: 'user-1',
            name: 'Auto',
            type: 'purchase',
            targetAmount: '5000.00',
            currency: 'USD',
            priority: 'medium',
            strategy: 'save',
            status: 'paused',
            desiredDate: null,
            completedAt: null,
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        savingsPositions: [],
        investmentPositions: [],
        snapshots: [
          { id: 'snap-1', userId: 'user-1', effectiveMonth: '2026-08-01' },
        ],
        allocations: [
          { id: 'alloc-1', snapshotId: 'snap-1', goalId: 'g1', percentage: '0.00' },
        ],
      },
      pendingSnapshots: [
        { id: 'snap-2', userId: 'user-1', effectiveMonth: '2026-09-01' },
      ],
      pendingAllocations: [
        { id: 'alloc-2', snapshotId: 'snap-2', goalId: 'g1', percentage: '100.00' },
      ],
    }

    const context = mapAllocationChangeContext(state, '2026-08')

    expect(context).toEqual({
      currentMonth: '2026-08',
      financialSummary: {
        month: '2026-08',
        income: { amount: '1000000.00', currency: 'ARS' },
        expenses: { amount: '500000.00', currency: 'ARS' },
        balance: { amount: '500000.00', currency: 'ARS' },
        dedicationPercentage: '90.00',
        contribution: { amount: '450000.00', currency: 'ARS' },
      },
      plannedMonthlyContribution: { amount: '75000.00', currency: 'ARS' },
      activeGoals: [
        {
          id: 'g1',
          name: 'Reserva',
          currency: 'USD',
          projection: {
            status: 'available',
            completionMonth: expect.any(String),
          },
        },
      ],
      currentAllocation: {
        effectiveMonth: '2026-08-01',
        entries: [{ goalId: 'g1', percentage: '0.00' }],
      },
      pendingAllocation: {
        effectiveMonth: '2026-09-01',
        entries: [{ goalId: 'g1', percentage: '100.00' }],
      },
    })
  })
})

describe('mapGoalLifecycleContext', () => {
  const baseLifecycleState: GoalLifecycleState = {
    source: {
      profile: {
        userId: 'user-1',
        baseCurrency: 'ARS',
        expensesKnowledge: 'known',
        plannedMonthlyContribution: '80000.00',
        onboardingCompleted: true,
      },
      goals: [
        {
          id: 'g1',
          userId: 'user-1',
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
        {
          id: 'g2',
          userId: 'user-1',
          name: 'Viaje',
          type: 'purchase',
          targetAmount: '3000.00',
          currency: 'USD',
          priority: 'medium',
          strategy: 'invest',
          status: 'paused',
          desiredDate: null,
          completedAt: null,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      savingsPositions: [],
      investmentPositions: [],
      snapshots: [
        { id: 'snap-1', userId: 'user-1', effectiveMonth: '2026-08-01' },
      ],
      allocations: [
        { id: 'alloc-1', snapshotId: 'snap-1', goalId: 'g1', percentage: '100.00' },
      ],
    },
    pendingSnapshots: [
      { id: 'snap-2', userId: 'user-1', effectiveMonth: '2026-09-01' },
    ],
    pendingAllocations: [
      { id: 'alloc-2', snapshotId: 'snap-2', goalId: 'g1', percentage: '100.00' },
    ],
  }

  it('maps goalName, lifecycle, activeGoals, plannedMonthlyContribution, and current/pending allocations for pause', () => {
    const context = mapGoalLifecycleContext(baseLifecycleState, '2026-08', 'g1', 'pause')

    expect(context).toEqual({
      goalId: 'g1',
      lifecycle: 'pause',
      goalName: 'Reserva',
      currentMonth: '2026-08',
      plannedMonthlyContribution: { amount: '80000.00', currency: 'ARS' },
      activeGoals: [{ id: 'g1', name: 'Reserva', currency: 'USD' }],
      currentAllocation: {
        effectiveMonth: '2026-08-01',
        entries: [{ goalId: 'g1', percentage: '100.00' }],
      },
      pendingAllocation: {
        effectiveMonth: '2026-09-01',
        entries: [{ goalId: 'g1', percentage: '100.00' }],
      },
    })
  })

  it('maps context correctly for resume', () => {
    const context = mapGoalLifecycleContext(baseLifecycleState, '2026-08', 'g2', 'resume')

    expect(context).toMatchObject({
      goalId: 'g2',
      lifecycle: 'resume',
      goalName: 'Viaje',
      currentMonth: '2026-08',
    })
  })

  it('throws error when goal is not found in state', () => {
    expect(() => mapGoalLifecycleContext(baseLifecycleState, '2026-08', 'non-existent', 'pause')).toThrow(
      'Goal not found.',
    )
  })

  it('throws error when attempting to pause a non-active goal', () => {
    expect(() => mapGoalLifecycleContext(baseLifecycleState, '2026-08', 'g2', 'pause')).toThrow(
      'Only active goals can be paused.',
    )
  })

  it('throws error when attempting to resume a non-paused goal', () => {
    expect(() => mapGoalLifecycleContext(baseLifecycleState, '2026-08', 'g1', 'resume')).toThrow(
      'Only paused goals can be resumed.',
    )
  })
})

describe('mapGoalEditContext', () => {
  const baseEditState: GoalCreationState = {
    source: {
      profile: {
        userId: 'user-1',
        baseCurrency: 'ARS',
        expensesKnowledge: 'known',
        plannedMonthlyContribution: '80000.00',
        onboardingCompleted: true,
      },
      goals: [
        {
          id: 'g1',
          userId: 'user-1',
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
        {
          id: 'g2',
          userId: 'user-1',
          name: 'Viaje',
          type: 'purchase',
          targetAmount: '3000.00',
          currency: 'USD',
          priority: 'medium',
          strategy: 'invest',
          status: 'paused',
          desiredDate: null,
          completedAt: null,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'g3',
          userId: 'user-1',
          name: 'Auto',
          type: 'purchase',
          targetAmount: '10000.00',
          currency: 'USD',
          priority: 'low',
          strategy: 'save',
          status: 'completed',
          desiredDate: null,
          completedAt: '2026-05-01T00:00:00.000Z',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      savingsPositions: [],
      investmentPositions: [],
      snapshots: [
        { id: 'snap-1', userId: 'user-1', effectiveMonth: '2026-08-01' },
      ],
      allocations: [
        { id: 'alloc-1', snapshotId: 'snap-1', goalId: 'g1', percentage: '100.00' },
      ],
    },
    pendingSnapshots: [],
    pendingAllocations: [],
  }

  it('maps active goal for editing and includes it in allocations', () => {
    const editContext = mapGoalEditContext(baseEditState, '2026-08', 'g1')
    expect(editContext.goalId).toBe('g1')
    expect(editContext.status).toBe('active')
    expect(editContext.draft.name).toBe('Reserva')
    expect(editContext.draft.allocations).toEqual([{ goalId: 'g1', percentage: '100.00' }])
  })

  it('maps paused goal for editing and constructs allocation only from active goals', () => {
    const editContext = mapGoalEditContext(baseEditState, '2026-08', 'g2')
    expect(editContext.goalId).toBe('g2')
    expect(editContext.status).toBe('paused')
    expect(editContext.draft.name).toBe('Viaje')
    // Paused goal g2 should NOT be in allocations; only active goal g1 should be
    expect(editContext.draft.allocations).toEqual([{ goalId: 'g1', percentage: '100.00' }])
  })

  it('throws error when attempting to edit a completed goal', () => {
    expect(() => mapGoalEditContext(baseEditState, '2026-08', 'g3')).toThrow(
      /completed|not active or paused/i,
    )
  })
})

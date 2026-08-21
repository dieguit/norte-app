import { describe, expect, it } from 'vitest'
import {
  mapAllocationChangeContext,
  mapGoalCreationContext,
  mapGoalEditContext,
  mapGoalLifecycleContext,
} from './goals.server'
import type { GoalCreationState } from './goal-creation'
import type { AllocationChangeState } from './allocation-change'
import type { GoalLifecycleState } from './goal-lifecycle'

function createMockState(goals: GoalCreationState['source']['goals'] = []): GoalCreationState {
  return {
    source: {
      profile: {
        userId: 'user-1',
        baseCurrency: 'ARS',
        approximateMonthlyIncome: '1000000.00',
        approximateMonthlyExpenses: '500000.00',
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

describe('mapAllocationChangeContext', () => {
  it('maps active goals, planned contribution, and winning and pending snapshots', () => {
    const state: AllocationChangeState = {
      source: {
        profile: {
          userId: 'user-1',
          baseCurrency: 'ARS',
          approximateMonthlyIncome: '1000000.00',
          approximateMonthlyExpenses: '500000.00',
          expensesKnowledge: 'known',
          plannedMonthlyContribution: '75000.00',
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

    const context = mapAllocationChangeContext(state, '2026-08')

    expect(context).toEqual({
      currentMonth: '2026-08',
      plannedMonthlyContribution: { amount: '75000.00', currency: 'ARS' },
      activeGoals: [
        { id: 'g1', name: 'Reserva', currency: 'USD' },
      ],
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
})

describe('mapGoalLifecycleContext', () => {
  const baseLifecycleState: GoalLifecycleState = {
    source: {
      profile: {
        userId: 'user-1',
        baseCurrency: 'ARS',
        approximateMonthlyIncome: '1000000.00',
        approximateMonthlyExpenses: '500000.00',
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
        approximateMonthlyIncome: '1000000.00',
        approximateMonthlyExpenses: '500000.00',
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


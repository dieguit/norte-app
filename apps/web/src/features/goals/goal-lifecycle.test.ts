import { describe, expect, it } from 'vitest'
import {
  buildGoalLifecycleProposal,
  selectGoalLifecycleAllocation,
  serializeGoalLifecycleState,
  type GoalLifecycleState,
} from './goal-lifecycle'
import type { GoalsWorkspaceSource } from './goals'

function createThreeGoalsWorkspaceSource(travelStatus: 'active' | 'paused' = 'active'): GoalsWorkspaceSource {
  return {
    profile: {
      userId: 'user-1',
      baseCurrency: 'ARS',
      expensesKnowledge: 'known',
      plannedMonthlyContribution: '60000.00',
      onboardingCompleted: true,
    },
    goals: [
      {
        id: 'emergency',
        userId: 'user-1',
        name: 'Colchón financiero',
        type: 'emergency_fund',
        targetAmount: '6000.00',
        currency: 'USD',
        priority: 'high',
        strategy: 'save',
        status: 'active',
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'retirement',
        userId: 'user-1',
        name: 'Jubilación',
        type: 'retirement',
        targetAmount: '100000.00',
        currency: 'USD',
        priority: 'medium',
        strategy: 'invest',
        status: 'active',
        createdAt: '2026-02-01T00:00:00Z',
      },
      {
        id: 'travel',
        userId: 'user-1',
        name: 'Viaje a Japón',
        type: 'purchase',
        targetAmount: '3000.00',
        currency: 'USD',
        priority: 'low',
        strategy: 'save',
        status: travelStatus,
        createdAt: '2026-03-01T00:00:00Z',
      },
    ],
    savingsPositions: [
      { id: 'sav-1', goalId: 'emergency', amount: '1000.00', currency: 'USD' },
      { id: 'sav-2', goalId: 'travel', amount: '500.00', currency: 'USD' },
    ],
    investmentPositions: [
      {
        id: 'inv-1',
        goalId: 'retirement',
        currentValue: '5000.00',
        currency: 'USD',
        annualReturnRate: '8.0',
        availability: 'long_term',
      },
    ],
    snapshots: [
      {
        id: 'snap-aug',
        userId: 'user-1',
        effectiveMonth: '2026-08-01',
      },
    ],
    allocations: travelStatus === 'active'
      ? [
          { id: 'alloc-1', snapshotId: 'snap-aug', goalId: 'emergency', percentage: '60.00' },
          { id: 'alloc-2', snapshotId: 'snap-aug', goalId: 'retirement', percentage: '20.00' },
          { id: 'alloc-3', snapshotId: 'snap-aug', goalId: 'travel', percentage: '20.00' },
        ]
      : [
          { id: 'alloc-1', snapshotId: 'snap-aug', goalId: 'emergency', percentage: '60.00' },
          { id: 'alloc-2', snapshotId: 'snap-aug', goalId: 'retirement', percentage: '40.00' },
        ],
  }
}

function createOneGoalWorkspaceSource(): GoalsWorkspaceSource {
  return {
    profile: {
      userId: 'user-1',
      baseCurrency: 'ARS',
      expensesKnowledge: 'known',
      plannedMonthlyContribution: '60000.00',
      onboardingCompleted: true,
    },
    goals: [
      {
        id: 'emergency',
        userId: 'user-1',
        name: 'Colchón financiero',
        type: 'emergency_fund',
        targetAmount: '6000.00',
        currency: 'USD',
        priority: 'high',
        strategy: 'save',
        status: 'active',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ],
    savingsPositions: [
      { id: 'sav-1', goalId: 'emergency', amount: '1000.00', currency: 'USD' },
    ],
    investmentPositions: [],
    snapshots: [
      {
        id: 'snap-aug',
        userId: 'user-1',
        effectiveMonth: '2026-08-01',
      },
    ],
    allocations: [
      { id: 'alloc-1', snapshotId: 'snap-aug', goalId: 'emergency', percentage: '100.00' },
    ],
  }
}

describe('buildGoalLifecycleProposal', () => {
  it('pauses the selected active goal first and redistributes its share proportionally', () => {
    const state: GoalLifecycleState = {
      source: createThreeGoalsWorkspaceSource('active'),
      pendingSnapshots: [],
      pendingAllocations: [],
    }

    const proposal = buildGoalLifecycleProposal({
      lifecycle: 'pause',
      goalId: 'travel',
      state,
      currentMonth: '2026-08',
    })

    expect(proposal.transition).toEqual({ goalId: 'travel', status: 'paused' })
    expect(proposal.allocation.entries.map(({ goalId, percentage }) => ({ goalId, percentage }))).toEqual([
      { goalId: 'travel', percentage: '0.00' },
      { goalId: 'emergency', percentage: '75.00' },
      { goalId: 'retirement', percentage: '25.00' },
    ])
    expect(proposal.persistedAllocation.entries).toEqual([
      { goalId: 'emergency', percentage: '75.00' },
      { goalId: 'retirement', percentage: '25.00' },
    ])
    expect(proposal.pauseMonthlyCommitment).toBe(false)
  })

  it('resumes the selected paused goal first at zero percent', () => {
    const state: GoalLifecycleState = {
      source: createThreeGoalsWorkspaceSource('paused'),
      pendingSnapshots: [],
      pendingAllocations: [],
    }

    const proposal = buildGoalLifecycleProposal({
      lifecycle: 'resume',
      goalId: 'travel',
      state,
      currentMonth: '2026-08',
    })

    expect(proposal.transition).toEqual({ goalId: 'travel', status: 'active' })
    expect(proposal.allocation.entries.map(({ goalId, percentage }) => ({ goalId, percentage }))).toEqual([
      { goalId: 'travel', percentage: '0.00' },
      { goalId: 'emergency', percentage: '60.00' },
      { goalId: 'retirement', percentage: '40.00' },
    ])
    expect(proposal.persistedAllocation.entries).toEqual([
      { goalId: 'travel', percentage: '0.00' },
      { goalId: 'emergency', percentage: '60.00' },
      { goalId: 'retirement', percentage: '40.00' },
    ])
  })

  it('clears the monthly commitment when pausing the only active goal', () => {
    const oneGoalState: GoalLifecycleState = {
      source: createOneGoalWorkspaceSource(),
      pendingSnapshots: [],
      pendingAllocations: [],
    }

    const proposal = buildGoalLifecycleProposal({
      lifecycle: 'pause',
      goalId: 'emergency',
      state: oneGoalState,
      currentMonth: '2026-08',
    })

    expect(proposal.pauseMonthlyCommitment).toBe(true)
    expect(proposal.proposedSource.profile?.plannedMonthlyContribution).toBeNull()
    expect(proposal.persistedAllocation.entries).toEqual([])
    expect(proposal.allocation.entries).toEqual([
      {
        goalId: 'emergency',
        goalName: 'Colchón financiero',
        percentage: '0.00',
        pending: false,
      },
    ])
  })

  it('rejects a resume draft that omits the resumed active goal or does not total 100%', () => {
    const state: GoalLifecycleState = {
      source: createThreeGoalsWorkspaceSource('paused'),
      pendingSnapshots: [],
      pendingAllocations: [],
    }

    expect(() =>
      buildGoalLifecycleProposal({
        lifecycle: 'resume',
        goalId: 'travel',
        state,
        currentMonth: '2026-08',
        draft: { allocations: [{ goalId: 'emergency', percentage: '100.00' }] },
      }),
    ).toThrow('exactly the active goals')

    expect(() =>
      buildGoalLifecycleProposal({
        lifecycle: 'resume',
        goalId: 'travel',
        state,
        currentMonth: '2026-08',
        draft: {
          allocations: [
            { goalId: 'travel', percentage: '20.00' },
            { goalId: 'emergency', percentage: '50.00' },
            { goalId: 'retirement', percentage: '20.00' },
          ],
        },
      }),
    ).toThrow('sum to 100%')
  })

  it('accepts a pause draft with a numeric zero target percentage', () => {
    const state: GoalLifecycleState = {
      source: createThreeGoalsWorkspaceSource('active'),
      pendingSnapshots: [],
      pendingAllocations: [],
    }

    expect(() =>
      buildGoalLifecycleProposal({
        lifecycle: 'pause',
        goalId: 'travel',
        state,
        currentMonth: '2026-08',
        draft: {
          allocations: [
            { goalId: 'travel', percentage: '0' },
            { goalId: 'emergency', percentage: '75.00' },
            { goalId: 'retirement', percentage: '25.00' },
          ],
        },
      }),
    ).not.toThrow()
  })

  it('accepts a pause draft with a comma-formatted zero target percentage', () => {
    const state: GoalLifecycleState = {
      source: createThreeGoalsWorkspaceSource('active'),
      pendingSnapshots: [],
      pendingAllocations: [],
    }

    const proposal = buildGoalLifecycleProposal({
      lifecycle: 'pause',
      goalId: 'travel',
      state,
      currentMonth: '2026-08',
      draft: {
        allocations: [
          { goalId: 'travel', percentage: '0,00' },
          { goalId: 'emergency', percentage: '75.00' },
          { goalId: 'retirement', percentage: '25.00' },
        ],
      },
    })

    expect(proposal.persistedAllocation.entries).toEqual([
      { goalId: 'emergency', percentage: '75.00' },
      { goalId: 'retirement', percentage: '25.00' },
    ])
  })

  it('accepts a valid resume draft and applies it correctly', () => {
    const state: GoalLifecycleState = {
      source: createThreeGoalsWorkspaceSource('paused'),
      pendingSnapshots: [],
      pendingAllocations: [],
    }

    const proposal = buildGoalLifecycleProposal({
      lifecycle: 'resume',
      goalId: 'travel',
      state,
      currentMonth: '2026-08',
      draft: {
        allocations: [
          { goalId: 'travel', percentage: '30.00' },
          { goalId: 'emergency', percentage: '50.00' },
          { goalId: 'retirement', percentage: '20.00' },
        ],
      },
    })

    expect(proposal.allocation.entries.map(({ goalId, percentage }) => ({ goalId, percentage }))).toEqual([
      { goalId: 'travel', percentage: '30.00' },
      { goalId: 'emergency', percentage: '50.00' },
      { goalId: 'retirement', percentage: '20.00' },
    ])
    expect(proposal.persistedAllocation.entries).toEqual([
      { goalId: 'travel', percentage: '30.00' },
      { goalId: 'emergency', percentage: '50.00' },
      { goalId: 'retirement', percentage: '20.00' },
    ])
  })

  it('includes the transitioning goal first in impacts and preserves its actual values', () => {
    const state: GoalLifecycleState = {
      source: createThreeGoalsWorkspaceSource('active'),
      pendingSnapshots: [],
      pendingAllocations: [],
    }

    const proposal = buildGoalLifecycleProposal({
      lifecycle: 'pause',
      goalId: 'travel',
      state,
      currentMonth: '2026-08',
    })

    expect(proposal.impacts[0]?.goalId).toBe('travel')
    expect(proposal.proposedSource.savingsPositions).toEqual(state.source.savingsPositions)
    expect(proposal.proposedSource.investmentPositions).toEqual(state.source.investmentPositions)
  })

  it('rejects invalid status transitions', () => {
    const state: GoalLifecycleState = {
      source: createThreeGoalsWorkspaceSource('active'),
      pendingSnapshots: [],
      pendingAllocations: [],
    }

    expect(() =>
      buildGoalLifecycleProposal({
        lifecycle: 'resume',
        goalId: 'travel',
        state,
        currentMonth: '2026-08',
      }),
    ).toThrow('Only paused goals can be resumed.')

    expect(() =>
      buildGoalLifecycleProposal({
        lifecycle: 'pause',
        goalId: 'non-existent',
        state,
        currentMonth: '2026-08',
      }),
    ).toThrow('Goal not found.')
  })

  it('serializes state deterministically', () => {
    const state: GoalLifecycleState = {
      source: createThreeGoalsWorkspaceSource('active'),
      pendingSnapshots: [],
      pendingAllocations: [],
    }

    const serialized1 = serializeGoalLifecycleState('pause', 'travel', state, '2026-08')
    const serialized2 = serializeGoalLifecycleState('pause', 'travel', state.source, '2026-08')

    expect(serialized1).toBe(serialized2)
    expect(serialized1).toContain('"lifecycle":"pause"')
    expect(serialized1).toContain('"goalId":"travel"')
  })

  it('invalidates serialization when incomes or expenses change but not when they are reordered', () => {
    const state: GoalLifecycleState = {
      source: {
        ...createThreeGoalsWorkspaceSource(),
        incomes: [
          {
            id: 'income-2',
            sourceKind: 'bonus',
            sourceId: null,
            sourceName: 'Bono',
            concept: 'Annual bonus',
            amount: '200000.00',
            currency: 'ARS',
            recurring: false,
            effectiveMonth: '2026-08-01',
          },
          {
            id: 'income-1',
            sourceKind: 'salary',
            sourceId: null,
            sourceName: 'Sueldo',
            concept: null,
            amount: '1000000.00',
            currency: 'ARS',
            recurring: true,
            effectiveMonth: '2026-01-01',
          },
        ],
        expenses: [
          {
            id: 'expense-2',
            sourceKind: 'travel_leisure',
            sourceId: null,
            sourceName: 'Viaje',
            concept: 'Weekend trip',
            amount: '50000.00',
            currency: 'ARS',
            recurring: false,
            effectiveMonth: '2026-08-01',
            endMonth: null,
          },
          {
            id: 'expense-1',
            sourceKind: 'housing',
            sourceId: null,
            sourceName: 'Alquiler',
            concept: null,
            amount: '300000.00',
            currency: 'ARS',
            recurring: true,
            effectiveMonth: '2026-01-01',
            endMonth: null,
          },
        ],
      },
      pendingSnapshots: [],
      pendingAllocations: [],
    }

    const serialized = serializeGoalLifecycleState('pause', 'travel', state, '2026-08')
    const reordered: GoalLifecycleState = {
      ...state,
      source: {
        ...state.source,
        incomes: [...state.source.incomes!].reverse(),
        expenses: [...state.source.expenses!].reverse(),
      },
    }

    expect(serialized).toBe(serializeGoalLifecycleState('pause', 'travel', reordered, '2026-08'))
    expect(serialized).not.toBe(
      serializeGoalLifecycleState(
        'pause',
        'travel',
        { ...state, source: { ...state.source, incomes: [{ ...state.source.incomes![0], amount: '250000.00' }, state.source.incomes![1]] } },
        '2026-08',
      ),
    )
    expect(serialized).not.toBe(
      serializeGoalLifecycleState(
        'pause',
        'travel',
        { ...state, source: { ...state.source, expenses: [{ ...state.source.expenses![0], amount: '60000.00' }, state.source.expenses![1]] } },
        '2026-08',
      ),
    )
  })
})

describe('selectGoalLifecycleAllocation', () => {
  it('selects the latest current snapshot and earliest pending snapshot consistently', () => {
    const snapshots = [
      { id: 'future', userId: 'user-1', effectiveMonth: '2026-10-01' },
      { id: 'current', userId: 'user-1', effectiveMonth: '2026-08-01' },
      { id: 'next', userId: 'user-1', effectiveMonth: '2026-09-01' },
    ]
    const allocations = [
      { id: 'future-entry', snapshotId: 'future', goalId: 'goal-1', percentage: '20.00' },
      { id: 'current-entry', snapshotId: 'current', goalId: 'goal-1', percentage: '60.00' },
      { id: 'next-entry', snapshotId: 'next', goalId: 'goal-1', percentage: '80.00' },
    ]

    expect(selectGoalLifecycleAllocation(snapshots, allocations, '2026-08', 'current')).toEqual({
      effectiveMonth: '2026-08-01',
      entries: [{ goalId: 'goal-1', percentage: '60.00' }],
    })
    expect(selectGoalLifecycleAllocation(snapshots, allocations, '2026-08', 'pending')).toEqual({
      effectiveMonth: '2026-09-01',
      entries: [{ goalId: 'goal-1', percentage: '80.00' }],
    })
  })
})

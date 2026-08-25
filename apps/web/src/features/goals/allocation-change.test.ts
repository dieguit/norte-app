import { describe, expect, it } from 'vitest'
import {
  buildAllocationChangeProposal,
  serializeAllocationChangeState,
  type AllocationChangeState,
} from './allocation-change'
import type { AllocationChangeDraft } from './allocation-change.schema'
import type { GoalsWorkspaceSource } from './goals'

function createBaseWorkspaceSource(): GoalsWorkspaceSource {
  return {
    profile: {
      userId: 'user-1',
      baseCurrency: 'ARS',
      approximateMonthlyIncome: '2000000.00',
      approximateMonthlyExpenses: '1500000.00',
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
        amount: '2000000.00',
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
        amount: '1500000.00',
        currency: 'ARS',
        recurring: true,
        effectiveMonth: '2026-01-01',
        endMonth: null,
      },
    ],
    goals: [
      {
        id: 'goal-1',
        userId: 'user-1',
        name: 'Fondo de emergencia',
        type: 'emergency_fund',
        targetAmount: '6000.00',
        currency: 'USD',
        priority: 'high',
        strategy: 'save',
        status: 'active',
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'goal-2',
        userId: 'user-1',
        name: 'Vacaciones',
        type: 'purchase',
        targetAmount: '1000000.00',
        currency: 'ARS',
        priority: 'medium',
        strategy: 'save',
        status: 'active',
        createdAt: '2026-02-01T00:00:00Z',
      },
    ],
    savingsPositions: [
      { id: 'sav-1', goalId: 'goal-1', amount: '100.00', currency: 'USD' },
      { id: 'sav-2', goalId: 'goal-2', amount: '50000.00', currency: 'ARS' },
    ],
    investmentPositions: [],
    snapshots: [
      {
        id: 'snap-global-aug',
        userId: 'user-1',
        effectiveMonth: '2026-08-01',
      },
    ],
    allocations: [
      { id: 'alloc-1', snapshotId: 'snap-global-aug', goalId: 'goal-1', percentage: '60.00' },
      { id: 'alloc-2', snapshotId: 'snap-global-aug', goalId: 'goal-2', percentage: '40.00' },
    ],
  }
}

describe('buildAllocationChangeProposal', () => {
  it('builds pure allocation change proposal with calculated amounts and impacts', () => {
    const source = createBaseWorkspaceSource()
    const state: AllocationChangeState = {
      source,
      pendingSnapshots: [],
      pendingAllocations: [],
    }
    const draft: AllocationChangeDraft = {
      dedicationPercentage: 90,
      allocations: [
        { goalId: 'goal-1', percentage: '25.00' },
        { goalId: 'goal-2', percentage: '75.00' },
      ],
    }

    const proposal = buildAllocationChangeProposal({
      draft,
      state,
      currentMonth: '2026-08',
    })

    expect(proposal.dedicationPercentage).toBe(90)
    expect(proposal.allocation).toMatchObject({
      effectiveMonth: '2026-08-01',
      monthlyContribution: { amount: '450000.00', currency: 'ARS' },
      totalPercentage: '100.00',
      entries: [
        {
          goalId: 'goal-1',
          pending: false,
          percentage: '25.00',
          allocatedBaseAmount: { amount: '112500.00', currency: 'ARS' },
          allocatedDestinationAmount: { amount: '75.00', currency: 'USD' },
        },
        {
          goalId: 'goal-2',
          pending: false,
          percentage: '75.00',
          allocatedBaseAmount: { amount: '337500.00', currency: 'ARS' },
          allocatedDestinationAmount: { amount: '337500.00', currency: 'ARS' },
        },
      ],
    })

    expect(proposal.impacts.map((impact) => impact.goalId)).toEqual(['goal-1', 'goal-2'])
    expect(proposal.impacts[0]).toMatchObject({
      goalId: 'goal-1',
      goalName: 'Fondo de emergencia',
      before: {
        status: 'existing',
      },
    })
    expect(proposal.proposedSource.goals).toEqual(source.goals)
  })

  it('rejects drafts with missing active goal IDs', () => {
    const source = createBaseWorkspaceSource()
    const state: AllocationChangeState = {
      source,
      pendingSnapshots: [],
      pendingAllocations: [],
    }
    const draft: AllocationChangeDraft = {
      dedicationPercentage: 90,
      allocations: [{ goalId: 'goal-1', percentage: '100.00' }],
    }

    expect(() =>
      buildAllocationChangeProposal({
        draft,
        state,
        currentMonth: '2026-08',
      }),
    ).toThrowError(/Allocation draft must contain exactly the active goals/)
  })

  it('rejects drafts with unknown or paused goal IDs', () => {
    const source = createBaseWorkspaceSource()
    source.goals.push({
      id: 'goal-paused',
      userId: 'user-1',
      name: 'Paused Goal',
      type: 'purchase',
      targetAmount: '500000.00',
      currency: 'ARS',
      priority: 'low',
      strategy: 'save',
      status: 'paused',
      createdAt: '2026-03-01T00:00:00Z',
    })
    const state: AllocationChangeState = {
      source,
      pendingSnapshots: [],
      pendingAllocations: [],
    }
    const draft: AllocationChangeDraft = {
      dedicationPercentage: 90,
      allocations: [
        { goalId: 'goal-1', percentage: '20.00' },
        { goalId: 'goal-2', percentage: '40.00' },
        { goalId: 'goal-paused', percentage: '40.00' },
      ],
    }

    expect(() =>
      buildAllocationChangeProposal({
        draft,
        state,
        currentMonth: '2026-08',
      }),
    ).toThrowError(/Allocation draft must contain exactly the active goals/)
  })

  it('rejects drafts whose percentages do not sum to 100%', () => {
    const source = createBaseWorkspaceSource()
    const state: AllocationChangeState = {
      source,
      pendingSnapshots: [],
      pendingAllocations: [],
    }
    const draft: AllocationChangeDraft = {
      dedicationPercentage: 90,
      allocations: [
        { goalId: 'goal-1', percentage: '25.00' },
        { goalId: 'goal-2', percentage: '50.00' },
      ],
    }

    expect(() =>
      buildAllocationChangeProposal({
        draft,
        state,
        currentMonth: '2026-08',
      }),
    ).toThrowError(/percentages must sum to 100%/)
  })

  it('yields no impacts when draft matches the baseline allocation and dedication percentage', () => {
    const source = createBaseWorkspaceSource()
    const state: AllocationChangeState = {
      source,
      pendingSnapshots: [],
      pendingAllocations: [],
    }
    const draft: AllocationChangeDraft = {
      dedicationPercentage: 90,
      allocations: [
        { goalId: 'goal-1', percentage: '60.00' },
        { goalId: 'goal-2', percentage: '40.00' },
      ],
    }

    const proposal = buildAllocationChangeProposal({
      draft,
      state,
      currentMonth: '2026-08',
    })

    expect(proposal.impacts).toHaveLength(0)
  })

  it('creates impacts when changing only the dedication percentage', () => {
    const source = createBaseWorkspaceSource()
    const state: AllocationChangeState = {
      source,
      pendingSnapshots: [],
      pendingAllocations: [],
    }
    const draft: AllocationChangeDraft = {
      dedicationPercentage: 30,
      allocations: [
        { goalId: 'goal-1', percentage: '60.00' },
        { goalId: 'goal-2', percentage: '40.00' },
      ],
    }

    const proposal = buildAllocationChangeProposal({
      draft,
      state,
      currentMonth: '2026-08',
    })

    expect(proposal.allocation.monthlyContribution).toEqual({
      amount: '150000.00',
      currency: 'ARS',
    })
    expect(proposal.impacts.length).toBeGreaterThan(0)
  })
})

describe('serializeAllocationChangeState', () => {
  it('is stable across collection and draft ordering', () => {
    const sourceA = createBaseWorkspaceSource()
    const sourceB: GoalsWorkspaceSource = {
      ...sourceA,
      goals: [...sourceA.goals].reverse(),
      allocations: [...sourceA.allocations].reverse(),
    }
    const stateA: AllocationChangeState = {
      source: sourceA,
      pendingSnapshots: [],
      pendingAllocations: [],
    }
    const stateB: AllocationChangeState = {
      source: sourceB,
      pendingSnapshots: [],
      pendingAllocations: [],
    }
    const draftA: AllocationChangeDraft = {
      dedicationPercentage: 80,
      allocations: [
        { goalId: 'goal-1', percentage: '30.00' },
        { goalId: 'goal-2', percentage: '70.00' },
      ],
    }
    const draftB: AllocationChangeDraft = {
      dedicationPercentage: 80,
      allocations: [
        { goalId: 'goal-2', percentage: '70.00' },
        { goalId: 'goal-1', percentage: '30.00' },
      ],
    }

    const strA = serializeAllocationChangeState(stateA, '2026-08', draftA)
    const strB = serializeAllocationChangeState(stateB, '2026-08', draftB)

    expect(strA).toBe(strB)
  })

  it('changes when draft allocations change', () => {
    const source = createBaseWorkspaceSource()
    const state: AllocationChangeState = {
      source,
      pendingSnapshots: [],
      pendingAllocations: [],
    }
    const draft1: AllocationChangeDraft = {
      dedicationPercentage: 90,
      allocations: [
        { goalId: 'goal-1', percentage: '30.00' },
        { goalId: 'goal-2', percentage: '70.00' },
      ],
    }
    const draft2: AllocationChangeDraft = {
      dedicationPercentage: 90,
      allocations: [
        { goalId: 'goal-1', percentage: '50.00' },
        { goalId: 'goal-2', percentage: '50.00' },
      ],
    }

    const str1 = serializeAllocationChangeState(state, '2026-08', draft1)
    const str2 = serializeAllocationChangeState(state, '2026-08', draft2)

    expect(str1).not.toBe(str2)
  })

  it('changes when draft dedication percentage changes', () => {
    const source = createBaseWorkspaceSource()
    const state: AllocationChangeState = {
      source,
      pendingSnapshots: [],
      pendingAllocations: [],
    }
    const draft1: AllocationChangeDraft = {
      dedicationPercentage: 90,
      allocations: [
        { goalId: 'goal-1', percentage: '30.00' },
        { goalId: 'goal-2', percentage: '70.00' },
      ],
    }
    const draft2: AllocationChangeDraft = {
      dedicationPercentage: 50,
      allocations: [
        { goalId: 'goal-1', percentage: '30.00' },
        { goalId: 'goal-2', percentage: '70.00' },
      ],
    }

    const str1 = serializeAllocationChangeState(state, '2026-08', draft1)
    const str2 = serializeAllocationChangeState(state, '2026-08', draft2)

    expect(str1).not.toBe(str2)
  })

  it('changes when source income changes', () => {
    const source1 = createBaseWorkspaceSource()
    const source2 = createBaseWorkspaceSource()
    source2.incomes = [
      {
        id: 'inc-1',
        sourceKind: 'salary',
        sourceId: null,
        sourceName: 'salary',
        amount: '3000000.00',
        currency: 'ARS',
        recurring: true,
        effectiveMonth: '2026-01-01',
      },
    ]

    const state1: AllocationChangeState = { source: source1, pendingSnapshots: [], pendingAllocations: [] }
    const state2: AllocationChangeState = { source: source2, pendingSnapshots: [], pendingAllocations: [] }

    const str1 = serializeAllocationChangeState(state1, '2026-08')
    const str2 = serializeAllocationChangeState(state2, '2026-08')

    expect(str1).not.toBe(str2)
  })

  it('changes when source expense changes', () => {
    const source1 = createBaseWorkspaceSource()
    const source2 = createBaseWorkspaceSource()
    source2.expenses = [
      {
        id: 'exp-1',
        sourceKind: 'housing',
        sourceId: null,
        sourceName: 'housing',
        amount: '1800000.00',
        currency: 'ARS',
        recurring: true,
        effectiveMonth: '2026-01-01',
        endMonth: null,
      },
    ]

    const state1: AllocationChangeState = { source: source1, pendingSnapshots: [], pendingAllocations: [] }
    const state2: AllocationChangeState = { source: source2, pendingSnapshots: [], pendingAllocations: [] }

    const str1 = serializeAllocationChangeState(state1, '2026-08')
    const str2 = serializeAllocationChangeState(state2, '2026-08')

    expect(str1).not.toBe(str2)
  })

  it('changes when profile goalDedicationPercentage changes', () => {
    const source1 = createBaseWorkspaceSource()
    const source2 = createBaseWorkspaceSource()
    source2.profile!.goalDedicationPercentage = '75.00'

    const state1: AllocationChangeState = { source: source1, pendingSnapshots: [], pendingAllocations: [] }
    const state2: AllocationChangeState = { source: source2, pendingSnapshots: [], pendingAllocations: [] }

    const str1 = serializeAllocationChangeState(state1, '2026-08')
    const str2 = serializeAllocationChangeState(state2, '2026-08')

    expect(str1).not.toBe(str2)
  })
})

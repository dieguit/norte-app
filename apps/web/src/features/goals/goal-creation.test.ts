import { describe, expect, it } from 'vitest'
import {
  PENDING_GOAL_ID,
  buildGoalCreationProposal,
  calculatePercentageSum,
  rebalanceAllocationEntries,
  serializeGoalCreationState,
  type GoalCreationState,
} from './goal-creation'
import type { GoalCreationDraft } from './goal-creation.schema'
import type { GoalsWorkspaceSource } from './goals'

function createBaseDraft(overrides: Partial<GoalCreationDraft> = {}): GoalCreationDraft {
  return {
    type: 'purchase',
    name: 'Auto nuevo',
    targetAmount: '3.000.000',
    currency: 'ARS',
    desiredMonth: '2027-08',
    priority: 'medium',
    strategy: 'save',
    annualReturnRate: '8',
    availability: 'available_now',
    availableFromMonth: '',
    allocations: [],
    ...overrides,
  }
}

function createBaseWorkspaceSource(): GoalsWorkspaceSource {
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

describe('buildGoalCreationProposal', () => {
  describe('Allocation defaults & Seeding', () => {
    it('seeds pending goal at 0% for existing allocations and preserves active goals', () => {
      const source = createBaseWorkspaceSource()
      const draft = createBaseDraft({
        strategy: 'save',
      })
      const state: GoalCreationState = {
        source,
        pendingSnapshots: [],
        pendingAllocations: [],
      }

      const proposal = buildGoalCreationProposal({
        draft,
        state,
        currentMonth: '2026-08',
      })

      expect(proposal.allocation).toBeDefined()
      expect(proposal.allocation.entries).toEqual([
        expect.objectContaining({ goalId: 'goal-1', percentage: '60.00', pending: false }),
        expect.objectContaining({ goalId: 'goal-2', percentage: '40.00', pending: false }),
        expect.objectContaining({ goalId: PENDING_GOAL_ID, percentage: '0.00', pending: true }),
      ])
      expect(proposal.allocation.totalPercentage).toBe('100.00')
    })

    it('seeds pending goal at 100% when no allocations exist', () => {
      const source = createBaseWorkspaceSource()
      source.allocations = []
      source.snapshots = []
      const draft = createBaseDraft({ strategy: 'invest', annualReturnRate: '10' })
      const state: GoalCreationState = {
        source,
        pendingSnapshots: [],
        pendingAllocations: [],
      }

      const proposal = buildGoalCreationProposal({
        draft,
        state,
        currentMonth: '2026-08',
      })

      expect(proposal.allocation.entries).toEqual([
        expect.objectContaining({ goalId: 'goal-1', percentage: '0.00', pending: false }),
        expect.objectContaining({ goalId: 'goal-2', percentage: '0.00', pending: false }),
        expect.objectContaining({ goalId: PENDING_GOAL_ID, percentage: '100.00', pending: true }),
      ])
      expect(proposal.allocation.totalPercentage).toBe('100.00')
    })

    it('prefers pending next-month snapshot over current snapshot when available', () => {
      const source = createBaseWorkspaceSource()
      const state: GoalCreationState = {
        source,
        pendingSnapshots: [
          {
            id: 'snap-global-sep',
            userId: 'user-1',
            effectiveMonth: '2026-09-01',
          },
        ],
        pendingAllocations: [
          { id: 'alloc-sep-1', snapshotId: 'snap-global-sep', goalId: 'goal-1', percentage: '70.00' },
          { id: 'alloc-sep-2', snapshotId: 'snap-global-sep', goalId: 'goal-2', percentage: '30.00' },
        ],
      }

      const proposal = buildGoalCreationProposal({
        draft: createBaseDraft(),
        state,
        currentMonth: '2026-08',
      })

      expect(proposal.allocation.entries).toEqual([
        expect.objectContaining({ goalId: 'goal-1', percentage: '70.00' }),
        expect.objectContaining({ goalId: 'goal-2', percentage: '30.00' }),
        expect.objectContaining({ goalId: PENDING_GOAL_ID, percentage: '0.00' }),
      ])
      expect(proposal.allocation.effectiveMonth).toBe('2026-09-01')
    })

    it('overlays user-submitted allocations when goal IDs match', () => {
      const source = createBaseWorkspaceSource()
      const state: GoalCreationState = { source, pendingSnapshots: [], pendingAllocations: [] }

      const draft = createBaseDraft({
        allocations: [
          { goalId: 'goal-1', percentage: '50.00' },
          { goalId: 'goal-2', percentage: '30.00' },
          { goalId: PENDING_GOAL_ID, percentage: '20.00' },
        ],
      })

      const proposal = buildGoalCreationProposal({
        draft,
        state,
        currentMonth: '2026-08',
      })

      expect(proposal.allocation.entries).toEqual([
        expect.objectContaining({ goalId: 'goal-1', percentage: '50.00' }),
        expect.objectContaining({ goalId: 'goal-2', percentage: '30.00' }),
        expect.objectContaining({ goalId: PENDING_GOAL_ID, percentage: '20.00' }),
      ])
    })

    it('ignores submitted allocations if goal IDs do not match server-derived entries', () => {
      const source = createBaseWorkspaceSource()
      const state: GoalCreationState = { source, pendingSnapshots: [], pendingAllocations: [] }

      const draft = createBaseDraft({
        allocations: [
          { goalId: 'different-goal', percentage: '100.00' },
        ],
      })

      const proposal = buildGoalCreationProposal({
        draft,
        state,
        currentMonth: '2026-08',
      })

      expect(proposal.allocation.entries).toEqual([
        expect.objectContaining({ goalId: 'goal-1', percentage: '60.00' }),
        expect.objectContaining({ goalId: 'goal-2', percentage: '40.00' }),
        expect.objectContaining({ goalId: PENDING_GOAL_ID, percentage: '0.00' }),
      ])
    })

    it('throws error when total allocation percentage does not equal 100%', () => {
      const source = createBaseWorkspaceSource()
      const state: GoalCreationState = { source, pendingSnapshots: [], pendingAllocations: [] }

      const draft = createBaseDraft({
        allocations: [
          { goalId: 'goal-1', percentage: '50.00' },
          { goalId: 'goal-2', percentage: '30.00' },
          { goalId: PENDING_GOAL_ID, percentage: '19.99' },
        ],
      })

      expect(() =>
        buildGoalCreationProposal({
          draft,
          state,
          currentMonth: '2026-08',
        }),
      ).toThrow()
    })
  })

  describe('Amounts & Commitments', () => {
    it('calculates allocated amounts from profile plannedMonthlyContribution with deterministic cents rounding and USD conversion', () => {
      const source = createBaseWorkspaceSource()
      source.profile!.plannedMonthlyContribution = '60000.00'
      const state: GoalCreationState = { source, pendingSnapshots: [], pendingAllocations: [] }

      const draft = createBaseDraft({
        currency: 'USD',
        allocations: [
          { goalId: 'goal-1', percentage: '60.00' }, // goal-1 is USD: 60% of 60,000 ARS = 36,000 ARS -> 24 USD (at 1500)
          { goalId: 'goal-2', percentage: '0.00' },
          { goalId: PENDING_GOAL_ID, percentage: '40.00' }, // pending is USD: 40% of 60,000 ARS = 24,000 ARS -> 16 USD (at 1500)
        ],
      })

      const proposal = buildGoalCreationProposal({
        draft,
        state,
        currentMonth: '2026-08',
      })

      const pendingEntry = proposal.allocation.entries.find((e) => e.goalId === PENDING_GOAL_ID)
      expect(pendingEntry?.allocatedBaseAmount).toEqual({ amount: '24000.00', currency: 'ARS' })
      expect(pendingEntry?.allocatedDestinationAmount).toEqual({ amount: '16.00', currency: 'USD' })

      const goal1Entry = proposal.allocation.entries.find((e) => e.goalId === 'goal-1')
      expect(goal1Entry?.allocatedBaseAmount).toEqual({ amount: '36000.00', currency: 'ARS' })
      expect(goal1Entry?.allocatedDestinationAmount).toEqual({ amount: '24.00', currency: 'USD' })
    })

    it('converts full planned monthly contribution to USD at fixed rate 1500', () => {
      const source = createBaseWorkspaceSource()
      source.profile!.plannedMonthlyContribution = '60000.00'
      const state: GoalCreationState = { source, pendingSnapshots: [], pendingAllocations: [] }

      const draft = createBaseDraft({
        currency: 'USD',
        allocations: [
          { goalId: 'goal-1', percentage: '0.00' },
          { goalId: 'goal-2', percentage: '0.00' },
          { goalId: PENDING_GOAL_ID, percentage: '100.00' },
        ],
      })

      const proposal = buildGoalCreationProposal({
        draft,
        state,
        currentMonth: '2026-08',
      })

      const pendingEntry = proposal.allocation.entries.find((e) => e.goalId === PENDING_GOAL_ID)
      expect(pendingEntry?.allocatedDestinationAmount).toEqual({ amount: '40.00', currency: 'USD' })
    })


    it('sets undefined amounts and commitment_absent projection when no plannedMonthlyContribution exists', () => {
      const source = createBaseWorkspaceSource()
      source.profile!.plannedMonthlyContribution = null as any
      const state: GoalCreationState = { source, pendingSnapshots: [], pendingAllocations: [] }

      const draft = createBaseDraft({
        allocations: [
          { goalId: 'goal-1', percentage: '0.00' },
          { goalId: 'goal-2', percentage: '0.00' },
          { goalId: PENDING_GOAL_ID, percentage: '100.00' },
        ],
      })

      const proposal = buildGoalCreationProposal({
        draft,
        state,
        currentMonth: '2026-08',
      })

      expect(proposal.allocation.monthlyContribution).toBeUndefined()
      expect(proposal.allocation.entries[0].allocatedBaseAmount).toBeUndefined()

      const pendingImpact = proposal.impacts.find((i) => i.goalId === PENDING_GOAL_ID)
      expect(pendingImpact?.after).toEqual({ status: 'commitment_absent' })
    })
  })

  describe('Emergency Fund Target Derivation', () => {
    it('derives emergency fund target only when profile has known expenses', () => {
      const source = createBaseWorkspaceSource()
      source.profile = {
        userId: 'user-1',
        baseCurrency: 'ARS',
        expensesKnowledge: 'known',
        plannedMonthlyContribution: '60000.00',
        onboardingCompleted: true,
      }
      source.expenses = [
        {
          id: 'exp-1',
          sourceKind: 'housing',
          sourceId: null,
          sourceName: 'Alquiler',
          amount: '250000.00',
          currency: 'ARS',
          recurring: true,
          effectiveMonth: '2026-01-01',
          endMonth: null,
        },
      ]
      const state: GoalCreationState = { source, pendingSnapshots: [], pendingAllocations: [] }

      const draft = createBaseDraft({
        type: 'emergency_fund',
        currency: 'USD',
        targetAmount: '',
        strategy: 'save',
      })

      const proposal = buildGoalCreationProposal({
        draft,
        state,
        currentMonth: '2026-08',
      })

      // 250.000 * 3 / 1500 = 500 USD
      expect(proposal.normalizedGoal.targetAmount).toEqual({ amount: '500.00', currency: 'USD' })
      expect(proposal.normalizedGoal.emergencyFundMonths).toBe(3)
    })

    it('leaves targetAmount undefined when profile expenses knowledge is unknown', () => {
      const source = createBaseWorkspaceSource()
      source.profile = {
        userId: 'user-1',
        baseCurrency: 'ARS',
        expensesKnowledge: 'unknown',
        plannedMonthlyContribution: '60000.00',
        onboardingCompleted: true,
      }
      source.expenses = []
      const state: GoalCreationState = { source, pendingSnapshots: [], pendingAllocations: [] }

      const draft = createBaseDraft({
        type: 'emergency_fund',
        currency: 'USD',
        targetAmount: '',
        strategy: 'save',
      })

      const proposal = buildGoalCreationProposal({
        draft,
        state,
        currentMonth: '2026-08',
      })

      expect(proposal.normalizedGoal.targetAmount).toBeUndefined()
      expect(proposal.normalizedGoal.emergencyFundMonths).toBe(3)
    })
  })

  describe('Impacts and Projections', () => {
    it('always includes pending goal in impacts with before: { status: "not_created" }', () => {
      const source = createBaseWorkspaceSource()
      const state: GoalCreationState = { source, pendingSnapshots: [], pendingAllocations: [] }

      const proposal = buildGoalCreationProposal({
        draft: createBaseDraft(),
        state,
        currentMonth: '2026-08',
      })

      const pendingImpact = proposal.impacts.find((i) => i.goalId === PENDING_GOAL_ID)
      expect(pendingImpact).toBeDefined()
      expect(pendingImpact?.goalName).toBe('Auto nuevo')
      expect(pendingImpact?.before).toEqual({ status: 'not_created' })
      expect(pendingImpact?.after).toBeDefined()
    })

    it('returns only existing goals whose monthly amount or projection changed', () => {
      const source = createBaseWorkspaceSource()
      const state: GoalCreationState = { source, pendingSnapshots: [], pendingAllocations: [] }

      // When seeded with defaults, pending goal gets 0%, goal-1 gets 60%, goal-2 gets 40%.
      // Neither goal-1 nor goal-2 amounts or projections change!
      const defaultProposal = buildGoalCreationProposal({
        draft: createBaseDraft(),
        state,
        currentMonth: '2026-08',
      })

      expect(defaultProposal.impacts).toHaveLength(1)
      expect(defaultProposal.impacts[0].goalId).toBe(PENDING_GOAL_ID)

      // When user reduces goal-1 from 60% to 20% to give 40% to pending goal:
      const changedProposal = buildGoalCreationProposal({
        draft: createBaseDraft({
          allocations: [
            { goalId: 'goal-1', percentage: '20.00' },
            { goalId: 'goal-2', percentage: '40.00' },
            { goalId: PENDING_GOAL_ID, percentage: '40.00' },
          ],
        }),
        state,
        currentMonth: '2026-08',
      })

      // goal-1 changed (60% -> 20%), goal-2 did not change (40% -> 40%)
      const impactIds = changedProposal.impacts.map((i) => i.goalId)
      expect(impactIds).toContain(PENDING_GOAL_ID)
      expect(impactIds).toContain('goal-1')
      expect(impactIds).not.toContain('goal-2')

      const goal1Impact = changedProposal.impacts.find((i) => i.goalId === 'goal-1')
      expect(goal1Impact?.before).toMatchObject({
        status: 'existing',
        allocatedMonthlyAmounts: [{ amount: '24.00', currency: 'USD' }],
      })
    })
  })

  describe('Investment rate and availability normalization', () => {
    it('normalizes desiredDate to YYYY-MM-01 and investment fields only for invest strategy', () => {
      const source = createBaseWorkspaceSource()
      const state: GoalCreationState = { source, pendingSnapshots: [], pendingAllocations: [] }

      const draft = createBaseDraft({
        desiredMonth: '2027-05',
        strategy: 'invest',
        annualReturnRate: '9,5',
        availability: 'available_from',
        availableFromMonth: '2027-01',
      })

      const proposal = buildGoalCreationProposal({
        draft,
        state,
        currentMonth: '2026-08',
      })

      expect(proposal.normalizedGoal.desiredDate).toBe('2027-05-01')
      expect(proposal.normalizedGoal.strategy).toBe('invest')
      expect(proposal.investment).toEqual({
        annualReturnRate: '9.5',
        availability: 'available_from',
        availableFrom: '2027-01-01',
      })
      expect(proposal.proposedSource.investmentPositions.some((p) => p.goalId === PENDING_GOAL_ID)).toBe(true)
    })

    it('does not create investment position when strategy is save', () => {
      const source = createBaseWorkspaceSource()
      const state: GoalCreationState = { source, pendingSnapshots: [], pendingAllocations: [] }

      const draft = createBaseDraft({
        strategy: 'save',
      })

      const proposal = buildGoalCreationProposal({
        draft,
        state,
        currentMonth: '2026-08',
      })

      expect(proposal.normalizedGoal.strategy).toBe('save')
      expect(proposal.investment).toBeUndefined()
      expect(proposal.proposedSource.investmentPositions.some((p) => p.goalId === PENDING_GOAL_ID)).toBe(false)
    })
  })

  describe('Editing an existing active goal', () => {
    it('replaces the existing goal and updates its investment position while preserving goal id, status, createdAt, and position currentValue', () => {
      const source = createBaseWorkspaceSource()
      // Setup goal-2 as invest with existing position
      source.goals[1] = {
        ...source.goals[1],
        strategy: 'invest',
      }
      source.investmentPositions = [
        {
          id: 'pos-goal-2',
          goalId: 'goal-2',
          currentValue: '5000.00',
          currency: 'ARS',
          annualReturnRate: '6.0',
          availability: 'available_now',
          availableFrom: null,
        },
      ]

      const state: GoalCreationState = {
        source,
        pendingSnapshots: [],
        pendingAllocations: [],
      }

      const draft = createBaseDraft({
        name: 'Casa propia',
        strategy: 'invest',
        annualReturnRate: '7.5',
        allocations: [
          { goalId: 'goal-1', percentage: '40.00' },
          { goalId: 'goal-2', percentage: '60.00' },
        ],
      })

      const proposal = buildGoalCreationProposal({
        draft,
        state,
        currentMonth: '2026-08',
        subjectGoalId: 'goal-2',
      })

      expect(proposal.proposedSource.goals).toHaveLength(2)
      expect(proposal.proposedSource.goals.find((g) => g.id === 'goal-2')).toMatchObject({
        id: 'goal-2',
        name: 'Casa propia',
        strategy: 'invest',
        status: 'active',
        createdAt: '2026-02-01T00:00:00Z',
      })
      expect(proposal.proposedSource.investmentPositions.find((p) => p.goalId === 'goal-2')).toMatchObject({
        id: 'pos-goal-2',
        goalId: 'goal-2',
        currentValue: '5000.00',
        annualReturnRate: '7.5',
      })

      // Allocation entries should reference existing goals, not pending-goal
      expect(proposal.allocation.entries).toEqual([
        expect.objectContaining({ goalId: 'goal-1', percentage: '40.00', pending: false }),
        expect.objectContaining({ goalId: 'goal-2', percentage: '60.00', pending: false, goalName: 'Casa propia' }),
      ])
      expect(proposal.allocation.entries.some((e) => e.goalId === PENDING_GOAL_ID)).toBe(false)

      // Impact should describe existing goal with status 'existing'
      const goal2Impact = proposal.impacts.find((i) => i.goalId === 'goal-2')
      expect(goal2Impact).toBeDefined()
      expect(goal2Impact?.goalName).toBe('Casa propia')
      expect(goal2Impact?.before).toMatchObject({
        status: 'existing',
      })
      expect(proposal.impacts.some((i) => i.goalId === PENDING_GOAL_ID)).toBe(false)
    })

    it('throws error when subjectGoalId is not found or is not active', () => {
      const source = createBaseWorkspaceSource()
      const state: GoalCreationState = { source, pendingSnapshots: [], pendingAllocations: [] }

      expect(() =>
        buildGoalCreationProposal({
          draft: createBaseDraft(),
          state,
          currentMonth: '2026-08',
          subjectGoalId: 'non-existent-goal',
        }),
      ).toThrow('Goal not found or is not active.')
    })

    it('removes investment position when strategy changes from invest to save on edit', () => {
      const source = createBaseWorkspaceSource()
      source.goals[1] = { ...source.goals[1], strategy: 'invest' }
      source.investmentPositions = [
        {
          id: 'pos-goal-2',
          goalId: 'goal-2',
          currentValue: '5000.00',
          currency: 'ARS',
          annualReturnRate: '6.0',
          availability: 'available_now',
          availableFrom: null,
        },
      ]
      const state: GoalCreationState = { source, pendingSnapshots: [], pendingAllocations: [] }

      const draft = createBaseDraft({
        strategy: 'save',
        allocations: [
          { goalId: 'goal-1', percentage: '60.00' },
          { goalId: 'goal-2', percentage: '40.00' },
        ],
      })

      const proposal = buildGoalCreationProposal({
        draft,
        state,
        currentMonth: '2026-08',
        subjectGoalId: 'goal-2',
      })

      expect(proposal.proposedSource.investmentPositions.find((p) => p.goalId === 'goal-2')).toBeUndefined()
    })

    it('creates investment position with 0.00 currentValue when strategy changes from save to invest on edit', () => {
      const source = createBaseWorkspaceSource()
      const state: GoalCreationState = { source, pendingSnapshots: [], pendingAllocations: [] }

      const draft = createBaseDraft({
        strategy: 'invest',
        annualReturnRate: '9.0',
        allocations: [
          { goalId: 'goal-1', percentage: '60.00' },
          { goalId: 'goal-2', percentage: '40.00' },
        ],
      })

      const proposal = buildGoalCreationProposal({
        draft,
        state,
        currentMonth: '2026-08',
        subjectGoalId: 'goal-2',
      })

      expect(proposal.proposedSource.investmentPositions.find((p) => p.goalId === 'goal-2')).toMatchObject({
        goalId: 'goal-2',
        currentValue: '0.00',
        annualReturnRate: '9.0',
      })
    })
  })
})

describe('serializeGoalCreationState', () => {
  it('is deterministic and order-independent for collections', () => {
    const source = createBaseWorkspaceSource()
    const state1: GoalCreationState = { source, pendingSnapshots: [], pendingAllocations: [] }
    const state2: GoalCreationState = {
      source: {
        ...source,
        goals: [source.goals[1], source.goals[0]],
        allocations: [source.allocations[1], source.allocations[0]],
      },
      pendingSnapshots: [],
      pendingAllocations: [],
    }

    expect(serializeGoalCreationState(state1, '2026-08')).toBe(
      serializeGoalCreationState(state2, '2026-08'),
    )
  })

  it('changes fingerprint when currentMonth changes', () => {
    const source = createBaseWorkspaceSource()
    const state: GoalCreationState = { source, pendingSnapshots: [], pendingAllocations: [] }

    expect(serializeGoalCreationState(state, '2026-08')).not.toBe(
      serializeGoalCreationState(state, '2026-09'),
    )
  })

  it('changes fingerprint when profile plannedMonthlyContribution changes', () => {
    const source = createBaseWorkspaceSource()
    const state1: GoalCreationState = { source, pendingSnapshots: [], pendingAllocations: [] }
    const state2: GoalCreationState = {
      source: {
        ...source,
        profile: {
          ...source.profile!,
          plannedMonthlyContribution: '80000.00',
        },
      },
      pendingSnapshots: [],
      pendingAllocations: [],
    }

    expect(serializeGoalCreationState(state1, '2026-08')).not.toBe(
      serializeGoalCreationState(state2, '2026-08'),
    )
  })

  it('changes fingerprint when allocations change', () => {
    const source = createBaseWorkspaceSource()
    const state1: GoalCreationState = { source, pendingSnapshots: [], pendingAllocations: [] }
    const state2: GoalCreationState = {
      source: {
        ...source,
        allocations: [
          { ...source.allocations[0], percentage: '59.00' },
          { ...source.allocations[1], percentage: '41.00' },
        ],
      },
      pendingSnapshots: [],
      pendingAllocations: [],
    }

    expect(serializeGoalCreationState(state1, '2026-08')).not.toBe(
      serializeGoalCreationState(state2, '2026-08'),
    )
  })

  it('changes fingerprint when draft allocations change', () => {
    const source = createBaseWorkspaceSource()
    const draft1 = createBaseDraft({
      allocations: [
        { goalId: 'goal-1', percentage: '60.00' },
        { goalId: 'goal-2', percentage: '40.00' },
      ],
    })
    const draft2 = createBaseDraft({
      allocations: [
        { goalId: 'goal-1', percentage: '55.00' },
        { goalId: 'goal-2', percentage: '45.00' },
      ],
    })

    expect(serializeGoalCreationState(source, '2026-08', draft1)).not.toBe(
      serializeGoalCreationState(source, '2026-08', draft2),
    )
  })
})


describe('rebalanceAllocationEntries', () => {
  it('rebalances pending entry from 0 to 20 proportionally across existing 70/30 entries', () => {
    const entries = [
      { goalId: PENDING_GOAL_ID, percentage: '0.00' },
      { goalId: 'goal-1', percentage: '70.00' },
      { goalId: 'goal-2', percentage: '30.00' },
    ]

    const result = rebalanceAllocationEntries(entries, PENDING_GOAL_ID, '20')

    expect(result).toMatchObject([
      { goalId: PENDING_GOAL_ID, percentage: '20.00' },
      { goalId: 'goal-1', percentage: '56.00' },
      { goalId: 'goal-2', percentage: '24.00' },
    ])
    expect(calculatePercentageSum(result).toFixed(2)).toBe('100.00')
  })

  it('rebalances when modifying an existing entry instead of pending goal', () => {
    const entries = [
      { goalId: PENDING_GOAL_ID, percentage: '20.00' },
      { goalId: 'goal-1', percentage: '56.00' },
      { goalId: 'goal-2', percentage: '24.00' },
    ]

    // Modify goal-1 from 56.00 to 50: remaining 50 distributed to pending (20/44) and goal-2 (24/44)
    const result = rebalanceAllocationEntries(entries, 'goal-1', '50')

    expect(result).toMatchObject([
      { goalId: PENDING_GOAL_ID, percentage: '22.73' },
      { goalId: 'goal-1', percentage: '50.00' },
      { goalId: 'goal-2', percentage: '27.27' },
    ])
    expect(calculatePercentageSum(result).toFixed(2)).toBe('100.00')
  })

  it('distributes remaining percentage equally when all other entries are zero', () => {
    const entries = [
      { goalId: PENDING_GOAL_ID, percentage: '100.00' },
      { goalId: 'goal-1', percentage: '0.00' },
      { goalId: 'goal-2', percentage: '0.00' },
    ]

    const result = rebalanceAllocationEntries(entries, PENDING_GOAL_ID, '40')

    expect(result).toMatchObject([
      { goalId: PENDING_GOAL_ID, percentage: '40.00' },
      { goalId: 'goal-1', percentage: '30.00' },
      { goalId: 'goal-2', percentage: '30.00' },
    ])
    expect(calculatePercentageSum(result).toFixed(2)).toBe('100.00')
  })

  it('sets other entries to 0.00 when selected entry is 100%', () => {
    const entries = [
      { goalId: PENDING_GOAL_ID, percentage: '20.00' },
      { goalId: 'goal-1', percentage: '50.00' },
      { goalId: 'goal-2', percentage: '30.00' },
    ]

    const result = rebalanceAllocationEntries(entries, PENDING_GOAL_ID, '100')

    expect(result).toMatchObject([
      { goalId: PENDING_GOAL_ID, percentage: '100.00' },
      { goalId: 'goal-1', percentage: '0.00' },
      { goalId: 'goal-2', percentage: '0.00' },
    ])
    expect(calculatePercentageSum(result).toFixed(2)).toBe('100.00')
  })

  it('keeps single-entry group at 100.00 regardless of valid input', () => {
    const entries = [{ goalId: PENDING_GOAL_ID, percentage: '100.00' }]

    const result = rebalanceAllocationEntries(entries, PENDING_GOAL_ID, '50')

    expect(result).toMatchObject([
      { goalId: PENDING_GOAL_ID, percentage: '100.00' },
    ])
    expect(calculatePercentageSum(result).toFixed(2)).toBe('100.00')
  })

  it('produces exact 100.00 sum for fractional divisions', () => {
    // If pending is set to 33.33 with equal distribution among others
    const zeroEntries = [
      { goalId: PENDING_GOAL_ID, percentage: '0.00' },
      { goalId: 'goal-1', percentage: '0.00' },
      { goalId: 'goal-2', percentage: '0.00' },
      { goalId: 'goal-3', percentage: '0.00' },
    ]
    const result = rebalanceAllocationEntries(zeroEntries, PENDING_GOAL_ID, '10')

    // 90 divided among 3 others = 30.00 each
    expect(result).toMatchObject([
      { goalId: PENDING_GOAL_ID, percentage: '10.00' },
      { goalId: 'goal-1', percentage: '30.00' },
      { goalId: 'goal-2', percentage: '30.00' },
      { goalId: 'goal-3', percentage: '30.00' },
    ])
    expect(calculatePercentageSum(result).toFixed(2)).toBe('100.00')

    // 100 divided among 3 goals when pending is 0
    const threeGoals = [
      { goalId: 'goal-1', percentage: '0.00' },
      { goalId: 'goal-2', percentage: '0.00' },
      { goalId: 'goal-3', percentage: '0.00' },
    ]
    const res3 = rebalanceAllocationEntries(threeGoals, 'goal-1', '0')
    expect(res3).toMatchObject([
      { goalId: 'goal-1', percentage: '0.00' },
      { goalId: 'goal-2', percentage: '50.00' },
      { goalId: 'goal-3', percentage: '50.00' },
    ])
    expect(calculatePercentageSum(res3).toFixed(2)).toBe('100.00')

    // 3 entries with fractional shares: pending 0, goal-1 33.33, goal-2 33.33, goal-3 33.34
    // set pending to 10 -> remaining 90 divided proportionally (1/3 each = 30.00)
    const thirdEntries = [
      { goalId: PENDING_GOAL_ID, percentage: '0.00' },
      { goalId: 'goal-1', percentage: '33.33' },
      { goalId: 'goal-2', percentage: '33.33' },
      { goalId: 'goal-3', percentage: '33.34' },
    ]
    const resThird = rebalanceAllocationEntries(thirdEntries, PENDING_GOAL_ID, '10')
    expect(calculatePercentageSum(resThird).toFixed(2)).toBe('100.00')
  })

  it('handles comma as decimal separator in valid inputs', () => {
    const entries = [
      { goalId: PENDING_GOAL_ID, percentage: '0.00' },
      { goalId: 'goal-1', percentage: '70.00' },
      { goalId: 'goal-2', percentage: '30.00' },
    ]

    const result = rebalanceAllocationEntries(entries, PENDING_GOAL_ID, '20,5')

    expect(result).toMatchObject([
      { goalId: PENDING_GOAL_ID, percentage: '20.50' },
      { goalId: 'goal-1', percentage: '55.65' },
      { goalId: 'goal-2', percentage: '23.85' },
    ])
    expect(calculatePercentageSum(result).toFixed(2)).toBe('100.00')
  })

  it('returns raw text without rebalancing other entries when input is invalid or out of bounds', () => {
    const entries = [
      { goalId: PENDING_GOAL_ID, percentage: '20.00' },
      { goalId: 'goal-1', percentage: '50.00' },
      { goalId: 'goal-2', percentage: '30.00' },
    ]

    // Non-numeric
    const nonNumeric = rebalanceAllocationEntries(entries, PENDING_GOAL_ID, 'abc')
    expect(nonNumeric).toMatchObject([
      { goalId: PENDING_GOAL_ID, percentage: 'abc' },
      { goalId: 'goal-1', percentage: '50.00' },
      { goalId: 'goal-2', percentage: '30.00' },
    ])

    // Empty string
    const emptyInput = rebalanceAllocationEntries(entries, PENDING_GOAL_ID, '')
    expect(emptyInput).toMatchObject([
      { goalId: PENDING_GOAL_ID, percentage: '' },
      { goalId: 'goal-1', percentage: '50.00' },
      { goalId: 'goal-2', percentage: '30.00' },
    ])

    // Negative
    const negative = rebalanceAllocationEntries(entries, PENDING_GOAL_ID, '-10')
    expect(negative).toMatchObject([
      { goalId: PENDING_GOAL_ID, percentage: '-10' },
      { goalId: 'goal-1', percentage: '50.00' },
      { goalId: 'goal-2', percentage: '30.00' },
    ])

    // Greater than 100
    const over100 = rebalanceAllocationEntries(entries, PENDING_GOAL_ID, '105')
    expect(over100).toMatchObject([
      { goalId: PENDING_GOAL_ID, percentage: '105' },
      { goalId: 'goal-1', percentage: '50.00' },
      { goalId: 'goal-2', percentage: '30.00' },
    ])
  })
})



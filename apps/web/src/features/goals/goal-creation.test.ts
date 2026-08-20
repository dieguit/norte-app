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
    saveEnabled: true,
    investEnabled: false,
    defineSaveCommitment: false,
    saveMonthlyCommitment: '',
    defineInvestCommitment: false,
    investMonthlyCommitment: '',
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
      approximateMonthlyIncome: '2000000.00',
      approximateMonthlyExpenses: '1500000.00',
      expensesKnowledge: 'known',
      onboardingCompleted: true,
    },
    goals: [
      {
        id: 'goal-1',
        userId: 'user-1',
        name: 'Fondo de emergencia',
        type: 'emergency_fund',
        targetAmount: '6000.00',
        currency: 'ARS',
        priority: 'high',
        status: 'active',
        saveEnabled: true,
        investEnabled: true,
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
        status: 'active',
        saveEnabled: true,
        investEnabled: true,
        createdAt: '2026-02-01T00:00:00Z',
      },
    ],
    savingsPositions: [
      { id: 'sav-1', goalId: 'goal-1', amount: '100000.00', currency: 'ARS' },
      { id: 'sav-2', goalId: 'goal-2', amount: '50000.00', currency: 'ARS' },
    ],
    investmentPositions: [],
    channels: [
      { id: 'ch-save-ars', userId: 'user-1', fundingMethod: 'save', destinationCurrency: 'ARS' },
    ],
    snapshots: [
      {
        id: 'snap-save-ars-aug',
        channelId: 'ch-save-ars',
        monthlyCommitmentAmount: '100000.00',
        baseCurrency: 'ARS',
        commitmentStatus: 'active',
        effectiveMonth: '2026-08-01',
      },
    ],
    allocations: [
      { id: 'alloc-1', snapshotId: 'snap-save-ars-aug', goalId: 'goal-1', percentage: '60.00' },
      { id: 'alloc-2', snapshotId: 'snap-save-ars-aug', goalId: 'goal-2', percentage: '40.00' },
    ],
  }
}

describe('buildGoalCreationProposal', () => {
  describe('Allocation defaults & Seeding', () => {
    it('seeds pending goal at 0% for existing combinations and 100% for new combinations', () => {
      const source = createBaseWorkspaceSource()
      const draft = createBaseDraft({
        saveEnabled: true,
        investEnabled: true,
        annualReturnRate: '10',
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

      // save:ARS exists in source (60/40) -> pending goal should get 0.00%
      const saveGroup = proposal.allocationGroups.find((g) => g.key === 'save:ARS')
      expect(saveGroup).toBeDefined()
      expect(saveGroup?.entries).toEqual([
        expect.objectContaining({ goalId: 'goal-1', percentage: '60.00', pending: false }),
        expect.objectContaining({ goalId: 'goal-2', percentage: '40.00', pending: false }),
        expect.objectContaining({ goalId: PENDING_GOAL_ID, percentage: '0.00', pending: true }),
      ])
      expect(saveGroup?.totalPercentage).toBe('100.00')

      // invest:ARS is new -> existing goals get 0.00%, pending gets 100.00%
      const investGroup = proposal.allocationGroups.find((g) => g.key === 'invest:ARS')
      expect(investGroup).toBeDefined()
      expect(investGroup?.entries).toEqual([
        expect.objectContaining({ goalId: 'goal-1', percentage: '0.00', pending: false }),
        expect.objectContaining({ goalId: 'goal-2', percentage: '0.00', pending: false }),
        expect.objectContaining({ goalId: PENDING_GOAL_ID, percentage: '100.00', pending: true }),
      ])
      expect(investGroup?.totalPercentage).toBe('100.00')
    })

    it('prefers pending next-month snapshot over current snapshot when available', () => {
      const source = createBaseWorkspaceSource()
      const state: GoalCreationState = {
        source,
        pendingSnapshots: [
          {
            id: 'snap-save-ars-sep',
            channelId: 'ch-save-ars',
            monthlyCommitmentAmount: '120000.00',
            baseCurrency: 'ARS',
            commitmentStatus: 'active',
            effectiveMonth: '2026-09-01',
          },
        ],
        pendingAllocations: [
          { id: 'alloc-sep-1', snapshotId: 'snap-save-ars-sep', goalId: 'goal-1', percentage: '70.00' },
          { id: 'alloc-sep-2', snapshotId: 'snap-save-ars-sep', goalId: 'goal-2', percentage: '30.00' },
        ],
      }

      const proposal = buildGoalCreationProposal({
        draft: createBaseDraft({ saveEnabled: true, investEnabled: false }),
        state,
        currentMonth: '2026-08',
      })

      const saveGroup = proposal.allocationGroups.find((g) => g.key === 'save:ARS')
      expect(saveGroup?.entries).toEqual([
        expect.objectContaining({ goalId: 'goal-1', percentage: '70.00' }),
        expect.objectContaining({ goalId: 'goal-2', percentage: '30.00' }),
        expect.objectContaining({ goalId: PENDING_GOAL_ID, percentage: '0.00' }),
      ])
      expect(saveGroup?.monthlyCommitment).toEqual({ amount: '120000.00', currency: 'ARS' })
    })

    it('overlays user-submitted allocations when group key and goal IDs match', () => {
      const source = createBaseWorkspaceSource()
      const state: GoalCreationState = { source, pendingSnapshots: [], pendingAllocations: [] }

      const draft = createBaseDraft({
        saveEnabled: true,
        investEnabled: false,
        allocations: [
          {
            key: 'save:ARS',
            fundingMethod: 'save',
            destinationCurrency: 'ARS',
            entries: [
              { goalId: 'goal-1', percentage: '50.00' },
              { goalId: 'goal-2', percentage: '30.00' },
              { goalId: PENDING_GOAL_ID, percentage: '20.00' },
            ],
          },
        ],
      })

      const proposal = buildGoalCreationProposal({
        draft,
        state,
        currentMonth: '2026-08',
      })

      const saveGroup = proposal.allocationGroups.find((g) => g.key === 'save:ARS')
      expect(saveGroup?.entries).toEqual([
        expect.objectContaining({ goalId: 'goal-1', percentage: '50.00' }),
        expect.objectContaining({ goalId: 'goal-2', percentage: '30.00' }),
        expect.objectContaining({ goalId: PENDING_GOAL_ID, percentage: '20.00' }),
      ])
    })

    it('ignores submitted allocations if goal IDs do not match server-derived group', () => {
      const source = createBaseWorkspaceSource()
      const state: GoalCreationState = { source, pendingSnapshots: [], pendingAllocations: [] }

      const draft = createBaseDraft({
        saveEnabled: true,
        investEnabled: false,
        allocations: [
          {
            key: 'save:ARS',
            fundingMethod: 'save',
            destinationCurrency: 'ARS',
            entries: [
              { goalId: 'different-goal', percentage: '100.00' },
            ],
          },
        ],
      })

      const proposal = buildGoalCreationProposal({
        draft,
        state,
        currentMonth: '2026-08',
      })

      const saveGroup = proposal.allocationGroups.find((g) => g.key === 'save:ARS')
      expect(saveGroup?.entries).toEqual([
        expect.objectContaining({ goalId: 'goal-1', percentage: '60.00' }),
        expect.objectContaining({ goalId: 'goal-2', percentage: '40.00' }),
        expect.objectContaining({ goalId: PENDING_GOAL_ID, percentage: '0.00' }),
      ])
    })

    it('throws error when total allocation percentage does not equal 100%', () => {
      const source = createBaseWorkspaceSource()
      const state: GoalCreationState = { source, pendingSnapshots: [], pendingAllocations: [] }

      const draft = createBaseDraft({
        saveEnabled: true,
        investEnabled: false,
        allocations: [
          {
            key: 'save:ARS',
            fundingMethod: 'save',
            destinationCurrency: 'ARS',
            entries: [
              { goalId: 'goal-1', percentage: '50.00' },
              { goalId: 'goal-2', percentage: '30.00' },
              { goalId: PENDING_GOAL_ID, percentage: '19.99' },
            ],
          },
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
    it('uses calculateAllocationAmounts to provide deterministic cents allocation', () => {
      const source = createBaseWorkspaceSource()
      source.snapshots[0].monthlyCommitmentAmount = '100.00' // $100 ARS
      const state: GoalCreationState = { source, pendingSnapshots: [], pendingAllocations: [] }

      const draft = createBaseDraft({
        saveEnabled: true,
        investEnabled: false,
        allocations: [
          {
            key: 'save:ARS',
            fundingMethod: 'save',
            destinationCurrency: 'ARS',
            entries: [
              { goalId: 'goal-1', percentage: '33.33' },
              { goalId: 'goal-2', percentage: '33.33' },
              { goalId: PENDING_GOAL_ID, percentage: '33.34' },
            ],
          },
        ],
      })

      const proposal = buildGoalCreationProposal({
        draft,
        state,
        currentMonth: '2026-08',
      })

      const saveGroup = proposal.allocationGroups.find((g) => g.key === 'save:ARS')
      expect(saveGroup?.entries[0].allocatedBaseAmount).toEqual({ amount: '33.33', currency: 'ARS' })
      expect(saveGroup?.entries[1].allocatedBaseAmount).toEqual({ amount: '33.33', currency: 'ARS' })
      expect(saveGroup?.entries[2].allocatedBaseAmount).toEqual({ amount: '33.34', currency: 'ARS' })
    })

    it('handles draft-defined monthly commitments', () => {
      const source = createBaseWorkspaceSource()
      const state: GoalCreationState = { source, pendingSnapshots: [], pendingAllocations: [] }

      const draft = createBaseDraft({
        saveEnabled: true,
        defineSaveCommitment: true,
        saveMonthlyCommitment: '250.000',
      })

      const proposal = buildGoalCreationProposal({
        draft,
        state,
        currentMonth: '2026-08',
      })

      const saveGroup = proposal.allocationGroups.find((g) => g.key === 'save:ARS')
      expect(saveGroup?.monthlyCommitment).toEqual({ amount: '250000.00', currency: 'ARS' })
    })

    it('sets undefined amounts and commitment_absent projection when no commitment exists', () => {
      const source = createBaseWorkspaceSource()
      source.snapshots = [] // No existing snapshot
      source.channels = []
      const state: GoalCreationState = { source, pendingSnapshots: [], pendingAllocations: [] }

      const draft = createBaseDraft({
        saveEnabled: true,
        defineSaveCommitment: false,
        saveMonthlyCommitment: '',
      })

      const proposal = buildGoalCreationProposal({
        draft,
        state,
        currentMonth: '2026-08',
      })

      const saveGroup = proposal.allocationGroups.find((g) => g.key === 'save:ARS')
      expect(saveGroup?.monthlyCommitment).toBeUndefined()
      expect(saveGroup?.destinationCommitment).toBeUndefined()
      expect(saveGroup?.entries[0].allocatedBaseAmount).toBeUndefined()

      const pendingImpact = proposal.impacts.find((i) => i.goalId === PENDING_GOAL_ID)
      expect(pendingImpact?.after).toEqual({ status: 'commitment_absent' })
    })

    it('converts ARS commitment to USD destination using PLANNING_ARS_PER_USD', () => {
      const source = createBaseWorkspaceSource()
      source.channels = [{ id: 'ch-save-usd', userId: 'user-1', fundingMethod: 'save', destinationCurrency: 'USD' }]
      source.snapshots = [{
        id: 'snap-save-usd',
        channelId: 'ch-save-usd',
        monthlyCommitmentAmount: '150000.00', // 150.000 ARS -> 100 USD (at 1500)
        baseCurrency: 'ARS',
        commitmentStatus: 'active',
        effectiveMonth: '2026-08-01',
      }]
      source.allocations = []
      source.goals = []
      source.savingsPositions = []
      const state: GoalCreationState = { source, pendingSnapshots: [], pendingAllocations: [] }

      const draft = createBaseDraft({
        currency: 'USD',
        targetAmount: '1000',
        saveEnabled: true,
      })

      const proposal = buildGoalCreationProposal({
        draft,
        state,
        currentMonth: '2026-08',
      })

      const saveGroup = proposal.allocationGroups.find((g) => g.key === 'save:USD')
      expect(saveGroup?.destinationCommitment).toEqual({ amount: '100.00', currency: 'USD' })
      expect(saveGroup?.entries[0].allocatedDestinationAmount).toEqual({ amount: '100.00', currency: 'USD' })
    })
  })

  describe('Emergency Fund Target Derivation', () => {
    it('derives emergency fund target only when profile has known expenses', () => {
      const source = createBaseWorkspaceSource()
      source.profile = {
        userId: 'user-1',
        baseCurrency: 'ARS',
        approximateMonthlyIncome: '2000000.00',
        approximateMonthlyExpenses: '1500000.00',
        expensesKnowledge: 'known',
        onboardingCompleted: true,
      }
      const state: GoalCreationState = { source, pendingSnapshots: [], pendingAllocations: [] }

      const draft = createBaseDraft({
        type: 'emergency_fund',
        currency: 'USD',
        targetAmount: '',
        saveEnabled: true,
      })

      const proposal = buildGoalCreationProposal({
        draft,
        state,
        currentMonth: '2026-08',
      })

      // 1.500.000 * 6 / 1500 = 6000 USD
      expect(proposal.normalizedGoal.targetAmount).toEqual({ amount: '6000.00', currency: 'USD' })
      expect(proposal.normalizedGoal.emergencyFundMonths).toBe(6)
    })

    it('leaves targetAmount undefined when profile expenses knowledge is unknown', () => {
      const source = createBaseWorkspaceSource()
      source.profile = {
        userId: 'user-1',
        baseCurrency: 'ARS',
        approximateMonthlyIncome: '2000000.00',
        approximateMonthlyExpenses: null,
        expensesKnowledge: 'unknown',
        onboardingCompleted: true,
      }
      const state: GoalCreationState = { source, pendingSnapshots: [], pendingAllocations: [] }

      const draft = createBaseDraft({
        type: 'emergency_fund',
        currency: 'USD',
        targetAmount: '',
        saveEnabled: true,
      })

      const proposal = buildGoalCreationProposal({
        draft,
        state,
        currentMonth: '2026-08',
      })

      expect(proposal.normalizedGoal.targetAmount).toBeUndefined()
    })
  })

  describe('Impacts and Projections', () => {
    it('always includes pending goal in impacts with before: { status: "not_created" }', () => {
      const source = createBaseWorkspaceSource()
      const state: GoalCreationState = { source, pendingSnapshots: [], pendingAllocations: [] }

      const proposal = buildGoalCreationProposal({
        draft: createBaseDraft({ saveEnabled: true }),
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
        draft: createBaseDraft({ saveEnabled: true }),
        state,
        currentMonth: '2026-08',
      })

      expect(defaultProposal.impacts).toHaveLength(1)
      expect(defaultProposal.impacts[0].goalId).toBe(PENDING_GOAL_ID)

      // When user reduces goal-1 from 60% to 20% to give 40% to pending goal:
      const changedProposal = buildGoalCreationProposal({
        draft: createBaseDraft({
          saveEnabled: true,
          allocations: [
            {
              key: 'save:ARS',
              fundingMethod: 'save',
              destinationCurrency: 'ARS',
              entries: [
                { goalId: 'goal-1', percentage: '20.00' },
                { goalId: 'goal-2', percentage: '40.00' },
                { goalId: PENDING_GOAL_ID, percentage: '40.00' },
              ],
            },
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
        allocatedMonthlyAmounts: [{ amount: '60000.00', currency: 'ARS' }],
      })
    })
  })

  describe('Investment rate and availability normalization', () => {
    it('normalizes desiredDate to YYYY-MM-01 and investment fields', () => {
      const source = createBaseWorkspaceSource()
      const state: GoalCreationState = { source, pendingSnapshots: [], pendingAllocations: [] }

      const draft = createBaseDraft({
        desiredMonth: '2027-05',
        investEnabled: true,
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
      expect(proposal.investment).toEqual({
        annualReturnRate: '9.5',
        availability: 'available_from',
        availableFrom: '2027-01-01',
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
        goals: [source.goals[1], source.goals[0]], // Reordered goals
        allocations: [source.allocations[1], source.allocations[0]], // Reordered allocations
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

  it('changes fingerprint when profile expenses change', () => {
    const source = createBaseWorkspaceSource()
    const state1: GoalCreationState = { source, pendingSnapshots: [], pendingAllocations: [] }
    const state2: GoalCreationState = {
      source: {
        ...source,
        profile: {
          ...source.profile!,
          approximateMonthlyExpenses: '1600000.00',
        },
      },
      pendingSnapshots: [],
      pendingAllocations: [],
    }

    expect(serializeGoalCreationState(state1, '2026-08')).not.toBe(
      serializeGoalCreationState(state2, '2026-08'),
    )
  })

  it('changes fingerprint when goals or positions change', () => {
    const source = createBaseWorkspaceSource()
    const state1: GoalCreationState = { source, pendingSnapshots: [], pendingAllocations: [] }
    const state2: GoalCreationState = {
      source: {
        ...source,
        savingsPositions: [
          { id: 'sav-1', goalId: 'goal-1', amount: '120000.00', currency: 'ARS' },
          source.savingsPositions[1],
        ],
      },
      pendingSnapshots: [],
      pendingAllocations: [],
    }

    expect(serializeGoalCreationState(state1, '2026-08')).not.toBe(
      serializeGoalCreationState(state2, '2026-08'),
    )
  })

  it('changes fingerprint when snapshots or allocations change', () => {
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

  it('changes fingerprint when pending snapshots or pending allocations change', () => {
    const source = createBaseWorkspaceSource()
    const state1: GoalCreationState = { source, pendingSnapshots: [], pendingAllocations: [] }
    const state2: GoalCreationState = {
      source,
      pendingSnapshots: [
        {
          id: 'snap-sep',
          channelId: 'ch-save-ars',
          monthlyCommitmentAmount: '120000.00',
          baseCurrency: 'ARS',
          commitmentStatus: 'active',
          effectiveMonth: '2026-09-01',
        },
      ],
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
        {
          key: 'save:ARS',
          fundingMethod: 'save',
          destinationCurrency: 'ARS',
          entries: [
            { goalId: 'goal-1', percentage: '60.00' },
            { goalId: 'goal-2', percentage: '40.00' },
          ],
        },
      ],
    })
    const draft2 = createBaseDraft({
      allocations: [
        {
          key: 'save:ARS',
          fundingMethod: 'save',
          destinationCurrency: 'ARS',
          entries: [
            { goalId: 'goal-1', percentage: '55.00' },
            { goalId: 'goal-2', percentage: '45.00' },
          ],
        },
      ],
    })

    expect(serializeGoalCreationState(source, '2026-08', draft1)).not.toBe(
      serializeGoalCreationState(source, '2026-08', draft2),
    )
  })

  it('filters existing candidate goals by saveEnabled versus investEnabled capability', () => {
    const source = createBaseWorkspaceSource()
    source.goals = [
      {
        id: 'goal-save-only',
        userId: 'user-1',
        name: 'Solo Ahorro',
        type: 'purchase',
        currency: 'ARS',
        priority: 'high',
        status: 'active',
        saveEnabled: true,
        investEnabled: false,
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'goal-invest-only',
        userId: 'user-1',
        name: 'Solo Inversión',
        type: 'purchase',
        currency: 'ARS',
        priority: 'high',
        status: 'active',
        saveEnabled: false,
        investEnabled: true,
        createdAt: '2026-01-01T00:00:00Z',
      },
    ]

    const draft = createBaseDraft({
      currency: 'ARS',
      saveEnabled: true,
      investEnabled: true,
      allocations: [
        {
          key: 'save:ARS',
          fundingMethod: 'save',
          destinationCurrency: 'ARS',
          entries: [
            { goalId: 'goal-save-only', percentage: '50.00' },
            { goalId: PENDING_GOAL_ID, percentage: '50.00' },
          ],
        },
        {
          key: 'invest:ARS',
          fundingMethod: 'invest',
          destinationCurrency: 'ARS',
          entries: [
            { goalId: 'goal-invest-only', percentage: '50.00' },
            { goalId: PENDING_GOAL_ID, percentage: '50.00' },
          ],
        },
      ],
    })

    const proposal = buildGoalCreationProposal({
      draft,
      state: { source, pendingSnapshots: [], pendingAllocations: [] },
      currentMonth: '2026-08',
    })

    const saveGroup = proposal.allocationGroups.find((g) => g.fundingMethod === 'save')
    const investGroup = proposal.allocationGroups.find((g) => g.fundingMethod === 'invest')

    expect(saveGroup?.entries.some((e) => e.goalId === 'goal-save-only')).toBe(true)
    expect(saveGroup?.entries.some((e) => e.goalId === 'goal-invest-only')).toBe(false)

    expect(investGroup?.entries.some((e) => e.goalId === 'goal-invest-only')).toBe(true)
    expect(investGroup?.entries.some((e) => e.goalId === 'goal-save-only')).toBe(false)
  })

  it('parses new commitments using profile baseCurrency when profile is USD', () => {
    const source = createBaseWorkspaceSource()
    source.profile = {
      ...source.profile!,
      baseCurrency: 'USD',
    }

    const draft = createBaseDraft({
      currency: 'USD',
      saveEnabled: true,
      defineSaveCommitment: true,
      saveMonthlyCommitment: '250.00',
      allocations: [
        {
          key: 'save:USD',
          fundingMethod: 'save',
          destinationCurrency: 'USD',
          entries: [
            { goalId: PENDING_GOAL_ID, percentage: '100.00' },
          ],
        },
      ],
    })

    const proposal = buildGoalCreationProposal({
      draft,
      state: { source, pendingSnapshots: [], pendingAllocations: [] },
      currentMonth: '2026-08',
    })

    const saveGroup = proposal.allocationGroups.find((g) => g.fundingMethod === 'save')
    expect(saveGroup?.baseCurrency).toBe('USD')
    expect(saveGroup?.monthlyCommitment).toEqual({ amount: '250.00', currency: 'USD' })
    expect(saveGroup?.destinationCommitment).toEqual({ amount: '250.00', currency: 'USD' })
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



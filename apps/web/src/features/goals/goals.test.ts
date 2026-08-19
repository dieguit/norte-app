import { describe, expect, it } from 'vitest'
import { createMoney } from '../../lib/money'
import {
  buildGoalsWorkspace,
  groupGoals,
  type GoalsWorkspaceSource,
  type GoalWorkspaceItem,
} from './goals'

function createMockGoalItem(overrides: Partial<GoalWorkspaceItem> = {}): GoalWorkspaceItem {
  return {
    id: 'goal-1',
    name: 'Goal 1',
    type: 'fixed_savings',
    currency: 'ARS',
    priority: 'medium',
    status: 'active',
    createdAt: '2026-08-01T00:00:00.000Z',
    savingsValue: createMoney('0', 'ARS'),
    investmentValue: createMoney('0', 'ARS'),
    actualValue: createMoney('0', 'ARS'),
    funding: [],
    projection: { status: 'no_future_allocation' },
    usesPlanningRate: false,
    saveEnabled: false,
    investEnabled: false,
    ...overrides,
  }
}

describe('groupGoals', () => {
  it('groups goals by status and orders within groups by priority', () => {
    const goals: GoalWorkspaceItem[] = [
      createMockGoalItem({ id: 'active-medium', priority: 'medium', status: 'active', createdAt: '2026-08-01T00:00:00.000Z' }),
      createMockGoalItem({ id: 'active-high', priority: 'high', status: 'active', createdAt: '2026-08-01T00:00:00.000Z' }),
      createMockGoalItem({ id: 'paused-high', priority: 'high', status: 'paused', createdAt: '2026-08-01T00:00:00.000Z' }),
      createMockGoalItem({ id: 'completed-low', priority: 'low', status: 'completed', createdAt: '2026-08-01T00:00:00.000Z' }),
    ]

    expect(groupGoals(goals).map((group) => [group.status, group.goals.map((goal) => goal.id)])).toEqual([
      ['active', ['active-high', 'active-medium']],
      ['paused', ['paused-high']],
      ['completed', ['completed-low']],
    ])
  })

  it('breaks ties using createdAt ascending and then name es-AR localeCompare', () => {
    const goals: GoalWorkspaceItem[] = [
      createMockGoalItem({
        id: 'goal-c-later',
        name: 'Árbol',
        priority: 'high',
        status: 'active',
        createdAt: '2026-08-02T10:00:00.000Z',
      }),
      createMockGoalItem({
        id: 'goal-b-earlier',
        name: 'Zapato',
        priority: 'high',
        status: 'active',
        createdAt: '2026-08-01T10:00:00.000Z',
      }),
      createMockGoalItem({
        id: 'goal-a-same-date-1',
        name: 'Árbol',
        priority: 'high',
        status: 'active',
        createdAt: '2026-08-01T10:00:00.000Z',
      }),
      createMockGoalItem({
        id: 'goal-a-same-date-2',
        name: 'Barco',
        priority: 'high',
        status: 'active',
        createdAt: '2026-08-01T10:00:00.000Z',
      }),
    ]

    const result = groupGoals(goals)
    const activeGroup = result.find((g) => g.status === 'active')!
    expect(activeGroup.goals.map((g) => g.id)).toEqual([
      'goal-a-same-date-1', // Árbol (2026-08-01)
      'goal-a-same-date-2', // Barco (2026-08-01)
      'goal-b-earlier',     // Zapato (2026-08-01)
      'goal-c-later',       // Árbol (2026-08-02)
    ])
  })
})

function createMockWorkspaceSource(overrides: Partial<GoalsWorkspaceSource> = {}): GoalsWorkspaceSource {
  return {
    profile: {
      userId: 'user-1',
      baseCurrency: 'ARS',
      approximateMonthlyIncome: '1000000.00',
      approximateMonthlyExpenses: '600000.00',
      expensesKnowledge: 'known',
      onboardingCompleted: true,
    },
    goals: [],
    savingsPositions: [],
    investmentPositions: [],
    channels: [],
    snapshots: [],
    allocations: [],
    ...overrides,
  }
}

describe('buildGoalsWorkspace - channel amounts and progress', () => {
  it('calculates ARS 25% of ARS 100,000 gives ARS 25,000', () => {
    const source = createMockWorkspaceSource({
      goals: [
        {
          id: 'goal-1',
          name: 'Vacaciones',
          type: 'fixed_savings',
          targetAmount: '100000.00',
          currency: 'ARS',
          priority: 'high',
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      channels: [
        {
          id: 'chan-1',
          fundingMethod: 'save',
          destinationCurrency: 'ARS',
        },
      ],
      snapshots: [
        {
          id: 'snap-1',
          channelId: 'chan-1',
          monthlyCommitmentAmount: '100000.00',
          baseCurrency: 'ARS',
          commitmentStatus: 'active',
          effectiveMonth: '2026-08-01',
        },
      ],
      allocations: [
        {
          id: 'alloc-1',
          snapshotId: 'snap-1',
          goalId: 'goal-1',
          percentage: '25.00',
        },
      ],
    })

    const workspace = buildGoalsWorkspace(source, '2026-08')
    const item = workspace.groups[0].goals[0]
    expect(item.funding).toHaveLength(1)
    expect(item.funding[0]).toMatchObject({
      channelId: 'chan-1',
      fundingMethod: 'save',
      destinationCurrency: 'ARS',
      percentage: '25.00',
      commitmentStatus: 'active',
      monthlyCommitment: { amount: '100000.00', currency: 'ARS' },
      allocatedBaseAmount: { amount: '25000.00', currency: 'ARS' },
      allocatedDestinationAmount: { amount: '25000.00', currency: 'ARS' },
    })
    expect(item.usesPlanningRate).toBe(false)
  })

  it('uses planning rate when destination currency is USD', () => {
    const source = createMockWorkspaceSource({
      goals: [
        {
          id: 'goal-usd',
          name: 'Fondo USD',
          type: 'emergency_fund',
          targetAmount: '1000.00',
          currency: 'USD',
          priority: 'high',
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      channels: [
        {
          id: 'chan-usd',
          fundingMethod: 'save',
          destinationCurrency: 'USD',
        },
      ],
      snapshots: [
        {
          id: 'snap-usd',
          channelId: 'chan-usd',
          monthlyCommitmentAmount: '150000.00',
          baseCurrency: 'ARS',
          commitmentStatus: 'active',
          effectiveMonth: '2026-08-01',
        },
      ],
      allocations: [
        {
          id: 'alloc-usd',
          snapshotId: 'snap-usd',
          goalId: 'goal-usd',
          percentage: '50.00',
        },
      ],
    })

    const workspace = buildGoalsWorkspace(source, '2026-08')
    const item = workspace.groups[0].goals[0]
    expect(item.funding[0]).toMatchObject({
      channelId: 'chan-usd',
      fundingMethod: 'save',
      destinationCurrency: 'USD',
      percentage: '50.00',
      monthlyCommitment: { amount: '150000.00', currency: 'ARS' },
      allocatedBaseAmount: { amount: '75000.00', currency: 'ARS' },
      allocatedDestinationAmount: { amount: '50.00', currency: 'USD' },
    })
    expect(item.usesPlanningRate).toBe(true)
  })

  it('leaves derived amounts absent when commitment is null', () => {
    const source = createMockWorkspaceSource({
      goals: [
        {
          id: 'goal-1',
          name: 'Meta',
          type: 'fixed_savings',
          targetAmount: '100000.00',
          currency: 'ARS',
          priority: 'high',
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      channels: [
        {
          id: 'chan-1',
          fundingMethod: 'save',
          destinationCurrency: 'ARS',
        },
      ],
      snapshots: [
        {
          id: 'snap-1',
          channelId: 'chan-1',
          monthlyCommitmentAmount: null,
          baseCurrency: 'ARS',
          commitmentStatus: 'active',
          effectiveMonth: '2026-08-01',
        },
      ],
      allocations: [
        {
          id: 'alloc-1',
          snapshotId: 'snap-1',
          goalId: 'goal-1',
          percentage: '50.00',
        },
      ],
    })

    const workspace = buildGoalsWorkspace(source, '2026-08')
    const item = workspace.groups[0].goals[0]
    expect(item.funding[0].monthlyCommitment).toBeUndefined()
    expect(item.funding[0].allocatedBaseAmount).toBeUndefined()
    expect(item.funding[0].allocatedDestinationAmount).toBeUndefined()
  })

  it('retains display amount for paused commitment', () => {
    const source = createMockWorkspaceSource({
      goals: [
        {
          id: 'goal-1',
          name: 'Meta',
          type: 'fixed_savings',
          targetAmount: '100000.00',
          currency: 'ARS',
          priority: 'high',
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      channels: [
        {
          id: 'chan-1',
          fundingMethod: 'save',
          destinationCurrency: 'ARS',
        },
      ],
      snapshots: [
        {
          id: 'snap-1',
          channelId: 'chan-1',
          monthlyCommitmentAmount: '100000.00',
          baseCurrency: 'ARS',
          commitmentStatus: 'paused',
          effectiveMonth: '2026-08-01',
        },
      ],
      allocations: [
        {
          id: 'alloc-1',
          snapshotId: 'snap-1',
          goalId: 'goal-1',
          percentage: '30.00',
        },
      ],
    })

    const workspace = buildGoalsWorkspace(source, '2026-08')
    const item = workspace.groups[0].goals[0]
    expect(item.funding[0]).toMatchObject({
      commitmentStatus: 'paused',
      monthlyCommitment: { amount: '100000.00', currency: 'ARS' },
      allocatedBaseAmount: { amount: '30000.00', currency: 'ARS' },
      allocatedDestinationAmount: { amount: '30000.00', currency: 'ARS' },
    })
  })

  it('calculates actual value from savings and investment positions', () => {
    const source = createMockWorkspaceSource({
      goals: [
        {
          id: 'goal-1',
          name: 'Meta Mixta',
          type: 'fixed_savings',
          targetAmount: '200000.00',
          currency: 'ARS',
          priority: 'high',
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      savingsPositions: [
        {
          id: 'sav-1',
          goalId: 'goal-1',
          amount: '40000.00',
          currency: 'ARS',
        },
        {
          id: 'sav-2',
          goalId: 'goal-1',
          amount: '10000.00',
          currency: 'ARS',
        },
      ],
      investmentPositions: [
        {
          id: 'inv-1',
          goalId: 'goal-1',
          currentValue: '50000.00',
          currency: 'ARS',
          annualReturnRate: '8.000',
          availability: 'available_now',
        },
      ],
    })

    const workspace = buildGoalsWorkspace(source, '2026-08')
    const item = workspace.groups[0].goals[0]
    expect(item.savingsValue).toEqual({ amount: '50000.00', currency: 'ARS' })
    expect(item.investmentValue).toEqual({ amount: '50000.00', currency: 'ARS' })
    expect(item.actualValue).toEqual({ amount: '100000.00', currency: 'ARS' })
    expect(item.progressPercentage).toBe('50.00')
    expect(item.annualReturnRate).toBe('8.000')
    expect(item.availability).toBe('available_now')
  })

  it('produces zero money for missing positions', () => {
    const source = createMockWorkspaceSource({
      goals: [
        {
          id: 'goal-1',
          name: 'Meta Vacía',
          type: 'fixed_savings',
          currency: 'USD',
          priority: 'medium',
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
    })

    const workspace = buildGoalsWorkspace(source, '2026-08')
    const item = workspace.groups[0].goals[0]
    expect(item.savingsValue).toEqual({ amount: '0.00', currency: 'USD' })
    expect(item.investmentValue).toEqual({ amount: '0.00', currency: 'USD' })
    expect(item.actualValue).toEqual({ amount: '0.00', currency: 'USD' })
  })

  it('throws on persisted savings position currency mismatch', () => {
    const source = createMockWorkspaceSource({
      goals: [
        {
          id: 'goal-1',
          name: 'Meta ARS',
          type: 'fixed_savings',
          currency: 'ARS',
          priority: 'medium',
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      savingsPositions: [
        {
          id: 'sav-1',
          goalId: 'goal-1',
          amount: '100.00',
          currency: 'USD',
        },
      ],
    })

    expect(() => buildGoalsWorkspace(source, '2026-08')).toThrow()
  })

  it('throws on persisted investment position currency mismatch', () => {
    const source = createMockWorkspaceSource({
      goals: [
        {
          id: 'goal-1',
          name: 'Meta ARS',
          type: 'fixed_savings',
          currency: 'ARS',
          priority: 'medium',
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      investmentPositions: [
        {
          id: 'inv-1',
          goalId: 'goal-1',
          currentValue: '100.00',
          currency: 'USD',
        },
      ],
    })

    expect(() => buildGoalsWorkspace(source, '2026-08')).toThrow()
  })

  it('preserves progress percentage above 100 for text (e.g. 125.00)', () => {
    const source = createMockWorkspaceSource({
      goals: [
        {
          id: 'goal-1',
          name: 'Superada',
          type: 'fixed_savings',
          targetAmount: '100.00',
          currency: 'USD',
          priority: 'high',
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      savingsPositions: [
        {
          id: 'sav-1',
          goalId: 'goal-1',
          amount: '125.00',
          currency: 'USD',
        },
      ],
    })

    const workspace = buildGoalsWorkspace(source, '2026-08')
    const item = workspace.groups[0].goals[0]
    expect(item.progressPercentage).toBe('125.00')
  })

  it('leaves progress percentage absent when target is unknown', () => {
    const source = createMockWorkspaceSource({
      profile: {
        userId: 'user-1',
        baseCurrency: 'USD',
        approximateMonthlyIncome: '1000000.00',
        approximateMonthlyExpenses: null,
        expensesKnowledge: 'unknown',
        onboardingCompleted: true,
      },
      goals: [
        {
          id: 'goal-1',
          name: 'Sin Meta Fija',
          type: 'emergency_fund',
          targetAmount: null,
          currency: 'USD',
          priority: 'high',
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      savingsPositions: [
        {
          id: 'sav-1',
          goalId: 'goal-1',
          amount: '500.00',
          currency: 'USD',
        },
      ],
    })

    const workspace = buildGoalsWorkspace(source, '2026-08')
    const item = workspace.groups[0].goals[0]
    expect(item.progressPercentage).toBeUndefined()
    expect(item.actualValue).toEqual({ amount: '500.00', currency: 'USD' })
  })

  it('calculates desiredDateDeltaMonths: negative is ahead, zero is same month, positive is behind', () => {
    const createSourceWithDesiredDate = (desiredDate: string) =>
      createMockWorkspaceSource({
        goals: [
          {
            id: 'goal-delta',
            name: 'Meta Delta',
            type: 'fixed_savings',
            targetAmount: '1000.00',
            currency: 'ARS',
            priority: 'high',
            status: 'active',
            createdAt: '2026-08-01T00:00:00.000Z',
            desiredDate,
          },
        ],
        // Set up a simple 100 ARS/month saving channel starting 2026-08
        channels: [{ id: 'chan-1', fundingMethod: 'save', destinationCurrency: 'ARS' }],
        snapshots: [
          {
            id: 'snap-1',
            channelId: 'chan-1',
            monthlyCommitmentAmount: '100.00',
            baseCurrency: 'ARS',
            commitmentStatus: 'active',
            effectiveMonth: '2026-08-01',
          },
        ],
        allocations: [{ id: 'alloc-1', snapshotId: 'snap-1', goalId: 'goal-delta', percentage: '100.00' }],
      })

    // Target 1000 with 100/month starting 2026-08 reaches at month 9 (2027-05) -> 10 months total (Aug 2026 .. May 2027)
    // Desired: 2027-07-01 -> delta = 2027-05 - 2027-07 = -2 (ahead)
    const aheadWorkspace = buildGoalsWorkspace(createSourceWithDesiredDate('2027-07-01'), '2026-08')
    expect(aheadWorkspace.groups[0].goals[0].desiredDateDeltaMonths).toBe(-2)

    // Desired: 2027-05-15 -> delta = 2027-05 - 2027-05 = 0 (same month)
    const sameWorkspace = buildGoalsWorkspace(createSourceWithDesiredDate('2027-05-15'), '2026-08')
    expect(sameWorkspace.groups[0].goals[0].desiredDateDeltaMonths).toBe(0)

    // Desired: 2027-03-01 -> delta = 2027-05 - 2027-03 = 2 (behind)
    const behindWorkspace = buildGoalsWorkspace(createSourceWithDesiredDate('2027-03-01'), '2026-08')
    expect(behindWorkspace.groups[0].goals[0].desiredDateDeltaMonths).toBe(2)
  })
})

describe('buildGoalsWorkspace - projection monthly simulation', () => {
  const currentMonth = '2026-08'

  it('projects saving-only completion month accurately', () => {
    const source = createMockWorkspaceSource({
      goals: [
        {
          id: 'goal-save',
          name: 'Ahorro Puro',
          type: 'fixed_savings',
          targetAmount: '100000.00',
          currency: 'ARS',
          priority: 'medium',
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      channels: [{ id: 'chan-save', fundingMethod: 'save', destinationCurrency: 'ARS' }],
      snapshots: [
        {
          id: 'snap-save',
          channelId: 'chan-save',
          monthlyCommitmentAmount: '20000.00',
          baseCurrency: 'ARS',
          commitmentStatus: 'active',
          effectiveMonth: '2026-08-01',
        },
      ],
      allocations: [{ id: 'alloc-save', snapshotId: 'snap-save', goalId: 'goal-save', percentage: '100.00' }],
    })

    const workspace = buildGoalsWorkspace(source, currentMonth)
    expect(workspace.groups[0].goals[0].projection).toEqual({
      status: 'available',
      completionMonth: '2026-12',
    })
  })

  it('projects 8% investment-only completion month compounding monthly', () => {
    const source = createMockWorkspaceSource({
      goals: [
        {
          id: 'goal-inv',
          name: 'Inversión 8%',
          type: 'fixed_savings',
          targetAmount: '100000.00',
          currency: 'ARS',
          priority: 'medium',
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      investmentPositions: [
        {
          id: 'inv-pos',
          goalId: 'goal-inv',
          currentValue: '0.00',
          currency: 'ARS',
          annualReturnRate: '8.000',
        },
      ],
      channels: [{ id: 'chan-inv', fundingMethod: 'invest', destinationCurrency: 'ARS' }],
      snapshots: [
        {
          id: 'snap-inv',
          channelId: 'chan-inv',
          monthlyCommitmentAmount: '10000.00',
          baseCurrency: 'ARS',
          commitmentStatus: 'active',
          effectiveMonth: '2026-08-01',
        },
      ],
      allocations: [{ id: 'alloc-inv', snapshotId: 'snap-inv', goalId: 'goal-inv', percentage: '100.00' }],
    })

    const workspace = buildGoalsWorkspace(source, currentMonth)
    expect(workspace.groups[0].goals[0].projection).toEqual({
      status: 'available',
      completionMonth: '2027-05',
    })
  })

  it('projects mixed funding with savings and investment contributions', () => {
    const source = createMockWorkspaceSource({
      goals: [
        {
          id: 'goal-mixed',
          name: 'Mixta',
          type: 'fixed_savings',
          targetAmount: '100000.00',
          currency: 'ARS',
          priority: 'medium',
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      savingsPositions: [
        {
          id: 'sav-pos',
          goalId: 'goal-mixed',
          amount: '10000.00',
          currency: 'ARS',
        },
      ],
      investmentPositions: [
        {
          id: 'inv-pos',
          goalId: 'goal-mixed',
          currentValue: '10000.00',
          currency: 'ARS',
          annualReturnRate: '8.000',
        },
      ],
      channels: [
        { id: 'chan-save', fundingMethod: 'save', destinationCurrency: 'ARS' },
        { id: 'chan-inv', fundingMethod: 'invest', destinationCurrency: 'ARS' },
      ],
      snapshots: [
        {
          id: 'snap-save',
          channelId: 'chan-save',
          monthlyCommitmentAmount: '5000.00',
          baseCurrency: 'ARS',
          commitmentStatus: 'active',
          effectiveMonth: '2026-08-01',
        },
        {
          id: 'snap-inv',
          channelId: 'chan-inv',
          monthlyCommitmentAmount: '5000.00',
          baseCurrency: 'ARS',
          commitmentStatus: 'active',
          effectiveMonth: '2026-08-01',
        },
      ],
      allocations: [
        { id: 'alloc-save', snapshotId: 'snap-save', goalId: 'goal-mixed', percentage: '100.00' },
        { id: 'alloc-inv', snapshotId: 'snap-inv', goalId: 'goal-mixed', percentage: '100.00' },
      ],
    })

    const workspace = buildGoalsWorkspace(source, currentMonth)
    expect(workspace.groups[0].goals[0].projection).toEqual({
      status: 'available',
      completionMonth: '2027-03',
    })
  })

  it('short-circuits already reached goal to currentMonth', () => {
    const source = createMockWorkspaceSource({
      goals: [
        {
          id: 'goal-reached',
          name: 'Alcanzada',
          type: 'fixed_savings',
          targetAmount: '50000.00',
          currency: 'ARS',
          priority: 'high',
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      savingsPositions: [
        {
          id: 'sav-1',
          goalId: 'goal-reached',
          amount: '50000.00',
          currency: 'ARS',
        },
      ],
    })

    const workspace = buildGoalsWorkspace(source, currentMonth)
    expect(workspace.groups[0].goals[0].projection).toEqual({
      status: 'available',
      completionMonth: '2026-08',
    })
  })

  it('returns plan_paused for a paused goal', () => {
    const source = createMockWorkspaceSource({
      goals: [
        {
          id: 'goal-paused',
          name: 'Meta Pausada',
          type: 'fixed_savings',
          targetAmount: '100000.00',
          currency: 'ARS',
          priority: 'medium',
          status: 'paused',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      channels: [{ id: 'chan-1', fundingMethod: 'save', destinationCurrency: 'ARS' }],
      snapshots: [
        {
          id: 'snap-1',
          channelId: 'chan-1',
          monthlyCommitmentAmount: '20000.00',
          baseCurrency: 'ARS',
          commitmentStatus: 'active',
          effectiveMonth: '2026-08-01',
        },
      ],
      allocations: [{ id: 'alloc-1', snapshotId: 'snap-1', goalId: 'goal-paused', percentage: '100.00' }],
    })

    const workspace = buildGoalsWorkspace(source, currentMonth)
    const pausedGroup = workspace.groups.find((g) => g.status === 'paused')!
    expect(pausedGroup.goals[0].projection).toEqual({
      status: 'plan_paused',
    })
  })

  it('returns commitment_absent when active funding commitment is null', () => {
    const source = createMockWorkspaceSource({
      goals: [
        {
          id: 'goal-absent',
          name: 'Sin Compromiso',
          type: 'fixed_savings',
          targetAmount: '100000.00',
          currency: 'ARS',
          priority: 'medium',
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      channels: [{ id: 'chan-1', fundingMethod: 'save', destinationCurrency: 'ARS' }],
      snapshots: [
        {
          id: 'snap-1',
          channelId: 'chan-1',
          monthlyCommitmentAmount: null,
          baseCurrency: 'ARS',
          commitmentStatus: 'active',
          effectiveMonth: '2026-08-01',
        },
      ],
      allocations: [{ id: 'alloc-1', snapshotId: 'snap-1', goalId: 'goal-absent', percentage: '50.00' }],
    })

    const workspace = buildGoalsWorkspace(source, currentMonth)
    expect(workspace.groups[0].goals[0].projection).toEqual({
      status: 'commitment_absent',
    })
  })

  it('returns no_future_allocation when goal has zero allocation', () => {
    const source = createMockWorkspaceSource({
      goals: [
        {
          id: 'goal-zero',
          name: 'Cero Aporte',
          type: 'fixed_savings',
          targetAmount: '100000.00',
          currency: 'ARS',
          priority: 'medium',
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      channels: [{ id: 'chan-1', fundingMethod: 'save', destinationCurrency: 'ARS' }],
      snapshots: [
        {
          id: 'snap-1',
          channelId: 'chan-1',
          monthlyCommitmentAmount: '50000.00',
          baseCurrency: 'ARS',
          commitmentStatus: 'active',
          effectiveMonth: '2026-08-01',
        },
      ],
      allocations: [{ id: 'alloc-1', snapshotId: 'snap-1', goalId: 'goal-zero', percentage: '0.00' }],
    })

    const workspace = buildGoalsWorkspace(source, currentMonth)
    expect(workspace.groups[0].goals[0].projection).toEqual({
      status: 'no_future_allocation',
    })
  })

  it('returns investment_assumption_unavailable when investment assumption is missing or invalid', () => {
    const source = createMockWorkspaceSource({
      goals: [
        {
          id: 'goal-missing-rate',
          name: 'Sin Tasa',
          type: 'fixed_savings',
          targetAmount: '100000.00',
          currency: 'ARS',
          priority: 'medium',
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      channels: [{ id: 'chan-inv', fundingMethod: 'invest', destinationCurrency: 'ARS' }],
      snapshots: [
        {
          id: 'snap-inv',
          channelId: 'chan-inv',
          monthlyCommitmentAmount: '10000.00',
          baseCurrency: 'ARS',
          commitmentStatus: 'active',
          effectiveMonth: '2026-08-01',
        },
      ],
      allocations: [{ id: 'alloc-inv', snapshotId: 'snap-inv', goalId: 'goal-missing-rate', percentage: '100.00' }],
    })

    const workspace = buildGoalsWorkspace(source, currentMonth)
    expect(workspace.groups[0].goals[0].projection).toEqual({
      status: 'investment_assumption_unavailable',
    })
  })

  it('does not count first contribution until its next-month effective date (2026-09)', () => {
    const source = createMockWorkspaceSource({
      goals: [
        {
          id: 'goal-next-month',
          name: 'Aporte Futuro',
          type: 'fixed_savings',
          targetAmount: '10000.00',
          currency: 'ARS',
          priority: 'medium',
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      channels: [{ id: 'chan-1', fundingMethod: 'save', destinationCurrency: 'ARS' }],
      snapshots: [
        {
          id: 'snap-1',
          channelId: 'chan-1',
          monthlyCommitmentAmount: '10000.00',
          baseCurrency: 'ARS',
          commitmentStatus: 'active',
          effectiveMonth: '2026-09-01',
        },
      ],
      allocations: [{ id: 'alloc-1', snapshotId: 'snap-1', goalId: 'goal-next-month', percentage: '100.00' }],
    })

    const workspace = buildGoalsWorkspace(source, currentMonth)
    expect(workspace.groups[0].goals[0].projection).toEqual({
      status: 'available',
      completionMonth: '2026-09',
    })
  })

  it('returns outside_horizon when completion would require 721 months', () => {
    const source = createMockWorkspaceSource({
      goals: [
        {
          id: 'goal-horizon',
          name: 'Muy Lejana',
          type: 'fixed_savings',
          targetAmount: '72100.00',
          currency: 'ARS',
          priority: 'low',
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      channels: [{ id: 'chan-1', fundingMethod: 'save', destinationCurrency: 'ARS' }],
      snapshots: [
        {
          id: 'snap-1',
          channelId: 'chan-1',
          monthlyCommitmentAmount: '100.00',
          baseCurrency: 'ARS',
          commitmentStatus: 'active',
          effectiveMonth: '2026-08-01',
        },
      ],
      allocations: [{ id: 'alloc-1', snapshotId: 'snap-1', goalId: 'goal-horizon', percentage: '100.00' }],
    })

    const workspace = buildGoalsWorkspace(source, currentMonth)
    expect(workspace.groups[0].goals[0].projection).toEqual({
      status: 'outside_horizon',
    })
  })
})

describe('buildGoalsWorkspace - emergency-fund target derivation and enabled funding visibility', () => {
  const currentMonth = '2026-08'

  it('derives target amount for emergency fund with known expenses and 6 months', () => {
    const source = createMockWorkspaceSource({
      profile: {
        userId: 'user-1',
        baseCurrency: 'ARS',
        approximateMonthlyIncome: '1000000.00',
        approximateMonthlyExpenses: '600000.00',
        expensesKnowledge: 'known',
        onboardingCompleted: true,
      },
      goals: [
        {
          id: 'goal-ef',
          name: 'Colchón financiero',
          type: 'emergency_fund',
          targetAmount: null,
          currency: 'USD',
          priority: 'high',
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      savingsPositions: [
        {
          id: 'sav-ef',
          goalId: 'goal-ef',
          amount: '600.00',
          currency: 'USD',
        },
      ],
    })

    // 600,000 ARS * 6 / 1500 = 2400 USD
    const workspace = buildGoalsWorkspace(source, currentMonth)
    const goal = workspace.groups[0].goals[0]
    expect(goal.targetAmount).toEqual({ amount: '2400.00', currency: 'USD' })
    expect(goal.progressPercentage).toBe('25.00') // 600 / 2400 = 25%
    expect(goal.usesPlanningRate).toBe(true)
  })

  it('leaves target amount absent for emergency fund when expenses are unknown', () => {
    const source = createMockWorkspaceSource({
      profile: {
        userId: 'user-1',
        baseCurrency: 'ARS',
        approximateMonthlyIncome: '1000000.00',
        approximateMonthlyExpenses: null,
        expensesKnowledge: 'unknown',
        onboardingCompleted: true,
      },
      goals: [
        {
          id: 'goal-ef-unk',
          name: 'Colchón financiero',
          type: 'emergency_fund',
          targetAmount: null,
          currency: 'USD',
          priority: 'high',
          status: 'active',
          emergencyFundMonths: 6,
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
    })

    const workspace = buildGoalsWorkspace(source, currentMonth)
    const goal = workspace.groups[0].goals[0]
    expect(goal.targetAmount).toBeUndefined()
    expect(goal.progressPercentage).toBeUndefined()
    expect(goal.projection).toEqual({ status: 'target_unavailable' })
  })

  it('retains visible funding row at 0% for enabled save method with no persisted allocation', () => {
    const source = createMockWorkspaceSource({
      goals: [
        {
          id: 'goal-save-enabled',
          name: 'Meta Ahorro',
          type: 'fixed_savings',
          targetAmount: '100000.00',
          currency: 'ARS',
          priority: 'medium',
          status: 'active',
          saveEnabled: true,
          investEnabled: false,
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      channels: [
        {
          id: 'chan-save',
          fundingMethod: 'save',
          destinationCurrency: 'ARS',
        },
      ],
      snapshots: [
        {
          id: 'snap-save',
          channelId: 'chan-save',
          monthlyCommitmentAmount: '50000.00',
          baseCurrency: 'ARS',
          commitmentStatus: 'active',
          effectiveMonth: '2026-08-01',
        },
      ],
      allocations: [],
    })

    const workspace = buildGoalsWorkspace(source, currentMonth)
    const goal = workspace.groups[0].goals[0]
    expect(goal.saveEnabled).toBe(true)
    expect(goal.investEnabled).toBe(false)
    expect(goal.funding).toHaveLength(1)
    expect(goal.funding[0]).toMatchObject({
      channelId: 'chan-save',
      fundingMethod: 'save',
      destinationCurrency: 'ARS',
      percentage: '0',
      commitmentStatus: 'active',
      effectiveMonth: '2026-08-01',
    })
    expect(goal.funding[0].allocatedBaseAmount).toBeUndefined()
    expect(goal.funding[0].allocatedDestinationAmount).toBeUndefined()
  })

  it('retains visible funding row at 0% for enabled invest method with no persisted allocation', () => {
    const source = createMockWorkspaceSource({
      goals: [
        {
          id: 'goal-invest-enabled',
          name: 'Meta Inversión',
          type: 'fixed_savings',
          targetAmount: '100000.00',
          currency: 'ARS',
          priority: 'medium',
          status: 'active',
          saveEnabled: false,
          investEnabled: true,
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      channels: [
        {
          id: 'chan-inv',
          fundingMethod: 'invest',
          destinationCurrency: 'ARS',
        },
      ],
      snapshots: [
        {
          id: 'snap-inv',
          channelId: 'chan-inv',
          monthlyCommitmentAmount: '30000.00',
          baseCurrency: 'ARS',
          commitmentStatus: 'active',
          effectiveMonth: '2026-08-01',
        },
      ],
      allocations: [],
    })

    const workspace = buildGoalsWorkspace(source, currentMonth)
    const goal = workspace.groups[0].goals[0]
    expect(goal.saveEnabled).toBe(false)
    expect(goal.investEnabled).toBe(true)
    expect(goal.funding).toHaveLength(1)
    expect(goal.funding[0]).toMatchObject({
      channelId: 'chan-inv',
      fundingMethod: 'invest',
      destinationCurrency: 'ARS',
      percentage: '0',
      commitmentStatus: 'active',
    })
  })

  it('retains both funding rows at 0% when both save and invest methods are enabled without allocations', () => {
    const source = createMockWorkspaceSource({
      goals: [
        {
          id: 'goal-both-enabled',
          name: 'Meta Doble',
          type: 'fixed_savings',
          targetAmount: '100000.00',
          currency: 'ARS',
          priority: 'medium',
          status: 'active',
          saveEnabled: true,
          investEnabled: true,
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      channels: [
        { id: 'chan-save', fundingMethod: 'save', destinationCurrency: 'ARS' },
        { id: 'chan-inv', fundingMethod: 'invest', destinationCurrency: 'ARS' },
      ],
      snapshots: [
        {
          id: 'snap-save',
          channelId: 'chan-save',
         monthlyCommitmentAmount: undefined,
          baseCurrency: 'ARS',
          commitmentStatus: 'active',
          effectiveMonth: '2026-08-01',
        },
        {
          id: 'snap-inv',
          channelId: 'chan-inv',
           monthlyCommitmentAmount: undefined,
          baseCurrency: 'ARS',
          commitmentStatus: 'active',
          effectiveMonth: '2026-08-01',
        },
      ],
      allocations: [],
    })

    const workspace = buildGoalsWorkspace(source, currentMonth)
    const goal = workspace.groups[0].goals[0]
    expect(goal.saveEnabled).toBe(true)
    expect(goal.investEnabled).toBe(true)
    expect(goal.funding).toHaveLength(2)
    expect(goal.funding.map((f) => f.fundingMethod)).toEqual(['save', 'invest'])
  })

  it('returns plan_paused when all positive allocations on an active goal are paused', () => {
    const source = createMockWorkspaceSource({
      goals: [
        {
          id: 'goal-paused-allocs',
          name: 'Meta Aportes Pausados',
          type: 'fixed_savings',
          targetAmount: '100000.00',
          currency: 'ARS',
          priority: 'high',
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      channels: [
        { id: 'chan-1', fundingMethod: 'save', destinationCurrency: 'ARS' },
      ],
      snapshots: [
        {
         id: 'snap-1',
         channelId: 'chan-1',
          monthlyCommitmentAmount: null,
          baseCurrency: 'ARS',
          commitmentStatus: 'paused',
          effectiveMonth: '2026-08-01',
        },
      ],
      allocations: [
        { id: 'alloc-1', snapshotId: 'snap-1', goalId: 'goal-paused-allocs', percentage: '100.00' },
      ],
    })

    const workspace = buildGoalsWorkspace(source, currentMonth)
    const goal = workspace.groups[0].goals[0]
    expect(goal.projection).toEqual({
      status: 'plan_paused',
    })
  })

  it('projects from active allocation when active and paused allocations coexist', () => {
    const source = createMockWorkspaceSource({
      goals: [
        {
          id: 'goal-mixed-allocs',
          name: 'Meta Mixta Activo y Pausado',
          type: 'fixed_savings',
          targetAmount: '100000.00',
          currency: 'ARS',
          priority: 'high',
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      channels: [
        { id: 'chan-save', fundingMethod: 'save', destinationCurrency: 'ARS' },
        { id: 'chan-inv', fundingMethod: 'invest', destinationCurrency: 'ARS' },
      ],
      snapshots: [
        {
          id: 'snap-save',
          channelId: 'chan-save',
          monthlyCommitmentAmount: '20000.00',
          baseCurrency: 'ARS',
          commitmentStatus: 'active',
          effectiveMonth: '2026-08-01',
        },
        {
         id: 'snap-inv',
         channelId: 'chan-inv',
          monthlyCommitmentAmount: null,
          baseCurrency: 'ARS',
          commitmentStatus: 'paused',
          effectiveMonth: '2026-08-01',
        },
      ],
      allocations: [
        { id: 'alloc-save', snapshotId: 'snap-save', goalId: 'goal-mixed-allocs', percentage: '100.00' },
        { id: 'alloc-inv', snapshotId: 'snap-inv', goalId: 'goal-mixed-allocs', percentage: '100.00' },
      ],
    })

    const workspace = buildGoalsWorkspace(source, currentMonth)
    const goal = workspace.groups[0].goals[0]
    expect(goal.projection).toEqual({
      status: 'available',
      completionMonth: '2026-12',
    })
  })
})

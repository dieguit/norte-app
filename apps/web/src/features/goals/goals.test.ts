import { describe, expect, it } from 'vitest'
import { createMoney } from '../../lib/money'
import {
  buildGoalsWorkspace,
  buildCurrentGoalsPlanWorkspace,
  groupGoals,
  isGoalCompletionEligible,
  projectGoalCompletion,
  type GoalsWorkspaceSource,
  type GoalWorkspaceItem,
  type GoalFundingRow,
} from './goals'

function fundingRow(
  overrides: Partial<GoalFundingRow> & { percentage: string; amount?: string; effectiveMonth: string },
): GoalFundingRow {
  const amount = overrides.amount
  const base: GoalFundingRow = {
    percentage: overrides.percentage,
    monthlyContribution: amount !== undefined ? createMoney(amount, 'ARS') : undefined,
    allocatedBaseAmount: amount !== undefined ? createMoney(amount, 'ARS') : undefined,
    allocatedDestinationAmount: amount !== undefined ? createMoney(amount, 'ARS') : undefined,
    effectiveMonth: overrides.effectiveMonth,
  }
  return {
    ...base,
    ...overrides,
  }
}

function createMockGoalItem(overrides: Partial<GoalWorkspaceItem> = {}): GoalWorkspaceItem {
  return {
    id: 'goal-1',
    name: 'Goal 1',
    type: 'purchase',
    currency: 'ARS',
    priority: 'medium',
    strategy: 'save',
    status: 'active',
    createdAt: '2026-08-01T00:00:00.000Z',
    savingsValue: createMoney('0', 'ARS'),
    investmentValue: createMoney('0', 'ARS'),
    actualValue: createMoney('0', 'ARS'),
    funding: [],
    projection: { status: 'no_future_allocation' },
    usesPlanningRate: false,
    completionEligible: false,
    ...overrides,
  }
}

describe('goal completion eligibility', () => {
  const eligibleGoal = createMockGoalItem({
    targetAmount: createMoney('1000.00', 'ARS'),
    savingsValue: createMoney('1050.00', 'ARS'),
  })

  it('requires an active saving purchase or other goal whose savings reach a positive target', () => {
    expect(isGoalCompletionEligible(eligibleGoal)).toBe(true)
    expect(isGoalCompletionEligible({ ...eligibleGoal, strategy: 'invest' })).toBe(false)
    expect(isGoalCompletionEligible({ ...eligibleGoal, type: 'emergency_fund' })).toBe(false)
    expect(isGoalCompletionEligible({ ...eligibleGoal, status: 'paused' })).toBe(false)
    expect(
      isGoalCompletionEligible({ ...eligibleGoal, type: 'retirement' }),
    ).toBe(false)
    expect(
      isGoalCompletionEligible({ ...eligibleGoal, savingsValue: createMoney('999.99', 'ARS') }),
    ).toBe(false)
    const investmentHeavyGoal = {
      ...eligibleGoal,
      savingsValue: createMoney('999.99', 'ARS'),
      investmentValue: createMoney('999999.99', 'ARS'),
    }
    expect(isGoalCompletionEligible(investmentHeavyGoal)).toBe(false)
    expect(
      isGoalCompletionEligible({ ...eligibleGoal, targetAmount: createMoney('0.00', 'ARS') }),
    ).toBe(false)
  })
})

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

function recurringIncome(amount: string, effectiveMonth: string) {
  return {
    id: `inc-${amount}-${effectiveMonth}`,
    sourceKind: 'salary',
    sourceId: null,
    sourceName: 'Sueldo',
    concept: null,
    amount,
    currency: 'ARS' as const,
    recurring: true,
    effectiveMonth: `${effectiveMonth.slice(0, 7)}-01`,
  }
}

function oneTimeIncome(amount: string, effectiveMonth: string) {
  return {
    id: `inc-${amount}-${effectiveMonth}`,
    sourceKind: 'bonus',
    sourceId: null,
    sourceName: 'Bono',
    concept: null,
    amount,
    currency: 'ARS' as const,
    recurring: false,
    effectiveMonth: `${effectiveMonth.slice(0, 7)}-01`,
  }
}

function recurringExpense(amount: string, effectiveMonth: string, endMonth: string | null = null) {
  return {
    id: `exp-${amount}-${effectiveMonth}`,
    sourceKind: 'housing',
    sourceId: null,
    sourceName: 'Alquiler',
    concept: null,
    amount,
    currency: 'ARS' as const,
    recurring: true,
    effectiveMonth: `${effectiveMonth.slice(0, 7)}-01`,
    endMonth: endMonth ? `${endMonth.slice(0, 7)}-01` : null,
  }
}

function createMockWorkspaceSource(overrides: Partial<GoalsWorkspaceSource> = {}): GoalsWorkspaceSource {
  return {
    profile: {
      userId: 'user-1',
      baseCurrency: 'ARS',
      expensesKnowledge: 'known',
      plannedMonthlyContribution: '100000.00',
      goalDedicationPercentage: '100.00',
      onboardingCompleted: true,
    },
    goals: [],
    savingsPositions: [],
    investmentPositions: [],
    snapshots: [],
    allocations: [],
    incomes: [
      recurringIncome('100000.00', '2026-01'),
    ],
    expenses: [],
    ...overrides,
  }
}

describe('buildCurrentGoalsPlanWorkspace', () => {
  it('includes a pending next-month allocation without mutating the current source', () => {
    const source: GoalsWorkspaceSource = {
      profile: {
        userId: 'user-1',
        baseCurrency: 'ARS',
        expensesKnowledge: 'known',
        plannedMonthlyContribution: '100000.00',
        onboardingCompleted: true,
      },
      goals: [
        {
          id: 'goal-1',
          userId: 'user-1',
          name: 'Viaje',
          type: 'purchase',
          targetAmount: '200000.00',
          currency: 'ARS',
          priority: 'medium',
          strategy: 'save',
          status: 'active',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      savingsPositions: [],
      investmentPositions: [],
      snapshots: [
        { id: 'snapshot-current', userId: 'user-1', effectiveMonth: '2026-08-01' },
      ],
      allocations: [
        {
          id: 'allocation-current',
          snapshotId: 'snapshot-current',
          goalId: 'goal-1',
          percentage: '0.00',
        },
      ],
    }
    const state = {
      source,
      pendingSnapshots: [
        { id: 'snapshot-pending', userId: 'user-1', effectiveMonth: '2026-09-01' },
      ],
      pendingAllocations: [
        {
          id: 'allocation-pending',
          snapshotId: 'snapshot-pending',
          goalId: 'goal-1',
          percentage: '100.00',
        },
      ],
    }

    const workspace = buildCurrentGoalsPlanWorkspace(state, '2026-08')
    const goal = workspace.groups.flatMap((group) => group.goals)[0]

    expect(goal.funding.map(({ effectiveMonth, percentage }) => ({ effectiveMonth, percentage }))).toEqual([
      { effectiveMonth: '2026-08-01', percentage: '0.00' },
      { effectiveMonth: '2026-09-01', percentage: '100.00' },
    ])
    expect(goal.projection).toEqual({ status: 'available', completionMonth: '2026-10' })
    expect(source.snapshots).toHaveLength(1)
    expect(source.allocations).toHaveLength(1)
  })
})

describe('buildGoalsWorkspace - global allocation amounts and progress', () => {
  it('calculates ARS 25% of ARS 100,000 gives ARS 25,000', () => {
    const source = createMockWorkspaceSource({
      goals: [
        {
          id: 'goal-1',
          name: 'Vacaciones',
          type: 'purchase',
          targetAmount: '100000.00',
          currency: 'ARS',
          priority: 'high',
          strategy: 'save',
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      snapshots: [
        {
          id: 'snap-1',
          userId: 'user-1',
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
      percentage: '25.00',
      monthlyContribution: { amount: '100000.00', currency: 'ARS' },
      allocatedBaseAmount: { amount: '25000.00', currency: 'ARS' },
      allocatedDestinationAmount: { amount: '25000.00', currency: 'ARS' },
      effectiveMonth: '2026-08-01',
    })
    expect(item.usesPlanningRate).toBe(false)
  })

  it('maps completion withdrawals and marks eligible savings goals', () => {
    const source = createMockWorkspaceSource({
      goals: [
        {
          id: 'goal-complete',
          name: 'Notebook',
          type: 'purchase',
          targetAmount: '1000.00',
          currency: 'ARS',
          priority: 'high',
          strategy: 'save',
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      savingsPositions: [
        { id: 'saving-1', goalId: 'goal-complete', amount: '1000.00', currency: 'ARS' },
      ],
      completionWithdrawals: [
        {
          id: 'withdrawal-1',
          goalId: 'goal-complete',
          placeId: 'place-1',
          placeName: 'Banco',
          amount: '100.00',
          currency: 'ARS',
          createdAt: '2026-08-15T12:00:00.000Z',
        },
      ],
    })

    const goal = buildGoalsWorkspace(source, '2026-08').groups[0].goals[0]

    expect(goal.completionEligible).toBe(true)
    expect(goal.completionWithdrawals).toEqual([
      {
        id: 'withdrawal-1',
        placeId: 'place-1',
        placeName: 'Banco',
        amount: { amount: '100.00', currency: 'ARS' },
        createdAt: '2026-08-15T12:00:00.000Z',
      },
    ])
  })

  it('uses planning rate when destination currency is USD', () => {
    const source = createMockWorkspaceSource({
      profile: {
        userId: 'user-1',
        baseCurrency: 'ARS',
        expensesKnowledge: 'known',
        plannedMonthlyContribution: '150000.00',
        goalDedicationPercentage: '100.00',
        onboardingCompleted: true,
      },
      incomes: [recurringIncome('150000.00', '2026-01')],
      goals: [
        {
          id: 'goal-usd',
          name: 'Fondo USD',
          type: 'emergency_fund',
          targetAmount: '1000.00',
          currency: 'USD',
          priority: 'high',
          strategy: 'save',
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      snapshots: [
        {
          id: 'snap-usd',
          userId: 'user-1',
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
      percentage: '50.00',
      monthlyContribution: { amount: '150000.00', currency: 'ARS' },
      allocatedBaseAmount: { amount: '75000.00', currency: 'ARS' },
      allocatedDestinationAmount: { amount: '50.00', currency: 'USD' },
      effectiveMonth: '2026-08-01',
    })
    expect(item.usesPlanningRate).toBe(true)
  })

  it('calculates zero contribution and zero allocated amounts when dedication percentage is zero', () => {
    const source = createMockWorkspaceSource({
      profile: {
        userId: 'user-1',
        baseCurrency: 'ARS',
        expensesKnowledge: 'known',
        plannedMonthlyContribution: '0.00',
        goalDedicationPercentage: '0.00',
        onboardingCompleted: true,
      },
      goals: [
        {
          id: 'goal-1',
          name: 'Meta',
          type: 'purchase',
          targetAmount: '100000.00',
          currency: 'ARS',
          priority: 'high',
          strategy: 'save',
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      snapshots: [
        {
          id: 'snap-1',
          userId: 'user-1',
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
    expect(item.funding[0].monthlyContribution).toEqual({ amount: '0.00', currency: 'ARS' })
    expect(item.funding[0].allocatedBaseAmount).toEqual({ amount: '0.00', currency: 'ARS' })
    expect(item.funding[0].allocatedDestinationAmount).toEqual({ amount: '0.00', currency: 'ARS' })
  })

  it('calculates actual value from savings and investment positions', () => {
    const source = createMockWorkspaceSource({
      goals: [
        {
          id: 'goal-1',
          name: 'Meta Inversión',
          type: 'purchase',
          targetAmount: '200000.00',
          currency: 'ARS',
          priority: 'high',
          strategy: 'invest',
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
          type: 'purchase',
          currency: 'USD',
          priority: 'medium',
          strategy: 'save',
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
          type: 'purchase',
          currency: 'ARS',
          priority: 'medium',
          strategy: 'save',
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
          type: 'purchase',
          currency: 'ARS',
          priority: 'medium',
          strategy: 'invest',
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
          type: 'purchase',
          targetAmount: '100.00',
          currency: 'USD',
          priority: 'high',
          strategy: 'save',
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

  it('calculates desiredDateDeltaMonths: negative is ahead, zero is same month, positive is behind', () => {
    const createSourceWithDesiredDate = (desiredDate: string) =>
      createMockWorkspaceSource({
        profile: {
          userId: 'user-1',
          baseCurrency: 'ARS',
          expensesKnowledge: 'known',
          plannedMonthlyContribution: '100.00',
          goalDedicationPercentage: '100.00',
          onboardingCompleted: true,
        },
        incomes: [recurringIncome('100.00', '2026-01')],
        goals: [
          {
            id: 'goal-delta',
            name: 'Meta Delta',
            type: 'purchase',
            targetAmount: '1000.00',
            currency: 'ARS',
            priority: 'high',
            strategy: 'save',
            status: 'active',
            createdAt: '2026-08-01T00:00:00.000Z',
            desiredDate,
          },
        ],
        snapshots: [
          {
            id: 'snap-1',
            userId: 'user-1',
            effectiveMonth: '2026-08-01',
          },
        ],
        allocations: [{ id: 'alloc-1', snapshotId: 'snap-1', goalId: 'goal-delta', percentage: '100.00' }],
      })

    const aheadWorkspace = buildGoalsWorkspace(createSourceWithDesiredDate('2027-07-01'), '2026-08')
    expect(aheadWorkspace.groups[0].goals[0].desiredDateDeltaMonths).toBe(-2)

    const sameWorkspace = buildGoalsWorkspace(createSourceWithDesiredDate('2027-05-15'), '2026-08')
    expect(sameWorkspace.groups[0].goals[0].desiredDateDeltaMonths).toBe(0)

    const behindWorkspace = buildGoalsWorkspace(createSourceWithDesiredDate('2027-03-01'), '2026-08')
    expect(behindWorkspace.groups[0].goals[0].desiredDateDeltaMonths).toBe(2)
  })
})

describe('buildGoalsWorkspace - projection monthly simulation', () => {
  const currentMonth = '2026-08'

  it('derives completion month dynamically when month contributions vary', () => {
    const source = createMockWorkspaceSource({
      profile: {
        userId: 'user-1',
        baseCurrency: 'ARS',
        expensesKnowledge: 'known',
        plannedMonthlyContribution: '100000.00',
        goalDedicationPercentage: '90.00',
        onboardingCompleted: true,
      },
      incomes: [
        recurringIncome('50000.00', '2026-01'),
        oneTimeIncome('50000.00', '2026-08'),
      ],
      expenses: [],
      goals: [
        {
          id: 'goal-dynamic',
          name: 'Meta Dinamica',
          type: 'purchase',
          targetAmount: '180000.00',
          currency: 'ARS',
          priority: 'high',
          strategy: 'save',
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      snapshots: [
        {
          id: 'snap-1',
          userId: 'user-1',
          effectiveMonth: '2026-08-01',
        },
      ],
      allocations: [
        { id: 'alloc-1', snapshotId: 'snap-1', goalId: 'goal-dynamic', percentage: '100.00' },
      ],
    })

    const workspace = buildGoalsWorkspace(source, '2026-08')

    expect(workspace.financialSummary).toMatchObject({
      dedicationPercentage: '90.00',
      contribution: { amount: '90000.00', currency: 'ARS' },
    })
    expect(workspace.groups[0].goals[0].projection).toEqual({
      status: 'available',
      completionMonth: '2026-10',
    })
  })

  it('proves actualValue and contribution history are unchanged when dedication percentage changes', () => {
    const baseSource = createMockWorkspaceSource({
      goals: [
        {
          id: 'goal-1',
          name: 'Meta Ahorro',
          type: 'purchase',
          targetAmount: '100000.00',
          currency: 'ARS',
          priority: 'high',
          strategy: 'save',
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      savingsPositions: [
        { id: 'sav-1', goalId: 'goal-1', amount: '50000.00', currency: 'ARS' },
      ],
      contributions: [
        {
          id: 'sc-1',
          kind: 'saving',
          amount: '50000.00',
          currency: 'ARS',
          createdAt: '2026-08-10T12:00:00.000Z',
          allocations: [
            { goalId: 'goal-1', goalName: 'Meta Ahorro', amount: '50000.00', percentage: '100.00' },
          ],
        },
      ],
    })

    const workspace90 = buildGoalsWorkspace(
      {
        ...baseSource,
        profile: { ...baseSource.profile!, goalDedicationPercentage: '90.00' },
      },
      '2026-08',
    )
    const workspace50 = buildGoalsWorkspace(
      {
        ...baseSource,
        profile: { ...baseSource.profile!, goalDedicationPercentage: '50.00' },
      },
      '2026-08',
    )

    const goal90 = workspace90.groups[0].goals[0]
    const goal50 = workspace50.groups[0].goals[0]

    expect(goal90.actualValue).toEqual({ amount: '50000.00', currency: 'ARS' })
    expect(goal50.actualValue).toEqual({ amount: '50000.00', currency: 'ARS' })
    expect(goal90.contributions).toEqual(goal50.contributions)
  })

  it('deducts recurring expenses when calculating monthly contribution and projection', () => {
    const source = createMockWorkspaceSource({
      profile: {
        userId: 'user-1',
        baseCurrency: 'ARS',
        expensesKnowledge: 'known',
        plannedMonthlyContribution: '100000.00',
        goalDedicationPercentage: '100.00',
        onboardingCompleted: true,
      },
      incomes: [recurringIncome('100000.00', '2026-01')],
      expenses: [recurringExpense('20000.00', '2026-01')],
      goals: [
        {
          id: 'goal-exp',
          name: 'Meta con Gastos',
          type: 'purchase',
          targetAmount: '160000.00',
          currency: 'ARS',
          priority: 'high',
          strategy: 'save',
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      snapshots: [{ id: 'snap-1', userId: 'user-1', effectiveMonth: '2026-08-01' }],
      allocations: [{ id: 'alloc-1', snapshotId: 'snap-1', goalId: 'goal-exp', percentage: '100.00' }],
    })

    const workspace = buildGoalsWorkspace(source, '2026-08')
    expect(workspace.financialSummary.balance).toEqual({ amount: '80000.00', currency: 'ARS' })
    expect(workspace.financialSummary.contribution).toEqual({ amount: '80000.00', currency: 'ARS' })
    expect(workspace.groups[0].goals[0].projection).toEqual({
      status: 'available',
      completionMonth: '2026-09',
    })
  })

  it('projects saving-only completion month accurately', () => {
    const source = createMockWorkspaceSource({
      profile: {
        userId: 'user-1',
        baseCurrency: 'ARS',
        expensesKnowledge: 'known',
        plannedMonthlyContribution: '20000.00',
        goalDedicationPercentage: '100.00',
        onboardingCompleted: true,
      },
      incomes: [recurringIncome('20000.00', '2026-01')],
      goals: [
        {
          id: 'goal-save',
          name: 'Ahorro Puro',
          type: 'purchase',
          targetAmount: '100000.00',
          currency: 'ARS',
          priority: 'medium',
          strategy: 'save',
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      snapshots: [
        {
          id: 'snap-save',
          userId: 'user-1',
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
      profile: {
        userId: 'user-1',
        baseCurrency: 'ARS',
        expensesKnowledge: 'known',
        plannedMonthlyContribution: '10000.00',
        goalDedicationPercentage: '100.00',
        onboardingCompleted: true,
      },
      incomes: [recurringIncome('10000.00', '2026-01')],
      goals: [
        {
          id: 'goal-inv',
          name: 'Inversión 8%',
          type: 'purchase',
          targetAmount: '100000.00',
          currency: 'ARS',
          priority: 'medium',
          strategy: 'invest',
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
      snapshots: [
        {
          id: 'snap-inv',
          userId: 'user-1',
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

  it('does not compound savings goals even if investment position exists', () => {
    const source = createMockWorkspaceSource({
      profile: {
        userId: 'user-1',
        baseCurrency: 'ARS',
        expensesKnowledge: 'known',
        plannedMonthlyContribution: '20000.00',
        goalDedicationPercentage: '100.00',
        onboardingCompleted: true,
      },
      incomes: [recurringIncome('20000.00', '2026-01')],
      goals: [
        {
          id: 'goal-save-with-inv',
          name: 'Ahorro con Inversión Previa',
          type: 'purchase',
          targetAmount: '100000.00',
          currency: 'ARS',
          priority: 'medium',
          strategy: 'save',
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      investmentPositions: [
        {
          id: 'inv-pos',
          goalId: 'goal-save-with-inv',
          currentValue: '0.00',
          currency: 'ARS',
          annualReturnRate: '8.000',
        },
      ],
      snapshots: [
        {
          id: 'snap-save',
          userId: 'user-1',
          effectiveMonth: '2026-08-01',
        },
      ],
      allocations: [{ id: 'alloc-save', snapshotId: 'snap-save', goalId: 'goal-save-with-inv', percentage: '100.00' }],
    })

    const workspace = buildGoalsWorkspace(source, currentMonth)
    // At 20,000/month flat with 0 initial: 5 months (Aug, Sep, Oct, Nov, Dec 2026)
    expect(workspace.groups[0].goals[0].projection).toEqual({
      status: 'available',
      completionMonth: '2026-12',
    })
  })

  it('short-circuits already reached goal to currentMonth', () => {
    const source = createMockWorkspaceSource({
      goals: [
        {
          id: 'goal-reached',
          name: 'Alcanzada',
          type: 'purchase',
          targetAmount: '50000.00',
          currency: 'ARS',
          priority: 'high',
          strategy: 'save',
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
          type: 'purchase',
          targetAmount: '100000.00',
          currency: 'ARS',
          priority: 'medium',
          strategy: 'save',
          status: 'paused',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      snapshots: [
        {
          id: 'snap-1',
          userId: 'user-1',
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

  it('returns outside_horizon when dedication percentage is 0.00', () => {
    const source = createMockWorkspaceSource({
      profile: {
        userId: 'user-1',
        baseCurrency: 'ARS',
        expensesKnowledge: 'known',
        plannedMonthlyContribution: '0.00',
        goalDedicationPercentage: '0.00',
        onboardingCompleted: true,
      },
      goals: [
        {
          id: 'goal-absent',
          name: 'Sin Compromiso',
          type: 'purchase',
          targetAmount: '100000.00',
          currency: 'ARS',
          priority: 'medium',
          strategy: 'save',
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      snapshots: [
        {
          id: 'snap-1',
          userId: 'user-1',
          effectiveMonth: '2026-08-01',
        },
      ],
      allocations: [{ id: 'alloc-1', snapshotId: 'snap-1', goalId: 'goal-absent', percentage: '50.00' }],
    })

    const workspace = buildGoalsWorkspace(source, currentMonth)
    expect(workspace.groups[0].goals[0].projection).toEqual({
      status: 'outside_horizon',
    })
  })

  it('returns no_future_allocation when goal has zero allocation', () => {
    const source = createMockWorkspaceSource({
      profile: {
        userId: 'user-1',
        baseCurrency: 'ARS',
        expensesKnowledge: 'known',
        plannedMonthlyContribution: '50000.00',
        goalDedicationPercentage: '100.00',
        onboardingCompleted: true,
      },
      incomes: [recurringIncome('50000.00', '2026-01')],
      goals: [
        {
          id: 'goal-zero',
          name: 'Cero Aporte',
          type: 'purchase',
          targetAmount: '100000.00',
          currency: 'ARS',
          priority: 'medium',
          strategy: 'save',
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      snapshots: [
        {
          id: 'snap-1',
          userId: 'user-1',
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

  it('returns investment_assumption_unavailable when investment assumption is missing or invalid for invest strategy', () => {
    const source = createMockWorkspaceSource({
      profile: {
        userId: 'user-1',
        baseCurrency: 'ARS',
        expensesKnowledge: 'known',
        plannedMonthlyContribution: '10000.00',
        goalDedicationPercentage: '100.00',
        onboardingCompleted: true,
      },
      incomes: [recurringIncome('10000.00', '2026-01')],
      goals: [
        {
          id: 'goal-missing-rate',
          name: 'Sin Tasa',
          type: 'purchase',
          targetAmount: '100000.00',
          currency: 'ARS',
          priority: 'medium',
          strategy: 'invest',
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      snapshots: [
        {
          id: 'snap-inv',
          userId: 'user-1',
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
      profile: {
        userId: 'user-1',
        baseCurrency: 'ARS',
        expensesKnowledge: 'known',
        plannedMonthlyContribution: '10000.00',
        goalDedicationPercentage: '100.00',
        onboardingCompleted: true,
      },
      incomes: [recurringIncome('10000.00', '2026-01')],
      goals: [
        {
          id: 'goal-next-month',
          name: 'Aporte Futuro',
          type: 'purchase',
          targetAmount: '10000.00',
          currency: 'ARS',
          priority: 'medium',
          strategy: 'save',
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      snapshots: [
        {
          id: 'snap-1',
          userId: 'user-1',
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
      profile: {
        userId: 'user-1',
        baseCurrency: 'ARS',
        expensesKnowledge: 'known',
        plannedMonthlyContribution: '100.00',
        goalDedicationPercentage: '100.00',
        onboardingCompleted: true,
      },
      incomes: [recurringIncome('100.00', '2026-01')],
      goals: [
        {
          id: 'goal-horizon',
          name: 'Muy Lejana',
          type: 'purchase',
          targetAmount: '72100.00',
          currency: 'ARS',
          priority: 'low',
          strategy: 'save',
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      snapshots: [
        {
          id: 'snap-1',
          userId: 'user-1',
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

describe('buildGoalsWorkspace - emergency-fund target derivation', () => {
  const currentMonth = '2026-08'

  it('derives target amount for emergency fund with known expenses and 3 months default', () => {
    const source = createMockWorkspaceSource({
      profile: {
        userId: 'user-1',
        baseCurrency: 'ARS',
        expensesKnowledge: 'known',
        plannedMonthlyContribution: '100000.00',
        onboardingCompleted: true,
      },
      expenses: [
        recurringExpense('250000.00', '2026-01'),
        recurringExpense('100000.00', '2026-09'),
      ],
      goals: [
        {
          id: 'goal-ef',
          name: 'Colchón financiero',
          type: 'emergency_fund',
          targetAmount: null,
          currency: 'USD',
          priority: 'high',
          strategy: 'save',
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      savingsPositions: [
        {
          id: 'sav-ef',
          goalId: 'goal-ef',
          amount: '125.00',
          currency: 'USD',
        },
      ],
    })

    // 250,000 ARS * 3 / 1500 = 500 USD (recurring expense for 2026-09 is excluded for 2026-08)
    const workspace = buildGoalsWorkspace(source, currentMonth)
    const goal = workspace.groups[0].goals[0]
    expect(goal.targetAmount).toEqual({ amount: '500.00', currency: 'USD' })
    expect(goal.progressPercentage).toBe('25.00') // 125 / 500 = 25%
    expect(goal.usesPlanningRate).toBe(true)
  })

  it('derives target amount for emergency fund with custom emergencyFundMonths', () => {
    const source = createMockWorkspaceSource({
      profile: {
        userId: 'user-1',
        baseCurrency: 'ARS',
        expensesKnowledge: 'known',
        plannedMonthlyContribution: '100000.00',
        onboardingCompleted: true,
      },
      expenses: [recurringExpense('200000.00', '2026-01')],
      goals: [
        {
          id: 'goal-ef',
          name: 'Colchón financiero',
          type: 'emergency_fund',
          targetAmount: null,
          currency: 'USD',
          priority: 'high',
          strategy: 'save',
          status: 'active',
          emergencyFundMonths: 6,
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      savingsPositions: [
        {
          id: 'sav-ef',
          goalId: 'goal-ef',
          amount: '200.00',
          currency: 'USD',
        },
      ],
    })

    // 200,000 ARS * 6 / 1500 = 800 USD
    const workspace = buildGoalsWorkspace(source, currentMonth)
    const goal = workspace.groups[0].goals[0]
    expect(goal.targetAmount).toEqual({ amount: '800.00', currency: 'USD' })
    expect(goal.progressPercentage).toBe('25.00') // 200 / 800 = 25%
    expect(goal.usesPlanningRate).toBe(true)
  })

  it('leaves target amount absent for emergency fund when expenses are unknown', () => {
    const source = createMockWorkspaceSource({
      profile: {
        userId: 'user-1',
        baseCurrency: 'ARS',
        expensesKnowledge: 'unknown',
        plannedMonthlyContribution: '100000.00',
        onboardingCompleted: true,
      },
      expenses: [],
      goals: [
        {
          id: 'goal-ef-unk',
          name: 'Colchón financiero',
          type: 'emergency_fund',
          targetAmount: null,
          currency: 'USD',
          priority: 'high',
          strategy: 'save',
          status: 'active',
          emergencyFundMonths: 3,
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
})

describe('projectGoalCompletion', () => {
  function projectWithFutureRow(futureOverrides: Partial<GoalFundingRow>) {
    return projectGoalCompletion({
      status: 'active',
      strategy: 'save',
      targetAmount: createMoney('250.00', 'ARS'),
      actualValue: createMoney('0', 'ARS'),
      savingsValue: createMoney('0', 'ARS'),
      investmentValue: createMoney('0', 'ARS'),
      funding: [
        fundingRow({ percentage: '100.00', amount: '100.00', effectiveMonth: '2026-08-01' }),
        fundingRow({
          percentage: '50.00',
          amount: '50.00',
          effectiveMonth: '2026-09-01',
          ...futureOverrides,
        }),
      ],
      currentMonth: '2026-08',
    })
  }

  it('keeps the current allocation through its month and applies the replacement next month', () => {
    const projection = projectGoalCompletion({
      status: 'active',
      strategy: 'save',
      targetAmount: createMoney('250.00', 'ARS'),
      actualValue: createMoney('0', 'ARS'),
      savingsValue: createMoney('0', 'ARS'),
      investmentValue: createMoney('0', 'ARS'),
      funding: [
        fundingRow({ percentage: '100.00', amount: '100.00', effectiveMonth: '2026-08-01' }),
        fundingRow({ percentage: '50.00', amount: '50.00', effectiveMonth: '2026-09-01' }),
      ],
      currentMonth: '2026-08',
    })

    expect(projection).toEqual({ status: 'available', completionMonth: '2026-11' })
  })

  it('handles absent and zero future funding at horizon', () => {
    expect(projectWithFutureRow({ percentage: '0.00' })).toEqual({ status: 'no_future_allocation' })
    expect(projectWithFutureRow({ monthlyContribution: undefined })).toEqual({ status: 'commitment_absent' })
  })
})

describe('buildGoalsWorkspace - contributions history', () => {
  const currentMonth = '2026-08'

  it('exposes unified contribution history with savings and investment actions mapped per receiving goal', () => {
    const source = createMockWorkspaceSource({
      goals: [
        {
          id: 'goal-1',
          name: 'Meta Ahorro',
          type: 'purchase',
          targetAmount: '100000.00',
          currency: 'ARS',
          priority: 'high',
          strategy: 'save',
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
        {
          id: 'goal-2',
          name: 'Meta Inversión',
          type: 'purchase',
          targetAmount: '200000.00',
          currency: 'USD',
          priority: 'medium',
          strategy: 'invest',
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
        {
          id: 'goal-3',
          name: 'Meta Tercera',
          type: 'purchase',
          targetAmount: '50000.00',
          currency: 'ARS',
          priority: 'low',
          strategy: 'save',
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      contributions: [
        {
          id: 'saving-1',
          kind: 'saving',
          amount: '10000.00',
          currency: 'ARS',
          createdAt: '2026-08-10T12:00:00.000Z',
          allocations: [
            {
              goalId: 'goal-1',
              goalName: 'Meta Ahorro',
              amount: '10000.00',
              percentage: '100.00',
            },
          ],
        },
        {
          id: 'investment-1',
          kind: 'investment',
          amount: '100.00',
          currency: 'USD',
          arsSpent: '150000.00',
          effectiveRate: '1500.00',
          createdAt: '2026-08-15T12:00:00.000Z',
          allocations: [
            {
              goalId: 'goal-1',
              goalName: 'Meta Ahorro',
              amount: '60.00',
              percentage: '60.00',
            },
            {
              goalId: 'goal-2',
              goalName: 'Meta Inversión',
              amount: '40.00',
              percentage: '40.00',
            },
          ],
        },
        {
          id: 'saving-2',
          kind: 'saving',
          amount: '5000.00',
          currency: 'ARS',
          createdAt: '2026-08-12T12:00:00.000Z',
          allocations: [
            {
              goalId: 'goal-3',
              goalName: 'Meta Tercera',
              amount: '5000.00',
              percentage: '100.00',
            },
          ],
        },
      ] as any,
    })

    const workspace = buildGoalsWorkspace(source, currentMonth)
    const goal1 = workspace.groups[0].goals.find((g) => g.id === 'goal-1')!
    const goal2 = workspace.groups[0].goals.find((g) => g.id === 'goal-2')!
    const goal3 = workspace.groups[0].goals.find((g) => g.id === 'goal-3')!

    expect(goal1.contributions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'investment-1', kind: 'investment', currency: 'USD' }),
      ]),
    )
    expect(goal1.contributions).toHaveLength(2)
    expect(goal1.contributions).toEqual([
      expect.objectContaining({
        id: 'investment-1',
        kind: 'investment',
        amount: '100.00',
        currency: 'USD',
        arsSpent: '150000.00',
        effectiveRate: '1500.00',
        createdAt: '2026-08-15T12:00:00.000Z',
        allocations: expect.arrayContaining([
          { goalId: 'goal-1', goalName: 'Meta Ahorro', amount: '60.00', percentage: '60.00' },
          { goalId: 'goal-2', goalName: 'Meta Inversión', amount: '40.00', percentage: '40.00' },
        ]),
      }),
      expect.objectContaining({
        id: 'saving-1',
        kind: 'saving',
        amount: '10000.00',
        currency: 'ARS',
        createdAt: '2026-08-10T12:00:00.000Z',
      }),
    ])
    expect(goal1.savingContributions).toEqual(goal1.contributions)

    expect(goal2.contributions).toHaveLength(1)
    expect(goal2.contributions).toEqual([
      expect.objectContaining({
        id: 'investment-1',
        kind: 'investment',
        currency: 'USD',
      }),
    ])

    expect(goal3.contributions).toHaveLength(1)
    expect(goal3.contributions![0].id).toBe('saving-2')
  })
})

import { describe, expect, it } from 'vitest'
import { createMoney } from '../../lib/money'
import {
  buildGoalCompletionContext,
  buildGoalCompletionProposal,
  serializeGoalCompletionState,
  validateGoalCompletionWithdrawals,
  type GoalCompletionState,
} from './goal-completion'
import { buildGoalsWorkspace, type GoalsWorkspaceSource } from './goals'

function createCompletionSource(): GoalsWorkspaceSource {
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
        id: 'goal-complete',
        userId: 'user-1',
        name: 'Notebook',
        type: 'purchase',
        targetAmount: '1000.00',
        currency: 'ARS',
        priority: 'high',
        strategy: 'save',
        status: 'active',
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'goal-other',
        userId: 'user-1',
        name: 'Viaje',
        type: 'other',
        targetAmount: '5000.00',
        currency: 'ARS',
        priority: 'medium',
        strategy: 'save',
        status: 'active',
        createdAt: '2026-02-01T00:00:00Z',
      },
    ],
    savingsPositions: [
      { id: 'saving-1', goalId: 'goal-complete', amount: '1000.00', currency: 'ARS' },
    ],
    investmentPositions: [],
    snapshots: [
      { id: 'snapshot-current', userId: 'user-1', effectiveMonth: '2026-08-01' },
    ],
    allocations: [
      { id: 'allocation-complete', snapshotId: 'snapshot-current', goalId: 'goal-complete', percentage: '60.00' },
      { id: 'allocation-other', snapshotId: 'snapshot-current', goalId: 'goal-other', percentage: '40.00' },
    ],
  }
}

function createCompletionState(): GoalCompletionState {
  return {
    source: createCompletionSource(),
    pendingSnapshots: [
      { id: 'snapshot-pending', userId: 'user-1', effectiveMonth: '2026-09-01' },
    ],
    pendingAllocations: [
      { id: 'pending-complete', snapshotId: 'snapshot-pending', goalId: 'goal-complete', percentage: '50.00' },
      { id: 'pending-other', snapshotId: 'snapshot-pending', goalId: 'goal-other', percentage: '50.00' },
    ],
    savingsPlaces: [
      { id: 'bank', name: 'Banco', balance: createMoney('700.00', 'ARS') },
      { id: 'cash', name: 'Efectivo', balance: createMoney('500.00', 'ARS') },
      { id: 'empty', name: 'Vacío', balance: createMoney('0.00', 'ARS') },
      { id: 'usd', name: 'Dólares', balance: createMoney('100.00', 'USD') },
    ],
  }
}

describe('validateGoalCompletionWithdrawals', () => {
  const places = [
    { id: 'bank', name: 'Banco', balance: createMoney('700.00', 'ARS') },
    { id: 'cash', name: 'Efectivo', balance: createMoney('500.00', 'ARS') },
    { id: 'usd', name: 'Dólares', balance: createMoney('1000.00', 'USD') },
  ]

  it('accepts an exact decimal-safe split', () => {
    expect(
      validateGoalCompletionWithdrawals({
        targetAmount: createMoney('1000.00', 'ARS'),
        places,
        withdrawals: [
          { placeId: 'bank', amount: '600.00' },
          { placeId: 'cash', amount: '400.00' },
        ],
      }),
    ).toEqual([
      { placeId: 'bank', amount: createMoney('600.00', 'ARS') },
      { placeId: 'cash', amount: createMoney('400.00', 'ARS') },
    ])
  })

  it.each([
    ['total below target', [{ placeId: 'bank', amount: '599.99' }], 'Los montos deben sumar exactamente el objetivo.'],
    ['total above target', [{ placeId: 'bank', amount: '700.00' }, { placeId: 'cash', amount: '301.00' }], 'Los montos deben sumar exactamente el objetivo.'],
    ['unknown place', [{ placeId: 'unknown', amount: '1000.00' }], 'Lugar de ahorro no encontrado.'],
    ['duplicate place', [{ placeId: 'bank', amount: '500.00' }, { placeId: 'bank', amount: '500.00' }], 'Cada lugar de ahorro puede aparecer una sola vez.'],
    ['amount above place balance', [{ placeId: 'bank', amount: '1000.00' }], 'El monto supera el saldo disponible en Banco.'],
    ['currency mismatch', [{ placeId: 'usd', amount: '1000.00' }], 'La moneda del lugar no coincide con la del objetivo.'],
  ])('rejects %s', (_name, withdrawals, message) => {
    expect(() =>
      validateGoalCompletionWithdrawals({
        targetAmount: createMoney('1000.00', 'ARS'),
        places,
        withdrawals,
      }),
    ).toThrow(message)
  })

  it.each(['0x10', '1e3', 'Infinity', 'NaN', '1.001'])(
    'rejects non-plain decimal amount %s before numeric validation',
    (amount) => {
      expect(() =>
        validateGoalCompletionWithdrawals({
          targetAmount: createMoney('1000.00', 'ARS'),
          places,
          withdrawals: [{ placeId: 'bank', amount }],
        }),
      ).toThrow('Ingresá un monto mayor a cero, con hasta dos decimales.')
    },
  )
})

describe('goal completion context and proposal', () => {
  it('maps the eligible goal, planned contribution, positive matching places, and allocations', () => {
    const context = buildGoalCompletionContext(createCompletionState(), '2026-08', 'goal-complete')

    expect(context).toMatchObject({
      goalId: 'goal-complete',
      goalName: 'Notebook',
      targetAmount: { amount: '1000.00', currency: 'ARS' },
      savingsValue: { amount: '1000.00', currency: 'ARS' },
      plannedMonthlyContribution: { amount: '60000.00', currency: 'ARS' },
      savingsPlaces: [
        { id: 'bank', balance: { amount: '700.00', currency: 'ARS' } },
        { id: 'cash', balance: { amount: '500.00', currency: 'ARS' } },
      ],
    })
    expect(context.activeGoals.map(({ id }) => id)).toEqual(['goal-complete', 'goal-other'])
    expect(context.currentAllocation?.entries).toEqual([
      { goalId: 'goal-complete', percentage: '60.00' },
      { goalId: 'goal-other', percentage: '40.00' },
    ])
    expect(context.pendingAllocation?.entries).toEqual([
      { goalId: 'goal-complete', percentage: '50.00' },
      { goalId: 'goal-other', percentage: '50.00' },
    ])
  })

  it('redistributes the completed goal allocation and marks it completed in the proposed source', () => {
    const proposal = buildGoalCompletionProposal({
      state: createCompletionState(),
      currentMonth: '2026-08',
      draft: {
        goalId: 'goal-complete',
        withdrawals: [
          { placeId: 'bank', amount: '600.00' },
          { placeId: 'cash', amount: '400.00' },
        ],
        allocations: [{ goalId: 'goal-other', percentage: '100.00' }],
      },
    })

    expect(proposal.withdrawals).toEqual([
      { placeId: 'bank', placeName: 'Banco', amount: createMoney('600.00', 'ARS') },
      { placeId: 'cash', placeName: 'Efectivo', amount: createMoney('400.00', 'ARS') },
    ])
    expect(proposal.persistedAllocation.entries).toEqual([
      { goalId: 'goal-other', percentage: '100.00' },
    ])
    expect(proposal.impacts.map((impact) => impact.goalId)).toEqual(['goal-other'])
    expect(proposal.proposedSource.goals.find((goal) => goal.id === 'goal-complete')?.status).toBe('completed')
    expect(proposal.proposedSource.goals.find((goal) => goal.id === 'goal-other')?.status).toBe('active')
  })

  it('uses income and expense plans when calculating completion impacts', () => {
    const state = createCompletionState()
    const source: GoalsWorkspaceSource = {
      ...state.source,
      goals: state.source.goals.map((goal) =>
        goal.id === 'goal-other' ? { ...goal, targetAmount: '10000000.00' } : goal,
      ),
      incomes: [{
        id: 'income-1',
        sourceKind: 'salary',
        sourceId: null,
        sourceName: 'Sueldo',
        concept: null,
        amount: '200000.00',
        currency: 'ARS',
        recurring: true,
        effectiveMonth: '2026-01-01',
      }],
      expenses: [{
        id: 'expense-1',
        sourceKind: 'housing',
        sourceId: null,
        sourceName: 'Alquiler',
        concept: null,
        amount: '100000.00',
        currency: 'ARS',
        recurring: true,
        effectiveMonth: '2026-01-01',
        endMonth: null,
      }],
    }
    const proposal = buildGoalCompletionProposal({
      state: { ...state, source },
      currentMonth: '2026-08',
      draft: {
        goalId: 'goal-complete',
        withdrawals: [
          { placeId: 'bank', amount: '600.00' },
          { placeId: 'cash', amount: '400.00' },
        ],
        allocations: [{ goalId: 'goal-other', percentage: '100.00' }],
      },
    })

    const expectedAfter = buildGoalsWorkspace(proposal.proposedSource, '2026-08')
      .groups.flatMap((group) => group.goals)
      .find((goal) => goal.id === 'goal-other')?.projection
    expect(proposal.impacts.find((impact) => impact.goalId === 'goal-other')?.after).toEqual(expectedAfter)
  })

  it('clears the Plan when completing the final active goal', () => {
    const state = createCompletionState()
    const finalState: GoalCompletionState = {
      ...state,
      source: {
        ...state.source,
        goals: [state.source.goals[0]],
        allocations: [state.source.allocations[0]],
      },
      pendingSnapshots: [],
      pendingAllocations: [],
    }

    const proposal = buildGoalCompletionProposal({
      state: finalState,
      currentMonth: '2026-08',
      draft: {
        goalId: 'goal-complete',
        withdrawals: [
          { placeId: 'bank', amount: '600.00' },
          { placeId: 'cash', amount: '400.00' },
        ],
        allocations: [],
      },
    })

    expect(proposal.pauseMonthlyCommitment).toBe(true)
    expect(proposal.persistedAllocation.entries).toEqual([])
  })
})

describe('serializeGoalCompletionState', () => {
  it('characterizes the complete serialized shape and stable ordering', () => {
    const state = createCompletionState()
    const stateWithDedication: GoalCompletionState = {
      ...state,
      source: {
        ...state.source,
        profile: { ...state.source.profile!, goalDedicationPercentage: '85.00' },
      },
    }
    const draft = {
      goalId: 'goal-complete',
      withdrawals: [
        { placeId: 'cash', amount: '400' },
        { placeId: 'bank', amount: '600.00' },
      ],
      allocations: [{ goalId: 'goal-other', percentage: '100' }],
    }

    expect(JSON.parse(serializeGoalCompletionState(stateWithDedication, '2026-08', draft))).toEqual({
      currentMonth: '2026-08',
      planningArsPerUsd: '1500',
      goalId: 'goal-complete',
      targetAmount: { amount: '1000.00', currency: 'ARS' },
      goal: {
        id: 'goal-complete',
        userId: 'user-1',
        name: 'Notebook',
        type: 'purchase',
        targetAmount: '1000.00',
        currency: 'ARS',
        priority: 'high',
        strategy: 'save',
        status: 'active',
        desiredDate: null,
        completedAt: null,
        emergencyFundMonths: null,
        createdAt: '2026-01-01T00:00:00Z',
      },
      profile: {
        userId: 'user-1',
        baseCurrency: 'ARS',
        expensesKnowledge: 'known',
        plannedMonthlyContribution: '60000.00',
        goalDedicationPercentage: '85.00',
        onboardingCompleted: true,
      },
      incomes: [],
      expenses: [],
      savingsPlaces: [
        { id: 'bank', name: 'Banco', balance: { amount: '700.00', currency: 'ARS' } },
        { id: 'cash', name: 'Efectivo', balance: { amount: '500.00', currency: 'ARS' } },
        { id: 'empty', name: 'Vacío', balance: { amount: '0.00', currency: 'ARS' } },
        { id: 'usd', name: 'Dólares', balance: { amount: '100.00', currency: 'USD' } },
      ],
      goals: [
        {
          id: 'goal-complete',
          userId: 'user-1',
          name: 'Notebook',
          type: 'purchase',
          targetAmount: '1000.00',
          currency: 'ARS',
          priority: 'high',
          strategy: 'save',
          status: 'active',
          desiredDate: null,
          completedAt: null,
          emergencyFundMonths: null,
          createdAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 'goal-other',
          userId: 'user-1',
          name: 'Viaje',
          type: 'other',
          targetAmount: '5000.00',
          currency: 'ARS',
          priority: 'medium',
          strategy: 'save',
          status: 'active',
          desiredDate: null,
          completedAt: null,
          emergencyFundMonths: null,
          createdAt: '2026-02-01T00:00:00Z',
        },
      ],
      savingsPositions: [
        { id: 'saving-1', goalId: 'goal-complete', amount: '1000.00', currency: 'ARS', location: null },
      ],
      investmentPositions: [],
      completionWithdrawals: [],
      snapshots: [
        { id: 'snapshot-current', userId: 'user-1', effectiveMonth: '2026-08-01' },
      ],
      allocations: [
        { id: 'allocation-complete', snapshotId: 'snapshot-current', goalId: 'goal-complete', percentage: '60.00' },
        { id: 'allocation-other', snapshotId: 'snapshot-current', goalId: 'goal-other', percentage: '40.00' },
      ],
      pendingSnapshots: [
        { id: 'snapshot-pending', userId: 'user-1', effectiveMonth: '2026-09-01' },
      ],
      pendingAllocations: [
        { id: 'pending-complete', snapshotId: 'snapshot-pending', goalId: 'goal-complete', percentage: '50.00' },
        { id: 'pending-other', snapshotId: 'snapshot-pending', goalId: 'goal-other', percentage: '50.00' },
      ],
      draft: {
        goalId: 'goal-complete',
        withdrawals: [
          { placeId: 'bank', amount: '600.00' },
          { placeId: 'cash', amount: '400.00' },
        ],
        allocations: [{ goalId: 'goal-other', percentage: '100.00' }],
      },
    })
  })

  it('serializes canonical values deterministically', () => {
    const state = createCompletionState()
    const reordered: GoalCompletionState = {
      ...state,
      savingsPlaces: [...state.savingsPlaces].reverse(),
      source: {
        ...state.source,
        goals: [...state.source.goals].reverse(),
        savingsPositions: [...state.source.savingsPositions].reverse(),
        snapshots: [...state.source.snapshots].reverse(),
        allocations: [...state.source.allocations].reverse(),
      },
      pendingSnapshots: [...state.pendingSnapshots].reverse(),
      pendingAllocations: [...state.pendingAllocations].reverse(),
    }
    const draft = {
      goalId: 'goal-complete',
      withdrawals: [
        { placeId: 'cash', amount: '400' },
        { placeId: 'bank', amount: '600.00' },
      ],
      allocations: [{ goalId: 'goal-other', percentage: '100.00' }],
    }

    const serialized = serializeGoalCompletionState(state, '2026-08', draft)
    expect(serialized).toBe(serializeGoalCompletionState(reordered, '2026-08', draft))
    expect(serialized).toContain('"goalId":"goal-complete"')
    expect(serialized).toContain('"targetAmount":{"amount":"1000.00","currency":"ARS"}')
    expect(serialized).toContain('"amount":"700.00"')
  })

  it('includes canonical incomes and expenses so financial changes invalidate the serialization', () => {
    const state = createCompletionState()
    const source = {
      ...state.source,
      incomes: [
        {
          id: 'income-2',
          sourceKind: 'bonus',
          sourceId: null,
          sourceName: 'Bono',
          concept: null,
          amount: '200.00',
          currency: 'ARS' as const,
          recurring: false,
          effectiveMonth: '2026-08-01',
        },
        {
          id: 'income-1',
          sourceKind: 'salary',
          sourceId: null,
          sourceName: 'Sueldo',
          concept: null,
          amount: '1000.00',
          currency: 'ARS' as const,
          recurring: true,
          effectiveMonth: '2026-01-01',
        },
      ],
      expenses: [
        {
          id: 'expense-2',
          sourceKind: 'technology',
          sourceId: null,
          sourceName: 'Tecnología',
          concept: null,
          amount: '50.00',
          currency: 'ARS' as const,
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
          amount: '300.00',
          currency: 'ARS' as const,
          recurring: true,
          effectiveMonth: '2026-01-01',
          endMonth: null,
        },
      ],
    }
    const financialState = { ...state, source }
    const reversedFinancialState: GoalCompletionState = {
      ...financialState,
      source: {
        ...source,
        incomes: [...source.incomes].reverse(),
        expenses: [...source.expenses].reverse(),
      },
    }

    const draft = {
      goalId: 'goal-complete',
      withdrawals: [
        { placeId: 'cash', amount: '400' },
        { placeId: 'bank', amount: '600.00' },
      ],
      allocations: [{ goalId: 'goal-other', percentage: '100.00' }],
    }
    const serialized = serializeGoalCompletionState(financialState, '2026-08', draft)

    expect(serialized).toBe(serializeGoalCompletionState(reversedFinancialState, '2026-08', draft))
    expect(serialized).not.toBe(
      serializeGoalCompletionState(
        { ...financialState, source: { ...source, incomes: [{ ...source.incomes[0], amount: '2000.00' }, source.incomes[1]] } },
        '2026-08',
        draft,
      ),
    )
    expect(serialized).not.toBe(
      serializeGoalCompletionState(
        { ...financialState, source: { ...source, expenses: [{ ...source.expenses[0], amount: '350.00' }, source.expenses[1]] } },
        '2026-08',
        draft,
      ),
    )
  })

  it('invalidates serialization when a savings place changes but not when places are reordered', () => {
    const state = createCompletionState()
    const reordered: GoalCompletionState = {
      ...state,
      savingsPlaces: [...state.savingsPlaces].reverse(),
    }
    const draft = {
      goalId: 'goal-complete',
      withdrawals: [{ placeId: 'bank', amount: '1000.00' }],
      allocations: [{ goalId: 'goal-other', percentage: '100.00' }],
    }
    const serialized = serializeGoalCompletionState(state, '2026-08', draft)

    expect(serialized).toBe(serializeGoalCompletionState(reordered, '2026-08', draft))
    expect(serialized).not.toBe(
      serializeGoalCompletionState(
        {
          ...state,
          savingsPlaces: state.savingsPlaces.map((place) =>
            place.id === 'bank'
              ? { ...place, balance: createMoney('701.00', 'ARS') }
              : place,
          ),
        },
        '2026-08',
        draft,
      ),
    )
    expect(serialized).not.toBe(
      serializeGoalCompletionState(
        {
          ...state,
          savingsPlaces: state.savingsPlaces.map((place) =>
            place.id === 'bank' ? { ...place, name: 'Banco nuevo' } : place,
          ),
        },
        '2026-08',
        draft,
      ),
    )
  })
})

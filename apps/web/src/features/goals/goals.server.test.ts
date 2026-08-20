import { describe, expect, it } from 'vitest'
import { mapGoalCreationContext } from './goals.server'
import type { GoalCreationState } from './goal-creation'

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

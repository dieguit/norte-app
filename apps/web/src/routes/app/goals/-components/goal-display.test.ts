import { describe, expect, it } from 'vitest'
import type { GoalWorkspaceItem } from '../../../../features/goals/goals'
import { GOAL_PRIORITY_LABELS, getGoalProjectionDisplay } from './goal-display'

function makeGoal(overrides: Partial<GoalWorkspaceItem> = {}): GoalWorkspaceItem {
  return {
    id: 'goal-display-1',
    name: 'Viaje',
    type: 'custom',
    currency: 'USD',
    priority: 'high',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    desiredDate: '2029-12-01',
    targetAmount: { amount: '1000.00', currency: 'USD' },
    savingsValue: { amount: '100.00', currency: 'USD' },
    investmentValue: { amount: '0.00', currency: 'USD' },
    actualValue: { amount: '100.00', currency: 'USD' },
    progressPercentage: '10.00',
    funding: [],
    projection: { status: 'available', completionMonth: '2029-06' },
    annualReturnRate: '8.00',
    availability: 'available_now',
    strategy: 'save',
    usesPlanningRate: false,
    ...overrides,
  }
}

describe('goal display formatting', () => {
  it('shares priority and projection formatting across workspace and detail views', () => {
    const goal = makeGoal()

    expect(GOAL_PRIORITY_LABELS[goal.priority]).toBe('Prioridad alta')
    expect(getGoalProjectionDisplay(goal)).toBe('Junio de 2029')
  })

  it.each([
    ['target_unavailable', 'Objetivo por calcular'],
    ['plan_paused', 'Proyección pausada'],
    ['commitment_absent', 'Sin aporte mensual'],
    ['no_future_allocation', 'Sin asignación futura'],
    ['investment_assumption_unavailable', 'Supuesto de inversión no disponible'],
    ['outside_horizon', 'No alcanzado dentro del horizonte'],
  ] as const)('formats active projection %s', (status, expected) => {
    expect(getGoalProjectionDisplay(makeGoal({ projection: { status } }))).toBe(expected)
  })

  it('formats paused and completed goals independently of projection status', () => {
    expect(getGoalProjectionDisplay(makeGoal({ status: 'paused' }))).toBe('Proyección pausada')
    expect(
      getGoalProjectionDisplay(
        makeGoal({ status: 'completed', completedAt: '2028-04-10T00:00:00Z' }),
      ),
    ).toBe('Abril de 2028')
    expect(getGoalProjectionDisplay(makeGoal({ status: 'completed' }))).toBe('Fecha no disponible')
  })
})

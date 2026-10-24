import { describe, expect, it } from 'vitest'
import type { GoalWorkspaceItem } from '@repo/shared-types'
import {
  GOAL_PRIORITY_LABELS,
  capitalizedMonth,
  getGoalProjectionDisplay,
  goalColor,
  goalProgress,
  goalRowMeta,
  planFunding,
  planShares,
  sortByProjection,
} from './goal-display'

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
    completionEligible: false,
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

const fund = (effectiveMonth: string, percentage: string, amount?: string) => ({
  percentage,
  effectiveMonth,
  ...(amount ? { allocatedDestinationAmount: { amount, currency: 'USD' as const } } : {}),
})

describe('objetivos view helpers', () => {
  it('uses the funding row active this month, else the earliest upcoming one', () => {
    const goal = makeGoal({ funding: [fund('2026-11-01', '40.00'), fund('2026-09-01', '30.00'), fund('2026-12-01', '50.00')] })
    expect(planFunding(goal, '2026-10')?.percentage).toBe('30.00')
    expect(planFunding(makeGoal({ funding: [fund('2026-12-01', '50.00'), fund('2026-11-01', '40.00')] }), '2026-10')?.percentage).toBe('40.00')
    expect(planFunding(makeGoal({ funding: [] }), '2026-10')).toBeUndefined()
  })

  it('sorts dated goals by projected month and keeps undated ones in server order', () => {
    const goals = [
      makeGoal({ id: 'undated-a', projection: { status: 'no_future_allocation' } }),
      makeGoal({ id: 'late', projection: { status: 'available', completionMonth: '2030-03' } }),
      makeGoal({ id: 'undated-b', projection: { status: 'target_unavailable' } }),
      makeGoal({ id: 'soon', projection: { status: 'available', completionMonth: '2026-12' } }),
    ]
    expect(sortByProjection(goals).map((goal) => goal.id)).toEqual(['soon', 'late', 'undated-a', 'undated-b'])
  })

  it('builds row meta for dated, undated, paused and completed goals', () => {
    const funded = [fund('2026-09-01', '30.00')]
    expect(goalRowMeta(makeGoal({ currency: 'ARS', funding: funded }), '2026-10')).toBe('Ahorro · ARS · recibe 30%')
    expect(goalRowMeta(makeGoal({ strategy: 'invest' }), '2026-10')).toBe('Inversión · USD · no recibe aportes')
    expect(goalRowMeta(makeGoal({ projection: { status: 'no_future_allocation' } }), '2026-10')).toBe('Sin fecha · no recibe aportes')
    expect(goalRowMeta(makeGoal({ projection: { status: 'target_unavailable' }, funding: funded }), '2026-10')).toBe('Objetivo por calcular · recibe 30%')
    expect(goalRowMeta(makeGoal({ status: 'paused' }), '2026-10')).toBe('Proyección pausada · no recibe aportes')
    expect(goalRowMeta(makeGoal({ status: 'completed', completedAt: '2026-03-15T00:00:00Z' }), '2026-10')).toBe('Cumplido · Marzo de 2026')
  })

  it('reports progress only with a target, and 100 for completed goals', () => {
    expect(goalProgress(makeGoal({ progressPercentage: '125.00' }))).toBe(125)
    expect(goalProgress(makeGoal({ targetAmount: undefined }))).toBeUndefined()
    expect(goalProgress(makeGoal({ status: 'completed', progressPercentage: undefined }))).toBe(100)
  })

  it('splits the monthly plan by funded active goal, largest first, keeping row colors', () => {
    const goals = [
      makeGoal({ id: 'zapas', funding: [fund('2026-10-01', '30.00', '459540.00')] }),
      makeGoal({ id: 'colchon', funding: [fund('2026-10-01', '60.00', '959.00')] }),
      makeGoal({ id: 'viaje', funding: [] }),
    ]
    expect(planShares(goals, '2026-10').map((share) => [share.goal.id, share.percentage, share.color, share.monthly?.amount])).toEqual([
      ['colchon', 60, goalColor(1), '959.00'],
      ['zapas', 30, goalColor(0), '459540.00'],
    ])
    expect(goalColor(0)).toBe('var(--chart-income-2)')
    expect(capitalizedMonth('2026-12')).toBe('Dic 2026')
  })
})


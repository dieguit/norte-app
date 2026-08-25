import { describe, expect, it } from 'vitest'
import type { GoalsWorkspace } from '../goals/goals'
import type { RoadmapFinances } from './roadmap'
import { buildRoadmap } from './roadmap'

const goals: GoalsWorkspace = {
  financialSummary: {
    month: '2026-08',
    income: { amount: '3000000.00', currency: 'ARS' },
    expenses: { amount: '900000.00', currency: 'ARS' },
    balance: { amount: '2100000.00', currency: 'ARS' },
    dedicationPercentage: '90.00',
    contribution: { amount: '1890000.00', currency: 'ARS' },
  },
  groups: [
    {
      status: 'active',
      goals: [
        {
          id: 'goal-1',
          name: 'Colchón de 3 meses',
          type: 'emergency_fund',
          currency: 'ARS',
          priority: 'high',
          strategy: 'save',
          status: 'active',
          createdAt: '2026-01-01T00:00:00.000Z',
          targetAmount: { amount: '3000000.00', currency: 'ARS' },
          savingsValue: { amount: '0.00', currency: 'ARS' },
          investmentValue: { amount: '0.00', currency: 'ARS' },
          actualValue: { amount: '0.00', currency: 'ARS' },
          funding: [],
          projection: { status: 'available', completionMonth: '2027-03' },
          usesPlanningRate: false,
        },
      ],
    },
    { status: 'paused', goals: [] },
    { status: 'completed', goals: [] },
  ],
}

const finances: RoadmapFinances = {
  incomes: {
    sources: [],
    incomes: [
      {
        id: 'salary',
        sourceKind: 'salary',
        sourceId: null,
        sourceName: 'Sueldo',
        amount: '3200000.00',
        currency: 'ARS',
        recurring: true,
        effectiveMonth: '2026-09',
      },
      {
        id: 'bonus',
        sourceKind: 'bonus',
        sourceId: null,
        sourceName: 'Bono',
        amount: '500000.00',
        currency: 'ARS',
        recurring: false,
        effectiveMonth: '2026-12',
      },
    ],
  },
  expenses: {
    sources: [],
    expenses: [
      {
        id: 'rent',
        sourceKind: 'housing',
        sourceId: null,
        sourceName: 'Vivienda',
        amount: '900000.00',
        currency: 'ARS',
        recurring: true,
        effectiveMonth: '2026-09',
        endMonth: null,
      },
      {
        id: 'notebook',
        sourceKind: 'technology',
        sourceId: null,
        sourceName: 'Notebook',
        amount: '120000.00',
        currency: 'ARS',
        recurring: false,
        effectiveMonth: '2026-12',
        endMonth: null,
      },
    ],
  },
}

describe('buildRoadmap', () => {
  it('builds sparse future months from events and fills them with active recurring records', () => {
    const roadmap = buildRoadmap({ goals, finances, currentMonth: '2026-08' })

    expect(roadmap.futureMonths.map(({ month }) => month)).toEqual([
      '2027-03',
      '2026-12',
      '2026-09',
    ])
    expect(roadmap.futureMonths[0].objectives.map(({ id }) => id)).toEqual(['goal-1'])
    expect(roadmap.futureMonths[1].recurringIncomes.map(({ id }) => id)).toEqual(['salary'])
    expect(roadmap.futureMonths[1].oneTimeIncomes.map(({ id }) => id)).toEqual(['bonus'])
    expect(roadmap.futureMonths[1].recurringExpenses.map(({ id }) => id)).toEqual(['rent'])
    expect(roadmap.futureMonths[1].oneTimeExpenses.map(({ id }) => id)).toEqual(['notebook'])
  })

  it('deduplicates contributions shared by goals and builds newest-first activity history', () => {
    const contribution = {
      id: 'contribution-1',
      kind: 'saving' as const,
      amount: '100000.00',
      currency: 'ARS' as const,
      createdAt: '2026-07-10T00:00:00.000Z',
      allocations: [
        { goalId: 'goal-1', goalName: 'Colchón', amount: '50000.00', percentage: '50.00' },
        { goalId: 'goal-2', goalName: 'Viaje', amount: '50000.00', percentage: '50.00' },
      ],
    }
    const duplicatedGoals = structuredClone(goals)
    duplicatedGoals.groups[0].goals.push({
      ...duplicatedGoals.groups[0].goals[0],
      id: 'goal-2',
      name: 'Viaje',
      projection: { status: 'commitment_absent' },
      contributions: [contribution],
    })
    duplicatedGoals.groups[0].goals[0].contributions = [contribution]

    const roadmap = buildRoadmap({ goals: duplicatedGoals, finances, currentMonth: '2026-08' })

    expect(roadmap.undatedObjectives.map(({ id }) => id)).toContain('goal-2')
    expect(roadmap.historyMonths[0].month).toBe('2026-07')
    expect(roadmap.historyMonths[0].contributions.map(({ id }) => id)).toEqual(['contribution-1'])
  })

  it('returns only applicable historical months in newest-first order', () => {
    const pastFinances = structuredClone(finances)
    pastFinances.incomes.incomes = [
      {
        id: 'past-salary',
        sourceKind: 'salary',
        sourceId: null,
        sourceName: 'Sueldo',
        amount: '3000000.00',
        currency: 'ARS',
        recurring: true,
        effectiveMonth: '2026-06',
      },
    ]
    pastFinances.expenses.expenses = [
      {
        id: 'past-trip',
        sourceKind: 'travel_leisure',
        sourceId: null,
        sourceName: 'Viaje',
        amount: '100000.00',
        currency: 'ARS',
        recurring: false,
        effectiveMonth: '2026-04',
        endMonth: null,
      },
    ]

    const roadmap = buildRoadmap({ goals, finances: pastFinances, currentMonth: '2026-08' })

    expect(roadmap.historyMonths.map(({ month }) => month)).toEqual(['2026-07', '2026-06', '2026-04'])
  })
})

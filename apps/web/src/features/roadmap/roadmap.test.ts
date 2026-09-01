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
          completionEligible: false,
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
        concept: null,
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
        concept: null,
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
        concept: null,
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
        concept: null,
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
        concept: null,
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
        concept: null,
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

  it('places dated completed goals in their completion month and retains completion-only history', () => {
    const goalsWithCompletions = structuredClone(goals)
    goalsWithCompletions.groups[2].goals = [
      {
        ...goals.groups[0].goals[0],
        id: 'completed-current',
        name: 'Objetivo actual cumplido',
        status: 'completed',
        completedAt: '2026-08-15T00:00:00.000Z',
        projection: { status: 'available', completionMonth: '2027-03' },
      },
      {
        ...goals.groups[0].goals[0],
        id: 'completed-history',
        name: 'Objetivo histórico cumplido',
        status: 'completed',
        completedAt: '2026-06-15T00:00:00.000Z',
        projection: { status: 'plan_paused' },
      },
      {
        ...goals.groups[0].goals[0],
        id: 'completed-undated',
        name: 'Objetivo sin fecha',
        status: 'completed',
        projection: { status: 'plan_paused' },
      },
      {
        ...goals.groups[0].goals[0],
        id: 'completed-future',
        name: 'Objetivo futuro cumplido',
        status: 'completed',
        completedAt: '2026-10-15T00:00:00.000Z',
        projection: { status: 'plan_paused' },
      },
    ]

    const roadmap = buildRoadmap({
      goals: goalsWithCompletions,
      finances: { incomes: { sources: [], incomes: [] }, expenses: { sources: [], expenses: [] } },
      currentMonth: '2026-08',
    })

    expect(roadmap.currentMonth.objectives.map(({ id }) => id)).toEqual(['completed-current'])
    expect(roadmap.futureMonths.map(({ month }) => month)).toEqual(['2027-03', '2026-10'])
    expect(roadmap.futureMonths[1].objectives.map(({ id }) => id)).toEqual(['completed-future'])
    expect(roadmap.historyMonths.map(({ month }) => month)).toEqual(['2026-06'])
    expect(roadmap.historyMonths[0].objectives.map(({ id }) => id)).toEqual(['completed-history'])
    expect(roadmap.undatedObjectives).toEqual([])
    expect([
      ...roadmap.currentMonth.objectives,
      ...roadmap.futureMonths.flatMap(({ objectives }) => objectives),
      ...roadmap.historyMonths.flatMap(({ objectives }) => objectives),
    ].map(({ id }) => id)).not.toContain('completed-undated')
  })
})

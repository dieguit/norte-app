import { describe, expect, it } from 'vitest'
import type { GoalsWorkspaceSource } from './goals'
import {
  serializeGoalFinancialSources,
  serializeGoalProfile,
  serializeGoalRecord,
} from './goal-proposal-serialization'

const goal: GoalsWorkspaceSource['goals'][number] = {
  id: 'goal-1',
  userId: 'user-1',
  name: 'Viaje',
  type: 'purchase',
  targetAmount: '1000.00',
  currency: 'USD',
  priority: 'high',
  strategy: 'save',
  status: 'active',
  desiredDate: '2027-01-01',
  completedAt: null,
  emergencyFundMonths: null,
  createdAt: '2026-01-01T00:00:00.000Z',
}

const profile: NonNullable<GoalsWorkspaceSource['profile']> = {
  userId: 'user-1',
  baseCurrency: 'ARS',
  expensesKnowledge: 'known',
  plannedMonthlyContribution: '60000.00',
  goalDedicationPercentage: '90.00',
  onboardingCompleted: true,
}

describe('goal proposal serialization', () => {
  it('serializes every goal field and normalizes nullable values', () => {
    expect(serializeGoalRecord(goal)).toEqual({
      id: 'goal-1',
      userId: 'user-1',
      name: 'Viaje',
      type: 'purchase',
      targetAmount: '1000.00',
      currency: 'USD',
      priority: 'high',
      strategy: 'save',
      status: 'active',
      desiredDate: '2027-01-01',
      completedAt: null,
      emergencyFundMonths: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    })
  })

  it('returns null for a missing profile and includes dedication only when requested', () => {
    expect(serializeGoalProfile(null)).toBeNull()
    expect(serializeGoalProfile(profile)).toEqual({
      userId: 'user-1',
      baseCurrency: 'ARS',
      expensesKnowledge: 'known',
      plannedMonthlyContribution: '60000.00',
      onboardingCompleted: true,
    })
    expect(serializeGoalProfile(profile, true)).toEqual({
      userId: 'user-1',
      baseCurrency: 'ARS',
      expensesKnowledge: 'known',
      plannedMonthlyContribution: '60000.00',
      goalDedicationPercentage: '90.00',
      onboardingCompleted: true,
    })
  })

  it('serializes expenses with nullable source fields and preserves sorted token input', () => {
    expect(serializeGoalFinancialSources({
      profile,
      goals: [goal],
      savingsPositions: [],
      investmentPositions: [],
      snapshots: [],
      allocations: [],
      expenses: [
        {
          id: 'expense-2',
          sourceKind: 'custom',
          sourceId: null,
          sourceName: undefined as unknown as string,
          concept: null,
          amount: '200.00',
          currency: 'ARS',
          recurring: false,
          effectiveMonth: '2026-09-01',
          endMonth: null,
        },
        {
          id: 'expense-1',
          sourceKind: 'housing',
          sourceId: 'source-1',
          sourceName: 'Alquiler',
          concept: 'Casa',
          amount: '500.00',
          currency: 'ARS',
          recurring: true,
          effectiveMonth: '2026-08-01',
          endMonth: '2027-01-01',
        },
      ],
    }).expenses).toEqual([
      {
        id: 'expense-1',
        sourceKind: 'housing',
        sourceId: 'source-1',
        sourceName: 'Alquiler',
        concept: 'Casa',
        amount: '500.00',
        currency: 'ARS',
        recurring: true,
        effectiveMonth: '2026-08-01',
        endMonth: '2027-01-01',
      },
      {
        id: 'expense-2',
        sourceKind: 'custom',
        sourceId: null,
        sourceName: null,
        concept: null,
        amount: '200.00',
        currency: 'ARS',
        recurring: false,
        effectiveMonth: '2026-09-01',
        endMonth: null,
      },
    ])
  })
})

import { describe, expect, it } from 'vitest'
import {
  getGoalContributionArs,
  getMonthlyFinancialSummary,
} from './monthly-plan'

const plan = {
  incomes: [
    {
      id: 'salary',
      sourceKind: 'salary',
      sourceId: null,
      sourceName: 'Sueldo',
      concept: null,
      amount: '100000.00',
      currency: 'ARS' as const,
      recurring: true,
      effectiveMonth: '2026-01-01',
    },
    {
      id: 'bonus',
      sourceKind: 'bonus',
      sourceId: null,
      sourceName: 'Bono',
      concept: null,
      amount: '50000.00',
      currency: 'ARS' as const,
      recurring: false,
      effectiveMonth: '2026-08-01',
    },
  ],
  expenses: [
    {
      id: 'rent',
      sourceKind: 'housing',
      sourceId: null,
      sourceName: 'Alquiler',
      concept: null,
      amount: '40000.00',
      currency: 'ARS' as const,
      recurring: true,
      effectiveMonth: '2026-01-01',
      endMonth: null,
    },
  ],
}

describe('monthly goal planning', () => {
  it('uses recurring and one-time entries for the selected month', () => {
    expect(getMonthlyFinancialSummary(plan, '2026-08')).toEqual({
      month: '2026-08',
      income: { amount: '150000.00', currency: 'ARS' },
      expenses: { amount: '40000.00', currency: 'ARS' },
      balance: { amount: '110000.00', currency: 'ARS' },
    })
  })

  it('derives the contribution from the positive balance', () => {
    const summary = getMonthlyFinancialSummary(plan, '2026-08')
    expect(getGoalContributionArs(summary.balance, 90)).toEqual({
      amount: '99000.00',
      currency: 'ARS',
    })
  })

  it('clamps zero and negative balances to a zero contribution', () => {
    expect(getGoalContributionArs({ amount: '-100.00', currency: 'ARS' }, 90).amount).toBe(
      '0.00',
    )
    expect(getGoalContributionArs({ amount: '0.00', currency: 'ARS' }, 90).amount).toBe('0.00')
  })
})

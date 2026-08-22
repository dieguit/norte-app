import { describe, expect, it } from 'vitest'
import {
  getIncomeTotalArs,
  isIncomeIncludedInMonth,
} from './incomes'

describe('income month rules', () => {
  it('includes recurring income from its effective month onward', () => {
    expect(
      isIncomeIncludedInMonth({ recurring: true, effectiveMonth: '2026-08-01' }, '2026-09'),
    ).toBe(true)
    expect(
      isIncomeIncludedInMonth({ recurring: true, effectiveMonth: '2026-10-01' }, '2026-09'),
    ).toBe(false)
  })

  it('includes a one-off income only in its effective month', () => {
    expect(
      isIncomeIncludedInMonth({ recurring: false, effectiveMonth: '2026-08-01' }, '2026-08'),
    ).toBe(true)
    expect(
      isIncomeIncludedInMonth({ recurring: false, effectiveMonth: '2026-08-01' }, '2026-09'),
    ).toBe(false)
  })

  it('normalizes included USD income to ARS at the planning rate', () => {
    expect(
      getIncomeTotalArs(
        [
          {
            amount: { amount: '100.00', currency: 'USD' },
            recurring: true,
            effectiveMonth: '2026-08-01',
          },
        ],
        '2026-08',
      ),
    ).toEqual({ amount: '150000.00', currency: 'ARS' })
  })
})

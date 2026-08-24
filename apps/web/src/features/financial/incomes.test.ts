import { describe, expect, it } from 'vitest'
import {
  FIXED_INCOME_SOURCES,
  ONE_TIME_INCOME_SOURCES,
  RECURRING_INCOME_SOURCES,
  getIncomeTotalArs,
  isIncomeIncludedInMonth,
} from './incomes'

describe('income sources', () => {
  it('defines separated recurring, one-time, and combined fixed income maps', () => {
    expect(RECURRING_INCOME_SOURCES.salary).toBe('Sueldo')
    expect(RECURRING_INCOME_SOURCES.independent).toBe('Trabajo independiente')
    expect(ONE_TIME_INCOME_SOURCES.asset_sale).toBe('Venta de bienes / usados')
    expect(ONE_TIME_INCOME_SOURCES.bonus).toBe('Bono / aguinaldo / premio')
    expect(FIXED_INCOME_SOURCES.salary).toBe('Sueldo')
    expect(FIXED_INCOME_SOURCES.asset_sale).toBe('Venta de bienes / usados')
  })
})

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

import { describe, expect, it } from 'vitest'
import { createMoney } from '../../lib/money'
import {
  FIXED_EXPENSE_SOURCES,
  ONE_TIME_EXPENSE_SOURCES,
  RECURRING_EXPENSE_SOURCES,
  getExpenseTotalArs,
  getMonthlyBalanceArs,
  isExpenseIncludedInMonth,
} from './expenses'

describe('expense month rules', () => {
  it('includes recurring expense from its effective month onward when endMonth is null', () => {
    expect(
      isExpenseIncludedInMonth(
        { recurring: true, effectiveMonth: '2026-08-01', endMonth: null },
        '2026-08',
      ),
    ).toBe(true)
    expect(
      isExpenseIncludedInMonth(
        { recurring: true, effectiveMonth: '2026-08-01', endMonth: null },
        '2026-09',
      ),
    ).toBe(true)
    expect(
      isExpenseIncludedInMonth(
        { recurring: true, effectiveMonth: '2026-08-01', endMonth: null },
        '2026-07',
      ),
    ).toBe(false)
  })

  it('respects endMonth boundary as exclusive for recurring expenses', () => {
    expect(
      isExpenseIncludedInMonth(
        { recurring: true, effectiveMonth: '2026-06-01', endMonth: '2026-08-01' },
        '2026-06',
      ),
    ).toBe(true)
    expect(
      isExpenseIncludedInMonth(
        { recurring: true, effectiveMonth: '2026-06-01', endMonth: '2026-08-01' },
        '2026-07',
      ),
    ).toBe(true)
    expect(
      isExpenseIncludedInMonth(
        { recurring: true, effectiveMonth: '2026-06-01', endMonth: '2026-08-01' },
        '2026-08',
      ),
    ).toBe(false)
    expect(
      isExpenseIncludedInMonth(
        { recurring: true, effectiveMonth: '2026-06-01', endMonth: '2026-08-01' },
        '2026-09',
      ),
    ).toBe(false)
  })

  it('includes a one-off expense only in its effective month', () => {
    expect(
      isExpenseIncludedInMonth(
        { recurring: false, effectiveMonth: '2026-08-01', endMonth: null },
        '2026-08',
      ),
    ).toBe(true)
    expect(
      isExpenseIncludedInMonth(
        { recurring: false, effectiveMonth: '2026-08-01', endMonth: null },
        '2026-09',
      ),
    ).toBe(false)
    expect(
      isExpenseIncludedInMonth(
        { recurring: false, effectiveMonth: '2026-08-01', endMonth: null },
        '2026-07',
      ),
    ).toBe(false)
  })

  it('normalizes included USD expenses to ARS at the planning rate and excludes inactive expenses', () => {
    expect(
      getExpenseTotalArs(
        [
          {
            amount: { amount: '100.00', currency: 'USD' },
            recurring: true,
            effectiveMonth: '2026-08-01',
            endMonth: null,
          },
          {
            amount: { amount: '50000.00', currency: 'ARS' },
            recurring: false,
            effectiveMonth: '2026-08-01',
            endMonth: null,
          },
          {
            amount: { amount: '30000.00', currency: 'ARS' },
            recurring: true,
            effectiveMonth: '2026-05-01',
            endMonth: '2026-08-01',
          },
          {
            amount: { amount: '40000.00', currency: 'ARS' },
            recurring: false,
            effectiveMonth: '2026-09-01',
            endMonth: null,
          },
        ],
        '2026-08',
      ),
    ).toEqual({ amount: '200000.00', currency: 'ARS' })
  })

  it('returns zero ARS when no expenses are included for the month', () => {
    expect(getExpenseTotalArs([], '2026-08')).toEqual({ amount: '0.00', currency: 'ARS' })
  })
})

describe('monthly balance rules', () => {
  it('calculates monthly balance when income exceeds expenses', () => {
    expect(
      getMonthlyBalanceArs(
        createMoney('500000.00', 'ARS'),
        createMoney('150000.00', 'ARS'),
      ),
    ).toEqual({ amount: '350000.00', currency: 'ARS' })
  })

  it('calculates negative monthly balance when expenses exceed income', () => {
    expect(
      getMonthlyBalanceArs(
        createMoney('100000.00', 'ARS'),
        createMoney('150000.00', 'ARS'),
      ),
    ).toEqual({ amount: '-50000.00', currency: 'ARS' })
  })

  it('calculates zero monthly balance when income equals expenses', () => {
    expect(
      getMonthlyBalanceArs(
        createMoney('200000.00', 'ARS'),
        createMoney('200000.00', 'ARS'),
      ),
    ).toEqual({ amount: '0.00', currency: 'ARS' })
  })

  it('throws when income or expenses are not in ARS', () => {
    expect(() =>
      getMonthlyBalanceArs(
        createMoney('500.00', 'USD'),
        createMoney('150000.00', 'ARS'),
      ),
    ).toThrow('Balance calculations must use ARS.')
    expect(() =>
      getMonthlyBalanceArs(
        createMoney('500000.00', 'ARS'),
        createMoney('100.00', 'USD'),
      ),
    ).toThrow('Balance calculations must use ARS.')
  })
})

describe('fixed expense sources', () => {
  it('defines the expected fixed categories', () => {
    expect(RECURRING_EXPENSE_SOURCES).toEqual({
      housing: 'Alquiler / vivienda',
      school: 'Colegio',
      health: 'Prepaga / salud',
      loans: 'Préstamos',
      utilities: 'Servicios',
      insurance: 'Seguros',
      family_support: 'Ayuda a familiares',
      subscriptions: 'Suscripciones',
    })

    expect(ONE_TIME_EXPENSE_SOURCES).toEqual({
      clothing: 'Compra de ropa',
      gift: 'Regalo',
      family_help: 'Ayuda familiar',
      occasional_health: 'Salud ocasional',
      maintenance: 'Reparación / mantenimiento',
      travel_leisure: 'Viaje / salida',
      technology: 'Tecnología / electrónica',
      taxes_fees: 'Trámite / impuesto',
    })

    expect(FIXED_EXPENSE_SOURCES).toEqual({
      ...RECURRING_EXPENSE_SOURCES,
      ...ONE_TIME_EXPENSE_SOURCES,
    })
  })
})

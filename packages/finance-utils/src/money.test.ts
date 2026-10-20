import BigNumber from 'bignumber.js'
import { describe, expect, it } from 'vitest'
import {
  addMoney,
  assertSameCurrency,
  calculateAllocationAmounts,
  compareMoney,
  createMoney,
  isPositiveMoney,
  isZeroMoney,
  multiplyMoneyByFactor,
  parseMoneyInput,
  subtractMoney,
} from './money'

describe('parseMoneyInput (Review Focus #1)', () => {
  it.each([
    ['1.250,50', '1250.50'],
    ['125.000', '125000.00'],
    ['1.250.000', '1250000.00'],
    ['0,001', '0.00'],
    ['US$ 10', '10.00'],
  ])('%s → %s', (input, amount) => expect(parseMoneyInput(input, 'ARS')?.amount).toBe(amount))
  it.each(['', '-5', 'abc'])('%s → null', (input) =>
    expect(parseMoneyInput(input, 'ARS')).toBeNull(),
  )
})

describe('Money core boundary', () => {
  it('normalizes amount to 2 decimal places', () => {
    const m = createMoney('100', 'ARS')
    expect(m).toEqual({ amount: '100.00', currency: 'ARS' })
  })

  it('throws on invalid money amounts in createMoney', () => {
    expect(() => createMoney('abc', 'ARS')).toThrow('Invalid money amount: abc')
    expect(() => createMoney('Infinity', 'ARS')).toThrow('Invalid money amount: Infinity')
    expect(() => createMoney(NaN as unknown as string, 'ARS')).toThrow()
  })

  it('parses Argentine formatted input strings correctly', () => {
    expect(parseMoneyInput('1.250,50', 'ARS')).toEqual({ amount: '1250.50', currency: 'ARS' })
    expect(parseMoneyInput('$ 1.250,50', 'ARS')).toEqual({ amount: '1250.50', currency: 'ARS' })
    expect(parseMoneyInput('US$ 500,00', 'USD')).toEqual({ amount: '500.00', currency: 'USD' })
    expect(parseMoneyInput('1250,50', 'ARS')).toEqual({ amount: '1250.50', currency: 'ARS' })
    expect(parseMoneyInput('invalid', 'ARS')).toBeNull()
    expect(parseMoneyInput('', 'ARS')).toBeNull()
    expect(parseMoneyInput('   ', 'ARS')).toBeNull()
    expect(parseMoneyInput('-50', 'ARS')).toBeNull()
    expect(parseMoneyInput(123 as unknown as string, 'ARS')).toBeNull()
  })

  it('performs exact addition and subtraction', () => {
    const a = createMoney('10.50', 'ARS')
    const b = createMoney('5.25', 'ARS')
    expect(addMoney(a, b)).toEqual({ amount: '15.75', currency: 'ARS' })
    expect(subtractMoney(a, b)).toEqual({ amount: '5.25', currency: 'ARS' })
  })

  it('throws on negative subtraction result', () => {
    const a = createMoney('5.00', 'ARS')
    const b = createMoney('10.00', 'ARS')
    expect(() => subtractMoney(a, b)).toThrow('Subtract resulted in negative money: -5.00')
  })

  it('multiplies by factor and rounds to 2 decimals using half-up', () => {
    const m = createMoney('10.00', 'ARS')
    expect(multiplyMoneyByFactor(m, '0.125')).toEqual({ amount: '1.25', currency: 'ARS' })
    expect(multiplyMoneyByFactor(m, 0.125)).toEqual({ amount: '1.25', currency: 'ARS' })
  })

  it('throws on invalid factor in multiplyMoneyByFactor', () => {
    const m = createMoney('10.00', 'ARS')
    expect(() => multiplyMoneyByFactor(m, 'invalid')).toThrow(
      'Invalid multiplication factor: invalid',
    )
    expect(() => multiplyMoneyByFactor(m, Infinity)).toThrow(
      'Invalid multiplication factor: Infinity',
    )
  })

  it('rejects cross-currency operations', () => {
    const ars = createMoney('10.00', 'ARS')
    const usd = createMoney('10.00', 'USD')
    expect(() => addMoney(ars, usd)).toThrow('Currency mismatch: ARS vs USD')
    expect(() => subtractMoney(ars, usd)).toThrow('Currency mismatch: ARS vs USD')
    expect(() => compareMoney(ars, usd)).toThrow('Currency mismatch: ARS vs USD')
    expect(() => assertSameCurrency(ars, usd)).toThrow('Currency mismatch: ARS vs USD')
  })

  it('compares money amounts correctly', () => {
    const a = createMoney('10.00', 'ARS')
    const b = createMoney('20.00', 'ARS')
    expect(compareMoney(a, b)).toBe(-1)
    expect(compareMoney(b, a)).toBe(1)
    expect(compareMoney(a, a)).toBe(0)
  })

  it('checks zero and positive money', () => {
    const zero = createMoney('0', 'ARS')
    const pos = createMoney('10.00', 'ARS')
    expect(isZeroMoney(zero)).toBe(true)
    expect(isZeroMoney(pos)).toBe(false)
    expect(isPositiveMoney(pos)).toBe(true)
    expect(isPositiveMoney(zero)).toBe(false)
  })
})

describe('calculateAllocationAmounts', () => {
  it('allocates amounts matching exact percentages', () => {
    const total = createMoney('100.00', 'ARS')
    const targets = [
      { id: 'g1', percentage: 50 },
      { id: 'g2', percentage: 50 },
    ]
    const res = calculateAllocationAmounts(total, targets)
    expect(res).toEqual([
      { id: 'g1', amount: { amount: '50.00', currency: 'ARS' } },
      { id: 'g2', amount: { amount: '50.00', currency: 'ARS' } },
    ])
  })

  it('handles residual cent distribution deterministically', () => {
    const total = createMoney('100.00', 'ARS')
    const targets = [
      { id: 'g1', percentage: '33.33' },
      { id: 'g2', percentage: '33.33' },
      { id: 'g3', percentage: '33.34' },
    ]
    const res = calculateAllocationAmounts(total, targets)
    const sum = res.reduce((acc, item) => acc.plus(item.amount.amount), new BigNumber(0))
    expect(sum.toFixed(2)).toBe('100.00')
  })

  it('rejects invalid allocation totals (not 100%)', () => {
    const total = createMoney('100.00', 'ARS')
    const targets = [
      { id: 'g1', percentage: 50 },
      { id: 'g2', percentage: 40 },
    ]
    expect(() => calculateAllocationAmounts(total, targets)).toThrow(
      'Allocation percentages must sum to 100%',
    )
  })

  it('handles empty allocations array', () => {
    const total = createMoney('100.00', 'ARS')
    expect(calculateAllocationAmounts(total, [])).toEqual([])
  })

  it('breaks ties deterministically using original index when remainders are equal', () => {
    const total = createMoney('0.06', 'ARS')
    const targets = [
      { id: 'g1', percentage: 25 },
      { id: 'g2', percentage: 25 },
      { id: 'g3', percentage: 25 },
      { id: 'g4', percentage: 25 },
    ]
    const res = calculateAllocationAmounts(total, targets)
    expect(res).toEqual([
      { id: 'g1', amount: { amount: '0.02', currency: 'ARS' } },
      { id: 'g2', amount: { amount: '0.02', currency: 'ARS' } },
      { id: 'g3', amount: { amount: '0.01', currency: 'ARS' } },
      { id: 'g4', amount: { amount: '0.01', currency: 'ARS' } },
    ])
    const sum = res.reduce((acc, item) => acc.plus(item.amount.amount), new BigNumber(0))
    expect(sum.toFixed(2)).toBe('0.06')
  })

  it('prioritizes larger remainder over original index', () => {
    const total = createMoney('1.00', 'USD')
    const targets = [
      { id: 'g1', percentage: 33 },
      { id: 'g2', percentage: '33.6' },
      { id: 'g3', percentage: '33.4' },
    ]
    const res = calculateAllocationAmounts(total, targets)
    expect(res).toEqual([
      { id: 'g1', amount: { amount: '0.33', currency: 'USD' } },
      { id: 'g2', amount: { amount: '0.34', currency: 'USD' } },
      { id: 'g3', amount: { amount: '0.33', currency: 'USD' } },
    ])
  })

  it('allocates zero total correctly', () => {
    const total = createMoney('0.00', 'ARS')
    const targets = [
      { id: 'g1', percentage: 50 },
      { id: 'g2', percentage: 50 },
    ]
    const res = calculateAllocationAmounts(total, targets)
    expect(res).toEqual([
      { id: 'g1', amount: { amount: '0.00', currency: 'ARS' } },
      { id: 'g2', amount: { amount: '0.00', currency: 'ARS' } },
    ])
  })

  it('throws on non-numeric percentage', () => {
    const total = createMoney('100.00', 'ARS')
    const targets = [
      { id: 'g1', percentage: 'invalid' },
      { id: 'g2', percentage: 50 },
    ]
    expect(() => calculateAllocationAmounts(total, targets)).toThrow(
      'Allocation percentages must sum to 100%',
    )
  })

  it.each([
    [-10, 110],
    [110, -10],
  ])(
    'rejects allocation percentages outside 0..100 even when the pair sums to 100',
    (first, second) => {
      const total = createMoney('100.00', 'ARS')

      expect(() =>
        calculateAllocationAmounts(total, [
          { id: 'g1', percentage: first },
          { id: 'g2', percentage: second },
        ]),
      ).toThrow('Allocation percentages must sum to 100%')
    },
  )

  it('accepts zero and 100 percent boundary values', () => {
    expect(
      calculateAllocationAmounts(createMoney('100.00', 'ARS'), [
        { id: 'g1', percentage: 0 },
        { id: 'g2', percentage: 100 },
      ]),
    ).toEqual([
      { id: 'g1', amount: { amount: '0.00', currency: 'ARS' } },
      { id: 'g2', amount: { amount: '100.00', currency: 'ARS' } },
    ])
  })

  it('rejects a negative total amount', () => {
    expect(() =>
      calculateAllocationAmounts(createMoney('-0.01', 'ARS'), [{ id: 'g1', percentage: 100 }]),
    ).toThrow('Allocation percentages must sum to 100%')
  })

  it('distributes a single leftover cent to the first equal remainder', () => {
    const result = calculateAllocationAmounts(createMoney('0.01', 'ARS'), [
      { id: 'g1', percentage: 50 },
      { id: 'g2', percentage: 50 },
    ])

    expect(result).toEqual([
      { id: 'g1', amount: { amount: '0.01', currency: 'ARS' } },
      { id: 'g2', amount: { amount: '0.00', currency: 'ARS' } },
    ])
  })

  it.each([
    ['negative entry', [{ id: 'a', percentage: -10 }, { id: 'b', percentage: 110 }]],
    ['entry above 100', [{ id: 'a', percentage: 110 }, { id: 'b', percentage: -10 }]],
    ['non-finite entry', [{ id: 'a', percentage: Number.NaN }, { id: 'b', percentage: 100 }]],
  ])('rejects %s even when the total is 100 (api test)', (_caseName, allocations) => {
    expect(() => calculateAllocationAmounts(createMoney('1.00', 'ARS'), allocations)).toThrow(
      'Allocation percentages must sum to 100%',
    )
  })

  it('distributes valid percentage rounding remainder deterministically by input order (api test)', () => {
    const total = createMoney('0.01', 'ARS')
    expect(
      calculateAllocationAmounts(total, [
        { id: 'b', percentage: 50 },
        { id: 'a', percentage: 50 },
      ]),
    ).toEqual([
      { id: 'b', amount: { amount: '0.01', currency: 'ARS' } },
      { id: 'a', amount: { amount: '0.00', currency: 'ARS' } },
    ])
  })
})

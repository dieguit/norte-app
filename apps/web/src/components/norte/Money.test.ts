import { describe, expect, it } from 'vitest'
import { formatMoneyParts } from './Money'

describe('formatMoneyParts', () => {
  it('splits ARS integer and decimals', () => {
    expect(formatMoneyParts({ amount: '237600.00', currency: 'ARS' })).toEqual({ integer: '$ 237.600', decimals: ',00' })
  })

  it('uses US$ for USD', () => {
    expect(formatMoneyParts({ amount: '2350.00', currency: 'USD' })).toEqual({ integer: 'US$ 2.350', decimals: ',00' })
  })

  it('puts a real minus before the currency for negatives', () => {
    expect(formatMoneyParts({ amount: '-7334.50', currency: 'ARS' })).toEqual({ integer: '−$ 7.334', decimals: ',50' })
  })

  it('adds + only when sign is always', () => {
    expect(formatMoneyParts({ amount: '120000.00', currency: 'ARS' }, 'always')?.integer).toBe('+$ 120.000')
    expect(formatMoneyParts({ amount: '120000.00', currency: 'ARS' })?.integer).toBe('$ 120.000')
  })

  it('drops the sign when sign is never', () => {
    expect(formatMoneyParts({ amount: '-7334.00', currency: 'ARS' }, 'never')?.integer).toBe('$ 7.334')
  })

  it('returns null for zero, including negative zero', () => {
    expect(formatMoneyParts({ amount: '0.00', currency: 'ARS' })).toBeNull()
    expect(formatMoneyParts({ amount: '-0.00', currency: 'USD' }, 'always')).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'
import { resolveUsdInputChange } from './saving-contribution-inputs'

describe('resolveUsdInputChange', () => {
  it('does not overwrite a manually completed USD purchase', () => {
    expect(
      resolveUsdInputChange('amount', '250', {
        amount: '200',
        arsSpent: '300.000',
        effectiveRate: '1.500',
        derivedField: null,
      }),
    ).toEqual({ amount: '250' })
  })

  it('keeps a manually edited exchange rate without deriving another field', () => {
    expect(
      resolveUsdInputChange('effectiveRate', '1600', {
        amount: '200',
        arsSpent: '300.000',
        effectiveRate: '1.500',
        derivedField: null,
      }),
    ).toEqual({ effectiveRate: '1.600' })
  })

  it('derives ARS spent when the edited rate owns the USD purchase derivation', () => {
    expect(
      resolveUsdInputChange('effectiveRate', '1600', {
        amount: '200',
        arsSpent: '',
        effectiveRate: '1.500',
        derivedField: 'arsSpent',
      }),
    ).toEqual({ effectiveRate: '1.600', arsSpent: '320.000', derivedField: 'arsSpent' })
  })

  it('derives USD amount when the edited rate owns the amount derivation', () => {
    expect(
      resolveUsdInputChange('effectiveRate', '1500', {
        amount: '',
        arsSpent: '300.000',
        effectiveRate: '',
        derivedField: 'amount',
      }),
    ).toEqual({ effectiveRate: '1.500', amount: '200', derivedField: 'amount' })
  })

  it('keeps an invalid rate edit local instead of deriving a value', () => {
    expect(
      resolveUsdInputChange('effectiveRate', '0', {
        amount: '200',
        arsSpent: '',
        effectiveRate: '1.500',
        derivedField: 'arsSpent',
      }),
    ).toEqual({ effectiveRate: '0' })
  })
})

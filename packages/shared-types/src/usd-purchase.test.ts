import { describe, expect, it } from 'vitest'
import { deriveUsdPurchase } from './usd-purchase'

describe('usd purchase derivation', () => {
  describe('deriveUsdPurchase', () => {
    it('derives effectiveRate when usdAmount and arsSpent are provided', () => {
      expect(
        deriveUsdPurchase({ usdAmount: '100.00', arsSpent: '150000.00' }),
      ).toEqual({ effectiveRate: '1500.00' })
    })

    it('derives arsSpent when usdAmount and effectiveRate are provided', () => {
      expect(
        deriveUsdPurchase({ usdAmount: '100.00', effectiveRate: '1500.00' }),
      ).toEqual({ arsSpent: '150000.00' })
    })

    it('derives usdAmount when arsSpent and effectiveRate are provided', () => {
      expect(
        deriveUsdPurchase({ arsSpent: '150000.00', effectiveRate: '1500.00' }),
      ).toEqual({ usdAmount: '100.00' })
    })

    it('validates and returns normalized values when all three values are coherent', () => {
      expect(
        deriveUsdPurchase({
          usdAmount: '100.00',
          arsSpent: '150000.00',
          effectiveRate: '1500.00',
        }),
      ).toEqual({
        usdAmount: '100.00',
        arsSpent: '150000.00',
        effectiveRate: '1500.00',
      })
    })

    it('rejects incoherence when all 3 values do not match within rounding', () => {
      expect(() =>
        deriveUsdPurchase({
          usdAmount: '100.00',
          arsSpent: '120000.00',
          effectiveRate: '1500.00',
        }),
      ).toThrow('USD purchase values are incoherent')
    })

    it('rejects either one-cent mismatch even when the values are otherwise rounded to cents', () => {
      for (const arsSpent of ['150000.01', '149999.99']) {
        expect(() =>
          deriveUsdPurchase({
            usdAmount: '100.00',
            arsSpent,
            effectiveRate: '1500.00',
          }),
        ).toThrow('USD purchase values are incoherent')
      }
    })

    it('rejects one-field inputs', () => {
      expect(() => deriveUsdPurchase({ usdAmount: '100.00' })).toThrow(
        'USD purchase derivation requires at least two positive values',
      )
      expect(() => deriveUsdPurchase({ arsSpent: '150000.00' })).toThrow(
        'USD purchase derivation requires at least two positive values',
      )
      expect(() => deriveUsdPurchase({ effectiveRate: '1500.00' })).toThrow(
        'USD purchase derivation requires at least two positive values',
      )
      expect(() => deriveUsdPurchase({})).toThrow(
        'USD purchase derivation requires at least two positive values',
      )
    })

    it('rejects zero or negative values', () => {
      expect(() =>
        deriveUsdPurchase({ usdAmount: '0.00', arsSpent: '150000.00' }),
      ).toThrow('USD purchase values must be positive')
      expect(() =>
        deriveUsdPurchase({ usdAmount: '-10.00', arsSpent: '150000.00' }),
      ).toThrow('USD purchase values must be positive')
      expect(() =>
        deriveUsdPurchase({ usdAmount: '100.00', effectiveRate: '-500.00' }),
      ).toThrow('USD purchase values must be positive')
    })
  })
})

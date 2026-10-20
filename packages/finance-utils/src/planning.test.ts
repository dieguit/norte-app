import { describe, expect, it } from 'vitest'
import {
  PLANNING_ARS_PER_USD,
  PROJECTION_HORIZON_MONTHS,
  convertCommitmentToDestination,
  deriveEmergencyFundTarget,
  getArsEquivalent,
} from './planning'

describe('planning domain helpers', () => {
  describe('constants', () => {
    it('defines planning constants', () => {
      expect(PLANNING_ARS_PER_USD).toBe('1500')
      expect(PROJECTION_HORIZON_MONTHS).toBe(720)
    })
  })

  describe('emergency target and commitment conversion', () => {
    it('converts the emergency target and monthly commitment at the planning rate', () => {
      expect(deriveEmergencyFundTarget({ amount: '250000.00', currency: 'ARS' }, 6)).toEqual({
        amount: '1000.00',
        currency: 'USD',
      })
      expect(
        convertCommitmentToDestination(
          { amount: '50000.00', currency: 'ARS' },
          'USD',
        ),
      ).toEqual({ amount: '33.33', currency: 'USD' })
    })

    it('keeps an ARS commitment unchanged for an ARS channel', () => {
      expect(
        convertCommitmentToDestination(
          { amount: '50000.00', currency: 'ARS' },
          'ARS',
        ),
      ).toEqual({ amount: '50000.00', currency: 'ARS' })
    })

    it('throws when converting non-ARS to non-USD or invalid direction', () => {
      expect(() =>
        convertCommitmentToDestination({ amount: '10.00', currency: 'USD' }, 'ARS'),
      ).toThrow('Unsupported planning-rate conversion.')
    })

    it('throws when emergency expenses are not ARS', () => {
      expect(() =>
        deriveEmergencyFundTarget({ amount: '100.00', currency: 'USD' }, 3),
      ).toThrow('Emergency expenses must use ARS.')
    })
  })

  describe('getArsEquivalent', () => {
    it('converts a positive USD input at the planning rate', () => {
      expect(getArsEquivalent('1.250,50', 'USD')?.toFixed(2)).toBe('1875750.00')
    })

    it('returns null for non-USD or invalid/zero amounts', () => {
      expect(getArsEquivalent('100', 'ARS')).toBeNull()
      expect(getArsEquivalent('0', 'USD')).toBeNull()
      expect(getArsEquivalent('invalid', 'USD')).toBeNull()
    })
  })
})

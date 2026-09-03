import { describe, expect, it } from 'vitest'
import {
  PLANNING_ARS_PER_USD,
  convertCommitmentToDestination,
  deriveEmergencyFundTarget,
  getArsEquivalent,
  getNextCalendarMonth,
  getPreviousCalendarMonth,
  projectCompletionMonth,
} from './financial'

describe('financial domain helpers', () => {
  describe('emergency target and commitment conversion', () => {
    it('converts the emergency target and monthly commitment at the planning rate', () => {
      expect(PLANNING_ARS_PER_USD).toBe('1500')
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
  })

  describe('projectCompletionMonth', () => {
    it('returns the month containing the final contribution', () => {
      expect(
        projectCompletionMonth(
          { amount: '1000.00', currency: 'USD' },
          { amount: '250.00', currency: 'USD' },
          '2026-09',
        ),
      ).toEqual({ status: 'available', completionMonth: '2026-12' })
    })

    it('returns outside_horizon for zero commitments and projections beyond 720 months', () => {
      expect(
        projectCompletionMonth(
          { amount: '1000.00', currency: 'USD' },
          { amount: '0.00', currency: 'USD' },
          '2026-09',
        ),
      ).toEqual({ status: 'outside_horizon' })

      expect(
        projectCompletionMonth(
          { amount: '721.00', currency: 'USD' },
          { amount: '1.00', currency: 'USD' },
          '2026-09',
        ),
      ).toEqual({ status: 'outside_horizon' })
    })

    it('uses the first day of the next UTC calendar month', () => {
      expect(getNextCalendarMonth(new Date('2026-12-31T23:59:59Z'))).toBe('2027-01')
    })

    it('uses the previous UTC calendar month', () => {
      expect(getPreviousCalendarMonth(new Date('2026-08-21T18:00:00Z'))).toBe('2026-07')
      expect(getPreviousCalendarMonth(new Date('2026-01-01T00:00:00Z'))).toBe('2025-12')
    })
  })

  describe('getArsEquivalent', () => {
    it('converts a positive USD input at the planning rate', () => {
      expect(getArsEquivalent('1.250,50', 'USD')?.toFixed(2)).toBe('1875750.00')
    })
  })
})

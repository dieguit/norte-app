import { describe, expect, it } from 'vitest';
import { deriveShortfalls } from './profile.service';

describe('previous month shortfalls', () => {
  describe('deriveShortfalls', () => {
    const baseInput = {
      closedMonth: '2026-07',
      plannedMonthlyContribution: '150000.00',
      goals: [
        { id: 'g-save-ars', strategy: 'save', currency: 'ARS' as const },
        { id: 'g-save-usd', strategy: 'save', currency: 'USD' as const },
        { id: 'g-invest-ars', strategy: 'invest', currency: 'ARS' as const },
        { id: 'g-invest-usd', strategy: 'invest', currency: 'USD' as const },
      ],
      allocations: [
        { goalId: 'g-save-ars', percentage: '20.00' }, // 150000 * 20% = 30000 ARS
        { goalId: 'g-save-usd', percentage: '30.00' }, // (150000 * 30%) / 1500 = 30 USD
        { goalId: 'g-invest-ars', percentage: '33.333333333333336' }, // 150000 * (1/3) = 50000 ARS
        { goalId: 'g-invest-usd', percentage: '16.666666666666668' }, // (150000 * (1/6)) / 1500 = 16.67 USD
      ],
      savingContributions: [],
      investmentContributions: [],
    };

    it('returns separate saving USD and investment ARS shortfalls for the prior month', () => {
      const input = {
        closedMonth: '2026-07',
        plannedMonthlyContribution: '150000.00',
        goals: [
          { id: 'g-save-usd', strategy: 'save', currency: 'USD' as const },
          { id: 'g-invest-ars', strategy: 'invest', currency: 'ARS' as const },
        ],
        allocations: [
          { goalId: 'g-save-usd', percentage: '30.00' }, // Expected: (150000 * 30%) / 1500 = 30.00 USD
          { goalId: 'g-invest-ars', percentage: '33.333333333333336' }, // Expected: 150000 * (1/3) = 50000.00 ARS
        ],
        savingContributions: [
          {
            amount: '10.00',
            currency: 'USD',
            createdAt: '2026-07-15T10:00:00.000Z',
          },
        ],
        investmentContributions: [
          {
            amount: '25000.00',
            currency: 'ARS',
            createdAt: new Date('2026-07-20T12:00:00.000Z'),
          },
        ],
      };

      expect(deriveShortfalls(input)).toEqual([
        {
          kind: 'saving',
          currency: 'USD',
          amount: { amount: '20.00', currency: 'USD' },
        },
        {
          kind: 'investment',
          currency: 'ARS',
          amount: { amount: '25000.00', currency: 'ARS' },
        },
      ]);
    });

    it('returns no result when plannedMonthlyContribution is null or non-positive', () => {
      expect(
        deriveShortfalls({ ...baseInput, plannedMonthlyContribution: null }),
      ).toEqual([]);
      expect(
        deriveShortfalls({ ...baseInput, plannedMonthlyContribution: '0.00' }),
      ).toEqual([]);
      expect(
        deriveShortfalls({
          ...baseInput,
          plannedMonthlyContribution: '-1000.00',
        }),
      ).toEqual([]);
      expect(
        deriveShortfalls({ ...baseInput, plannedMonthlyContribution: '' }),
      ).toEqual([]);
    });

    it('returns no result when allocations are empty', () => {
      expect(deriveShortfalls({ ...baseInput, allocations: [] })).toEqual([]);
    });

    it('omits categories where actual contributions meet or exceed expected targets', () => {
      const input = {
        ...baseInput,
        allocations: [
          { goalId: 'g-save-ars', percentage: '20.00' }, // Expected: 30000 ARS
          { goalId: 'g-save-usd', percentage: '30.00' }, // Expected: 30 USD
        ],
        savingContributions: [
          {
            amount: '30000.00',
            currency: 'ARS',
            createdAt: '2026-07-05T00:00:00.000Z',
          }, // Exact match
          {
            amount: '50.00',
            currency: 'USD',
            createdAt: '2026-07-10T00:00:00.000Z',
          }, // Over target (30 USD expected)
        ],
      };

      expect(deriveShortfalls(input)).toEqual([]);
    });

    it('ignores contributions outside the closed UTC month', () => {
      const input = {
        ...baseInput,
        allocations: [
          { goalId: 'g-save-ars', percentage: '20.00' }, // Expected: 30000 ARS
        ],
        savingContributions: [
          // Different months
          {
            amount: '30000.00',
            currency: 'ARS',
            createdAt: '2026-06-30T23:59:59.999Z',
          },
          {
            amount: '30000.00',
            currency: 'ARS',
            createdAt: '2026-08-01T00:00:00.000Z',
          },
          // Partial in closed month
          {
            amount: '10000.00',
            currency: 'ARS',
            createdAt: '2026-07-15T12:00:00.000Z',
          },
        ],
      };

      // Expected 30000 ARS - 10000 ARS = 20000.00 ARS
      expect(deriveShortfalls(input)).toEqual([
        {
          kind: 'saving',
          currency: 'ARS',
          amount: { amount: '20000.00', currency: 'ARS' },
        },
      ]);
    });

    it('ignores negative or invalid contribution amounts', () => {
      const input = {
        ...baseInput,
        allocations: [
          { goalId: 'g-save-ars', percentage: '20.00' }, // Expected: 30000 ARS
        ],
        savingContributions: [
          {
            amount: '-5000.00',
            currency: 'ARS',
            createdAt: '2026-07-10T00:00:00.000Z',
          },
          {
            amount: '0.00',
            currency: 'ARS',
            createdAt: '2026-07-11T00:00:00.000Z',
          },
          {
            amount: 'invalid',
            currency: 'ARS',
            createdAt: '2026-07-12T00:00:00.000Z',
          },
          {
            amount: '5000.00',
            currency: 'ARS',
            createdAt: '2026-07-13T00:00:00.000Z',
          },
        ],
      };

      // Expected 30000 ARS - 5000 ARS = 25000.00 ARS
      expect(deriveShortfalls(input)).toEqual([
        {
          kind: 'saving',
          currency: 'ARS',
          amount: { amount: '25000.00', currency: 'ARS' },
        },
      ]);
    });

    it('ignores malformed historical investment contribution amounts', () => {
      const input = {
        closedMonth: '2026-07',
        plannedMonthlyContribution: '100000.00',
        goals: [
          { id: 'g-invest-ars', strategy: 'invest', currency: 'ARS' as const },
        ],
        allocations: [{ goalId: 'g-invest-ars', percentage: '50.00' }],
        savingContributions: [],
        investmentContributions: [
          {
            amount: 'invalid',
            currency: 'ARS',
            createdAt: '2026-07-12T00:00:00.000Z',
          },
        ],
      };

      expect(deriveShortfalls(input)).toEqual([
        {
          kind: 'investment',
          currency: 'ARS',
          amount: { amount: '50000.00', currency: 'ARS' },
        },
      ]);
    });

    it('aggregates multiple goals for the same kind and currency correctly', () => {
      const input = {
        closedMonth: '2026-07',
        plannedMonthlyContribution: '200000.00',
        goals: [
          { id: 'g-save-ars-1', strategy: 'save', currency: 'ARS' as const },
          { id: 'g-save-ars-2', strategy: 'save', currency: 'ARS' as const },
        ],
        allocations: [
          { goalId: 'g-save-ars-1', percentage: '25.00' },
          { goalId: 'g-save-ars-2', percentage: '25.00' },
        ],
        savingContributions: [
          {
            amount: '40000.00',
            currency: 'ARS',
            createdAt: '2026-07-10T00:00:00.000Z',
          },
        ],
        investmentContributions: [],
      };

      // Expected: 200000 * 50% = 100000 ARS. Actual: 40000 ARS. Shortfall: 60000.00 ARS
      expect(deriveShortfalls(input)).toEqual([
        {
          kind: 'saving',
          currency: 'ARS',
          amount: { amount: '60000.00', currency: 'ARS' },
        },
      ]);
    });
  });
});

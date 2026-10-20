import { describe, expect, it } from 'vitest';
import { calculateFinancesSummary } from './finances.service';

describe('calculateFinancesSummary', () => {
  it('uses selected month, half-open expense end month, USD planning rate and clamps dedication below zero', () => {
    expect(
      calculateFinancesSummary({
        month: '2026-08',
        dedication: '90.00',
        incomes: [
          {
            amount: '100.00',
            currency: 'USD',
            recurring: true,
            effectiveMonth: '2026-01-01',
          },
          {
            amount: '50.00',
            currency: 'ARS',
            recurring: false,
            effectiveMonth: '2026-08-01',
          },
        ],
        expenses: [
          {
            amount: '20.00',
            currency: 'USD',
            recurring: true,
            effectiveMonth: '2026-01-01',
            endMonth: '2026-08-01',
          },
          {
            amount: '200000.00',
            currency: 'ARS',
            recurring: false,
            effectiveMonth: '2026-08-01',
            endMonth: null,
          },
        ],
      }),
    ).toEqual({
      income: { amount: '150050.00', currency: 'ARS' },
      expenses: { amount: '200000.00', currency: 'ARS' },
      balance: { amount: '-49950.00', currency: 'ARS' },
      contribution: { amount: '0.00', currency: 'ARS' },
    });
  });
});

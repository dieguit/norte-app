import { describe, expect, it } from 'vitest';
import {
  FinancesWorkspaceSchema,
  isExpenseIncludedInMonth,
  isIncomeIncludedInMonth,
} from './finances.schema';

const response = {
  goalDedicationPercentage: '90.00', month: '2026-10',
  summary: { income: { amount: '1.00', currency: 'ARS' }, expenses: { amount: '0.00', currency: 'ARS' }, balance: { amount: '1.00', currency: 'ARS' }, contribution: { amount: '0.90', currency: 'ARS' } },
  incomes: { sources: [], incomes: [{ id: '11111111-1111-4111-8111-111111111111', sourceKind: 'salary', sourceId: null, sourceName: 'salary', concept: null, amount: '1.00', currency: 'ARS', recurring: true, effectiveMonth: '2026-01-01', arsEquivalent: null }] },
  expenses: { sources: [], expenses: [{ id: '22222222-2222-4222-8222-222222222222', sourceKind: 'custom', sourceId: '33333333-3333-4333-8333-333333333333', sourceName: 'Concepto eliminado', concept: null, amount: '2.00', currency: 'USD', recurring: true, effectiveMonth: '2026-01-01', endMonth: '2026-10-01', arsEquivalent: '3000.00' }] },
  savings: { places: [{ id: '44444444-4444-4444-8444-444444444444', name: 'Banco', balances: { ARS: '0.00', USD: '0.00' }, hasMovements: true }], movements: [{ kind: 'transfer', id: '55555555-5555-4555-8555-555555555555', fromPlaceId: '44444444-4444-4444-8444-444444444444', fromPlaceName: 'Banco', toPlaceId: '44444444-4444-4444-8444-444444444444', toPlaceName: 'Banco', amount: '1.00', currency: 'ARS', createdAt: '2026-10-19T12:00:00.000Z' }] },
};

describe('FinancesWorkspaceSchema persisted wire dates', () => {
  it('accepts API month and SQL date / ISO timestamp formats', () => {
    expect(FinancesWorkspaceSchema.parse(response)).toEqual(response);
  });

  it('rejects impossible month and calendar dates', () => {
    expect(FinancesWorkspaceSchema.safeParse({ ...response, month: '2026-13' }).success).toBe(false);
    expect(FinancesWorkspaceSchema.safeParse({ ...response, incomes: { ...response.incomes, incomes: [{ ...response.incomes.incomes[0], effectiveMonth: '2026-02-30' }] } }).success).toBe(false);
    expect(FinancesWorkspaceSchema.safeParse({ ...response, savings: { ...response.savings, movements: [{ ...response.savings.movements[0], id: 'transfer-id' }] } }).success).toBe(false);
  });

  describe('isExpenseIncludedInMonth and isIncomeIncludedInMonth', () => {
    it('correctly determines recurring and one-time expense inclusion', () => {
      expect(isExpenseIncludedInMonth({ recurring: true, effectiveMonth: '2026-01-01', endMonth: null }, '2026-08')).toBe(true);
      expect(isExpenseIncludedInMonth({ recurring: true, effectiveMonth: '2026-09-01', endMonth: null }, '2026-08')).toBe(false);
      expect(isExpenseIncludedInMonth({ recurring: true, effectiveMonth: '2026-01-01', endMonth: '2026-08-01' }, '2026-08')).toBe(false);
      expect(isExpenseIncludedInMonth({ recurring: true, effectiveMonth: '2026-01-01', endMonth: '2026-09-01' }, '2026-08')).toBe(true);
      expect(isExpenseIncludedInMonth({ recurring: false, effectiveMonth: '2026-08-01', endMonth: null }, '2026-08')).toBe(true);
      expect(isExpenseIncludedInMonth({ recurring: false, effectiveMonth: '2026-07-01', endMonth: null }, '2026-08')).toBe(false);
    });

    it('correctly determines recurring and one-time income inclusion', () => {
      expect(isIncomeIncludedInMonth({ recurring: true, effectiveMonth: '2026-01-01' }, '2026-08')).toBe(true);
      expect(isIncomeIncludedInMonth({ recurring: true, effectiveMonth: '2026-09-01' }, '2026-08')).toBe(false);
      expect(isIncomeIncludedInMonth({ recurring: false, effectiveMonth: '2026-08-01' }, '2026-08')).toBe(true);
      expect(isIncomeIncludedInMonth({ recurring: false, effectiveMonth: '2026-07-01' }, '2026-08')).toBe(false);
    });
  });
});

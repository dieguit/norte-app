import { describe, expect, it, vi } from 'vitest';
import { calculateFinancesSummary, FinancesService } from './finances.service';

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

describe('FinancesService daily summary', () => {
  const findMany = (rows: unknown[]) => ({
    findMany: vi.fn().mockResolvedValue(rows),
  });
  const income = {
    id: 'i1',
    userId: 'u1',
    sourceKind: 'salary',
    sourceId: null,
    concept: 'Sueldo',
    amount: '100.00',
    currency: 'USD',
    recurring: false,
    effectiveMonth: '2026-10-01',
  };
  const expenseA = {
    id: 'e1',
    userId: 'u1',
    sourceKind: 'custom',
    sourceId: 's1',
    concept: 'Super',
    amount: '1500.50',
    currency: 'ARS',
    recurring: false,
    effectiveMonth: '2026-10-01',
    endMonth: null,
  };
  const expenseB = {
    ...expenseA,
    id: 'e2',
    sourceId: null,
    sourceKind: 'health',
    amount: '499.50',
  };
  const db = {
    query: {
      incomeSources: findMany([]),
      incomes: findMany([income]),
      expenseSources: findMany([{ id: 's1', name: 'Supermercado' }]),
      expenses: findMany([expenseA, expenseB]),
      savingContributions: findMany([
        { id: 'c1', amount: '10.00', currency: 'USD' },
      ]),
      investmentContributions: findMany([]),
    },
  };

  it('maps movements in range with source names, ARS equivalent and per-currency totals', async () => {
    const service = new FinancesService(db as never);
    const result = await service.getMovementsInRange(
      'u1',
      new Date('2026-10-21T03:00:00Z'),
      new Date('2026-10-22T03:00:00Z'),
    );
    expect(result.incomes).toEqual([
      expect.objectContaining({
        id: 'i1',
        sourceName: 'salary',
        arsEquivalent: '150000.00',
      }),
    ]);
    expect(result.expenses.map((e) => e.sourceName)).toEqual([
      'Supermercado',
      'health',
    ]);
    expect(result.contributions).toEqual([
      { kind: 'saving', id: 'c1', amount: '10.00', currency: 'USD' },
    ]);
    expect(result.totals).toEqual({
      incomes: { USD: '100.00' },
      expenses: { ARS: '2000.00' },
      contributions: { USD: '10.00' },
    });
    expect(result.from).toBe('2026-10-21T03:00:00.000Z');
    expect(result.to).toBe('2026-10-22T03:00:00.000Z');
  });

  it.each([
    ['23:59 BA', '2026-10-22T02:59:00Z', '2026-10-21'],
    ['00:00 BA', '2026-10-22T03:00:00Z', '2026-10-22'],
  ])(
    'getDailySummary at %s uses the BA day range',
    async (_label, nowIso, day) => {
      const service = new FinancesService(db as never);
      const spy = vi.spyOn(service, 'getMovementsInRange');
      const result = await service.getDailySummary('u1', new Date(nowIso));
      const from = new Date(`${day}T00:00:00-03:00`);
      expect(spy).toHaveBeenCalledWith(
        'u1',
        from,
        new Date(from.getTime() + 86_400_000),
      );
      expect(result.day).toBe(day);
    },
  );
});

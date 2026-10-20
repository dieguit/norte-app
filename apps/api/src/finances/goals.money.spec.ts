import { describe, expect, it } from 'vitest';
import { calculateAllocationAmounts, createMoney } from './goals.money';

describe('calculateAllocationAmounts', () => {
  it.each([
    ['negative entry', [{ id: 'a', percentage: -10 }, { id: 'b', percentage: 110 }]],
    ['entry above 100', [{ id: 'a', percentage: 110 }, { id: 'b', percentage: -10 }]],
    ['non-finite entry', [{ id: 'a', percentage: Number.NaN }, { id: 'b', percentage: 100 }]],
  ])('rejects %s even when the total is 100', (_caseName, allocations) => {
    expect(() => calculateAllocationAmounts(createMoney('1.00', 'ARS'), allocations))
      .toThrow('Allocation percentages must sum to 100%');
  });

  it('rejects a negative total', () => {
    expect(() => calculateAllocationAmounts({ amount: '-5.00', currency: 'ARS' }, [{ id: 'a', percentage: 100 }]))
      .toThrow('Allocation percentages must sum to 100%');
  });

  it('distributes valid percentage rounding remainder deterministically by input order', () => {
    const total = createMoney('0.01', 'ARS');
    expect(calculateAllocationAmounts(total, [
      { id: 'b', percentage: 50 },
      { id: 'a', percentage: 50 },
    ])).toEqual([
      { id: 'b', amount: { amount: '0.01', currency: 'ARS' } },
      { id: 'a', amount: { amount: '0.00', currency: 'ARS' } },
    ]);
  });
});

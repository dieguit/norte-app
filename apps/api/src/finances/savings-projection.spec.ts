import { describe, expect, it } from 'vitest';
import { calculateSavingsBalances, filterOwnedSavingsMovements } from './savings-projection';

describe('filterOwnedSavingsMovements', () => {
  it('drops contributions, transfer contamination, and withdrawals unless both referenced objects are owned', () => {
    expect(filterOwnedSavingsMovements({
      placeIds: new Set(['owned']), goalIds: new Set(['goal']),
      contributions: [{ placeId: 'owned' }, { placeId: 'foreign' }],
      transfers: [{ fromPlaceId: 'owned', toPlaceId: 'foreign' }, { fromPlaceId: 'owned', toPlaceId: 'owned' }],
      withdrawals: [{ placeId: 'owned', goalId: 'foreign-goal' }, { placeId: 'foreign', goalId: 'goal' }, { placeId: 'owned', goalId: 'goal' }],
    })).toEqual({
      contributions: [{ placeId: 'owned' }],
      transfers: [{ fromPlaceId: 'owned', toPlaceId: 'owned' }],
      withdrawals: [{ placeId: 'owned', goalId: 'goal' }],
    });
  });
});

describe('calculateSavingsBalances', () => {
  it('matches the original ledger projection for contributions, transfers, and owned withdrawals', () => {
    expect(calculateSavingsBalances({
      places: [{ id: 'a', name: 'Banco' }, { id: 'b', name: 'Caja' }],
      contributions: [{ placeId: 'a', amount: '1000.00', currency: 'ARS' }],
      transfers: [{ fromPlaceId: 'a', toPlaceId: 'b', amount: '250.00', currency: 'ARS' }],
      withdrawals: [{ placeId: 'a', amount: '100.00', currency: 'ARS' }],
    })).toEqual([
      { id: 'a', name: 'Banco', balances: { ARS: '650.00', USD: '0.00' } },
      { id: 'b', name: 'Caja', balances: { ARS: '250.00', USD: '0.00' } },
    ]);
  });
});

describe('calculateSavingsBalances parity with web calculateSavingsPlacesWorkspace', () => {
  const placeA = { id: 'p1', name: 'Banco' };
  const placeB = { id: 'p2', name: 'Caja' };

  it('matches web balances for mixed ARS/USD contributions and transfers', () => {
    const balances = calculateSavingsBalances({
      places: [placeA, placeB],
      contributions: [
        { placeId: 'p1', amount: '1000.00', currency: 'ARS' },
        { placeId: 'p1', amount: '200.00', currency: 'USD' },
        { placeId: 'p2', amount: '500.00', currency: 'ARS' },
      ],
      transfers: [{ fromPlaceId: 'p1', toPlaceId: 'p2', amount: '250.00', currency: 'ARS' }],
      withdrawals: [],
    });
    expect(balances).toEqual([
      { id: 'p1', name: 'Banco', balances: { ARS: '750.00', USD: '200.00' } },
      { id: 'p2', name: 'Caja', balances: { ARS: '750.00', USD: '0.00' } },
    ]);
  });

  it('matches web completion withdrawal subtraction', () => {
    const balances = calculateSavingsBalances({
      places: [placeA],
      contributions: [{ placeId: 'p1', amount: '1000.00', currency: 'ARS' }],
      transfers: [],
      withdrawals: [{ placeId: 'p1', amount: '600.00', currency: 'ARS' }],
    });
    expect(balances[0].balances.ARS).toBe('400.00');
  });
});

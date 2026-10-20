import BigNumber from 'bignumber.js';

export function filterOwnedSavingsMovements<TContribution extends { placeId: string }, TTransfer extends { fromPlaceId: string; toPlaceId: string }, TWithdrawal extends { placeId: string; goalId: string }>(input: {
  placeIds: Set<string>;
  goalIds: Set<string>;
  contributions: TContribution[];
  transfers: TTransfer[];
  withdrawals: TWithdrawal[];
}) {
  return {
    contributions: input.contributions.filter(({ placeId }) => input.placeIds.has(placeId)),
    transfers: input.transfers.filter(({ fromPlaceId, toPlaceId }) => input.placeIds.has(fromPlaceId) && input.placeIds.has(toPlaceId)),
    withdrawals: input.withdrawals.filter(({ placeId, goalId }) => input.placeIds.has(placeId) && input.goalIds.has(goalId)),
  };
}

export function calculateSavingsBalances(input: {
  places: Array<{ id: string; name: string }>;
  contributions: Array<{ placeId: string; amount: string; currency: string }>;
  transfers: Array<{ fromPlaceId: string; toPlaceId: string; amount: string; currency: string }>;
  withdrawals: Array<{ placeId: string; amount: string; currency: string }>;
}) {
  const balances = new Map(input.places.map(({ id }) => [id, { ARS: new BigNumber(0), USD: new BigNumber(0) }]));
  for (const row of input.contributions) {
    const balance = balances.get(row.placeId);
    if (balance) balance[row.currency as 'ARS' | 'USD'] = balance[row.currency as 'ARS' | 'USD'].plus(row.amount);
  }
  for (const row of input.transfers) {
    const currency = row.currency as 'ARS' | 'USD';
    const from = balances.get(row.fromPlaceId);
    const to = balances.get(row.toPlaceId);
    if (from) from[currency] = from[currency].minus(row.amount);
    if (to) to[currency] = to[currency].plus(row.amount);
  }
  for (const row of input.withdrawals) {
    const balance = balances.get(row.placeId);
    if (balance) balance[row.currency as 'ARS' | 'USD'] = balance[row.currency as 'ARS' | 'USD'].minus(row.amount);
  }
  return input.places.map(({ id, name }) => ({ id, name, balances: { ARS: balances.get(id)!.ARS.toFixed(2), USD: balances.get(id)!.USD.toFixed(2) } })).sort((a, b) => a.name.localeCompare(b.name, 'es-AR'));
}

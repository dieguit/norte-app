import BigNumber from 'bignumber.js';

export type CurrencyCode = 'ARS' | 'USD';
export type Money = { amount: string; currency: CurrencyCode };

export function parseMoneyInput(input: string, currency: CurrencyCode): Money | null {
  const clean = input.replace(/[$]|US[$]|USD|ARS|\s/gi, '').trim();
  if (!clean) return null;
  let normalized = clean;
  if (clean.includes(',') && clean.includes('.')) normalized = clean.replace(/\./g, '').replace(',', '.');
  else if (clean.includes(',')) normalized = clean.replace(',', '.');
  else if (clean.includes('.')) {
    const parts = clean.split('.');
    if (parts.length > 2 || parts[1].length === 3) normalized = clean.replace(/\./g, '');
  }
  try {
    const amount = new BigNumber(normalized);
    return amount.isFinite() && !amount.isNegative() ? createMoney(amount, currency) : null;
  } catch { return null; }
}

export function isPositiveMoney(money: Money): boolean {
  return new BigNumber(money.amount).isGreaterThan(0);
}

export function calculateAllocationAmounts(total: Money, allocations: Array<{ id: string; percentage: number | string }>) {
  if (!allocations.length) return [];
  let sum = new BigNumber(0);
  try {
    for (const { percentage: value } of allocations) {
      const percentage = new BigNumber(value);
      if (!percentage.isFinite() || percentage.isNaN() || percentage.isNegative() || percentage.isGreaterThan(100)) {
        throw new Error('Allocation percentages must sum to 100%');
      }
      sum = sum.plus(percentage);
    }
  } catch {
    throw new Error('Allocation percentages must sum to 100%');
  }
  if (!sum.isEqualTo(100)) throw new Error(`Allocation percentages must sum to 100%, got ${sum.toString()}%`);
  const cents = new BigNumber(total.amount).times(100);
  if (cents.isNegative()) throw new Error('Allocation percentages must sum to 100%');
  const exact = allocations.map((row, index) => {
    const amount = cents.times(row.percentage).dividedBy(100);
    const base = amount.integerValue(BigNumber.ROUND_DOWN);
    return { id: row.id, index, base, remainder: amount.minus(base) };
  });
  const final = exact.map(({ base }) => base);
  const left = Number(cents.minus(final.reduce((a, b) => a.plus(b), new BigNumber(0))).toString());
  const order = [...exact].sort((a, b) => b.remainder.comparedTo(a.remainder)! || a.index - b.index);
  for (let i = 0; i < left; i++) final[order[i % order.length].index] = final[order[i % order.length].index].plus(1);
  return allocations.map((row, index) => ({ id: row.id, amount: createMoney(final[index].dividedBy(100), total.currency) }));
}

export function createMoney(amount: string | BigNumber, currency: CurrencyCode): Money {
  const value = new BigNumber(amount);
  if (!value.isFinite()) throw new Error(`Invalid money amount: ${amount}`);
  return { amount: value.toFixed(2, BigNumber.ROUND_HALF_UP), currency };
}

export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  return createMoney(new BigNumber(a.amount).plus(b.amount), a.currency);
}

export function multiplyMoneyByFactor(money: Money, factor: number | string): Money {
  const value = new BigNumber(factor);
  if (!value.isFinite()) throw new Error(`Invalid multiplication factor: ${factor}`);
  return createMoney(new BigNumber(money.amount).times(value), money.currency);
}

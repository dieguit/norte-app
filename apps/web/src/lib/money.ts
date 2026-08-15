import BigNumber from "bignumber.js";

export type CurrencyCode = "ARS" | "USD";

export interface Money {
  amount: string; // Canonical 2-decimal string
  currency: CurrencyCode;
}

export function createMoney(amount: string | BigNumber, currency: CurrencyCode): Money {
  try {
    const bn = new BigNumber(amount);
    if (!bn.isFinite() || bn.isNaN()) {
      throw new Error(`Invalid money amount: ${amount}`);
    }
    return {
      amount: bn.toFixed(2, BigNumber.ROUND_HALF_UP),
      currency,
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith("Invalid money amount")) {
      throw err;
    }
    throw new Error(`Invalid money amount: ${amount}`);
  }
}

export function parseMoneyInput(input: string, currency: CurrencyCode): Money | null {
  if (typeof input !== "string") return null;
  const clean = input
    .replace(/[$]|US[$]|USD|ARS|\s/gi, "")
    .trim();
  if (!clean) return null;

  // Handle Argentine separators: e.g. 1.250,50 -> 1250.50
  let normalized = clean;
  if (clean.includes(",") && clean.includes(".")) {
    normalized = clean.replace(/\./g, "").replace(",", ".");
  } else if (clean.includes(",")) {
    normalized = clean.replace(",", ".");
  }

  try {
    const bn = new BigNumber(normalized);
    if (!bn.isFinite() || bn.isNaN() || bn.isNegative()) {
      return null;
    }
    return createMoney(bn, currency);
  } catch {
    return null;
  }
}

export function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}

export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return createMoney(new BigNumber(a.amount).plus(b.amount), a.currency);
}

export function subtractMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  const result = new BigNumber(a.amount).minus(b.amount);
  if (result.isNegative()) {
    throw new Error(`Subtract resulted in negative money: ${result.toFixed(2)}`);
  }
  return createMoney(result, a.currency);
}

export function multiplyMoneyByFactor(money: Money, factor: number | string): Money {
  let f: BigNumber;
  try {
    f = new BigNumber(factor);
    if (!f.isFinite() || f.isNaN()) {
      throw new Error(`Invalid multiplication factor: ${factor}`);
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith("Invalid multiplication factor")) {
      throw err;
    }
    throw new Error(`Invalid multiplication factor: ${factor}`);
  }
  return createMoney(new BigNumber(money.amount).times(f), money.currency);
}

export function compareMoney(a: Money, b: Money): number {
  assertSameCurrency(a, b);
  return new BigNumber(a.amount).comparedTo(b.amount) ?? 0;
}

export function isZeroMoney(money: Money): boolean {
  return new BigNumber(money.amount).isZero();
}

export function isPositiveMoney(money: Money): boolean {
  return new BigNumber(money.amount).isGreaterThan(0);
}

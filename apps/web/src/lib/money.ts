import BigNumber from "bignumber.js";

const integerFormatter = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

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

  // Handle Argentine separators: e.g. 1.250,50 -> 1250.50, 125.000 -> 125000, 1.250.000 -> 1250000
  let normalized = clean;
  if (clean.includes(",") && clean.includes(".")) {
    normalized = clean.replace(/\./g, "").replace(",", ".");
  } else if (clean.includes(",")) {
    normalized = clean.replace(",", ".");
  } else if (clean.includes(".")) {
    const parts = clean.split(".");
    // If multiple dots (1.000.000) or single dot followed by 3 digits (125.000), treat as thousands separator
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      normalized = clean.replace(/\./g, "");
    }
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

export function formatMoneyInput(input: string): string {
  const [integer, decimal] = input.replace(/[^\d,]/g, "").split(",", 2);
  const formattedInteger = integer ? integerFormatter.format(BigInt(integer)) : "";
  return decimal === undefined ? formattedInteger : `${formattedInteger || "0"},${decimal.slice(0, 2)}`;
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

export interface AllocationTarget {
  id: string;
  percentage: number | string;
}

export interface AllocatedMoney {
  id: string;
  amount: Money;
}

interface AllocationItem {
  id: string;
  index: number;
  baseCents: BigNumber;
  remainder: BigNumber;
}

function getTotalPercentage(allocations: AllocationTarget[]) {
  let totalPercentage = new BigNumber(0);
  try {
    for (const item of allocations) {
      const percentage = new BigNumber(item.percentage);
      if (
        !percentage.isFinite() ||
        percentage.isNaN() ||
        percentage.isNegative() ||
        percentage.isGreaterThan(100)
      ) {
        throw new Error("Allocation percentages must sum to 100%");
      }
      totalPercentage = totalPercentage.plus(percentage);
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith("Allocation percentages must sum to 100%")) {
      throw err;
    }
    throw new Error("Allocation percentages must sum to 100%");
  }
  return totalPercentage;
}

function getAllocationItems(totalCents: BigNumber, allocations: AllocationTarget[]) {
  return allocations.map((target, index): AllocationItem => {
    const exactCents = totalCents.times(target.percentage).dividedBy(100);
    const baseCents = exactCents.integerValue(BigNumber.ROUND_DOWN);
    return {
      id: target.id,
      index,
      baseCents,
      remainder: exactCents.minus(baseCents),
    };
  });
}

function distributeLeftoverCents(totalCents: BigNumber, items: AllocationItem[]) {
  const sumBaseCents = items.reduce((sum, item) => sum.plus(item.baseCents), new BigNumber(0));
  const leftoverCents = totalCents.minus(sumBaseCents);
  const sortedIndices = items
    .map((item, idx) => ({ idx, remainder: item.remainder, index: item.index }))
    .sort((a, b) => {
      const cmp = b.remainder.comparedTo(a.remainder) ?? 0;
      return cmp !== 0 ? cmp : a.index - b.index;
    });
  const finalCentsMap = new Map<number, BigNumber>();
  items.forEach((item, idx) => finalCentsMap.set(idx, item.baseCents));

  for (let i = new BigNumber(0); i.isLessThan(leftoverCents); i = i.plus(1)) {
    const targetIdx = sortedIndices[Number(i.mod(sortedIndices.length).toString())].idx;
    finalCentsMap.set(targetIdx, finalCentsMap.get(targetIdx)!.plus(1));
  }
  return finalCentsMap;
}

export function calculateAllocationAmounts(
  total: Money,
  allocations: AllocationTarget[]
): AllocatedMoney[] {
  if (allocations.length === 0) return [];

  const totalPercentage = getTotalPercentage(allocations);
  if (!totalPercentage.isEqualTo(100)) {
    throw new Error(`Allocation percentages must sum to 100%, got ${totalPercentage.toString()}%`);
  }

  const totalCents = new BigNumber(total.amount).times(100);
  if (totalCents.isNegative()) {
    throw new Error("Allocation percentages must sum to 100%");
  }
  const items = getAllocationItems(totalCents, allocations);
  const finalCentsMap = distributeLeftoverCents(totalCents, items);

  return items.map((item, idx) => {
    const finalCents = finalCentsMap.get(idx)!;
    const amountStr = finalCents.dividedBy(100).toFixed(2);
    return {
      id: item.id,
      amount: {
        amount: amountStr,
        currency: total.currency,
      },
    };
  });
}

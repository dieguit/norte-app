import { describe, expect, it } from "vitest";
import {
  createMoney,
  parseMoneyInput,
  addMoney,
  subtractMoney,
  multiplyMoneyByFactor,
  compareMoney,
  isZeroMoney,
  isPositiveMoney,
  assertSameCurrency,
  calculateAllocationAmounts,
} from "./money";

describe("Money core boundary", () => {
  it("normalizes amount to 2 decimal places", () => {
    const m = createMoney("100", "ARS");
    expect(m).toEqual({ amount: "100.00", currency: "ARS" });
  });

  it("throws on invalid money amounts in createMoney", () => {
    expect(() => createMoney("abc", "ARS")).toThrow("Invalid money amount: abc");
    expect(() => createMoney("Infinity", "ARS")).toThrow("Invalid money amount: Infinity");
    expect(() => createMoney(NaN as unknown as string, "ARS")).toThrow();
  });

  it("parses Argentine formatted input strings correctly", () => {
    expect(parseMoneyInput("1.250,50", "ARS")).toEqual({ amount: "1250.50", currency: "ARS" });
    expect(parseMoneyInput("$ 1.250,50", "ARS")).toEqual({ amount: "1250.50", currency: "ARS" });
    expect(parseMoneyInput("US$ 500,00", "USD")).toEqual({ amount: "500.00", currency: "USD" });
    expect(parseMoneyInput("1250,50", "ARS")).toEqual({ amount: "1250.50", currency: "ARS" });
    expect(parseMoneyInput("invalid", "ARS")).toBeNull();
    expect(parseMoneyInput("", "ARS")).toBeNull();
    expect(parseMoneyInput("   ", "ARS")).toBeNull();
    expect(parseMoneyInput("-50", "ARS")).toBeNull();
    expect(parseMoneyInput(123 as unknown as string, "ARS")).toBeNull();
  });

  it("performs exact addition and subtraction", () => {
    const a = createMoney("10.50", "ARS");
    const b = createMoney("5.25", "ARS");
    expect(addMoney(a, b)).toEqual({ amount: "15.75", currency: "ARS" });
    expect(subtractMoney(a, b)).toEqual({ amount: "5.25", currency: "ARS" });
  });

  it("throws on negative subtraction result", () => {
    const a = createMoney("5.00", "ARS");
    const b = createMoney("10.00", "ARS");
    expect(() => subtractMoney(a, b)).toThrow("Subtract resulted in negative money: -5.00");
  });

  it("multiplies by factor and rounds to 2 decimals using half-up", () => {
    const m = createMoney("10.00", "ARS");
    expect(multiplyMoneyByFactor(m, "0.125")).toEqual({ amount: "1.25", currency: "ARS" });
    expect(multiplyMoneyByFactor(m, 0.125)).toEqual({ amount: "1.25", currency: "ARS" });
  });

  it("throws on invalid factor in multiplyMoneyByFactor", () => {
    const m = createMoney("10.00", "ARS");
    expect(() => multiplyMoneyByFactor(m, "invalid")).toThrow("Invalid multiplication factor: invalid");
    expect(() => multiplyMoneyByFactor(m, Infinity)).toThrow("Invalid multiplication factor: Infinity");
  });

  it("rejects cross-currency operations", () => {
    const ars = createMoney("10.00", "ARS");
    const usd = createMoney("10.00", "USD");
    expect(() => addMoney(ars, usd)).toThrow("Currency mismatch: ARS vs USD");
    expect(() => subtractMoney(ars, usd)).toThrow("Currency mismatch: ARS vs USD");
    expect(() => compareMoney(ars, usd)).toThrow("Currency mismatch: ARS vs USD");
    expect(() => assertSameCurrency(ars, usd)).toThrow("Currency mismatch: ARS vs USD");
  });

  it("compares money amounts correctly", () => {
    const a = createMoney("10.00", "ARS");
    const b = createMoney("20.00", "ARS");
    expect(compareMoney(a, b)).toBe(-1);
    expect(compareMoney(b, a)).toBe(1);
    expect(compareMoney(a, a)).toBe(0);
  });

  it("checks zero and positive money", () => {
    const zero = createMoney("0", "ARS");
    const pos = createMoney("10.00", "ARS");
    expect(isZeroMoney(zero)).toBe(true);
    expect(isZeroMoney(pos)).toBe(false);
    expect(isPositiveMoney(pos)).toBe(true);
    expect(isPositiveMoney(zero)).toBe(false);
  });
});

describe("calculateAllocationAmounts", () => {
  it("allocates amounts matching exact percentages", () => {
    const total = createMoney("100.00", "ARS");
    const targets = [
      { id: "g1", percentage: 50 },
      { id: "g2", percentage: 50 },
    ];
    const res = calculateAllocationAmounts(total, targets);
    expect(res).toEqual([
      { id: "g1", amount: { amount: "50.00", currency: "ARS" } },
      { id: "g2", amount: { amount: "50.00", currency: "ARS" } },
    ]);
  });

  it("handles residual cent distribution deterministically", () => {
    const total = createMoney("100.00", "ARS");
    const targets = [
      { id: "g1", percentage: "33.33" },
      { id: "g2", percentage: "33.33" },
      { id: "g3", percentage: "33.34" },
    ];
    const res = calculateAllocationAmounts(total, targets);
    const sumCents = res.reduce((acc, item) => acc + Math.round(Number(item.amount.amount) * 100), 0);
    expect(sumCents).toBe(10000); // 100.00 * 100
  });

  it("rejects invalid allocation totals (not 100%)", () => {
    const total = createMoney("100.00", "ARS");
    const targets = [
      { id: "g1", percentage: 50 },
      { id: "g2", percentage: 40 },
    ];
    expect(() => calculateAllocationAmounts(total, targets)).toThrow("Allocation percentages must sum to 100%");
  });

  it("handles empty allocations array", () => {
    const total = createMoney("100.00", "ARS");
    expect(calculateAllocationAmounts(total, [])).toEqual([]);
  });

  it("breaks ties deterministically using original index when remainders are equal", () => {
    // $0.06 split 4 ways equally at 25% each
    // 6 cents total: exact cents = 1.50 each -> base 1 cent each (sum = 4 cents). Leftover = 2 cents.
    // Remainders are equal (0.50 each).
    // Leftover 2 cents should go to index 0 (g1) and index 1 (g2).
    const total = createMoney("0.06", "ARS");
    const targets = [
      { id: "g1", percentage: 25 },
      { id: "g2", percentage: 25 },
      { id: "g3", percentage: 25 },
      { id: "g4", percentage: 25 },
    ];
    const res = calculateAllocationAmounts(total, targets);
    expect(res).toEqual([
      { id: "g1", amount: { amount: "0.02", currency: "ARS" } },
      { id: "g2", amount: { amount: "0.02", currency: "ARS" } },
      { id: "g3", amount: { amount: "0.01", currency: "ARS" } },
      { id: "g4", amount: { amount: "0.01", currency: "ARS" } },
    ]);
    const sumCents = res.reduce((acc, item) => acc + Math.round(Number(item.amount.amount) * 100), 0);
    expect(sumCents).toBe(6);
  });

  it("prioritizes larger remainder over original index", () => {
    // Total 100.00 with 33%, 33.6%, 33.4% -> remainder order is g2 (0.6), g3 (0.4), g1 (0.0)
    // Leftover 1 cent goes to g2 even though g1 has lower index.
    const total = createMoney("1.00", "USD");
    const targets = [
      { id: "g1", percentage: 33 },
      { id: "g2", percentage: "33.6" },
      { id: "g3", percentage: "33.4" },
    ];
    const res = calculateAllocationAmounts(total, targets);
    expect(res).toEqual([
      { id: "g1", amount: { amount: "0.33", currency: "USD" } },
      { id: "g2", amount: { amount: "0.34", currency: "USD" } },
      { id: "g3", amount: { amount: "0.33", currency: "USD" } },
    ]);
  });

  it("allocates zero total correctly", () => {
    const total = createMoney("0.00", "ARS");
    const targets = [
      { id: "g1", percentage: 50 },
      { id: "g2", percentage: 50 },
    ];
    const res = calculateAllocationAmounts(total, targets);
    expect(res).toEqual([
      { id: "g1", amount: { amount: "0.00", currency: "ARS" } },
      { id: "g2", amount: { amount: "0.00", currency: "ARS" } },
    ]);
  });

  it("throws on non-numeric percentage", () => {
    const total = createMoney("100.00", "ARS");
    const targets = [
      { id: "g1", percentage: "invalid" },
      { id: "g2", percentage: 50 },
    ];
    expect(() => calculateAllocationAmounts(total, targets)).toThrow("Allocation percentages must sum to 100%");
  });
});


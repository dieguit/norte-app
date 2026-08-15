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

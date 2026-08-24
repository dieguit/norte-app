import { describe, expect, it } from "vitest";
import { createMoney } from "./money";
import {
  formatMoney,
  formatCompactMoney,
  formatPercentage,
  formatDate,
  formatMonthDelta,
  formatCalendarMonth,
  formatMonthName,
} from "./format";

describe("es-AR Presentation Boundary", () => {
  it("formats ARS money according to es-AR rules", () => {
    const ars = createMoney("1250.50", "ARS");
    const formatted = formatMoney(ars);
    expect(formatted).toMatch(/\$\s?1\.250,50/);
  });

  it("formats USD money with explicit US$ context", () => {
    const usd = createMoney("1250.50", "USD");
    const formatted = formatMoney(usd);
    expect(formatted).toMatch(/US\$\s?1\.250,50/);
  });

  it("formats zero amounts correctly", () => {
    const zeroArs = createMoney("0", "ARS");
    expect(formatMoney(zeroArs)).toMatch(/\$\s?0,00/);

    const zeroUsd = createMoney("0", "USD");
    expect(formatMoney(zeroUsd)).toMatch(/US\$\s?0,00/);
  });

  describe("formatCompactMoney", () => {
    it("formats compact money for millions", () => {
      const m = createMoney("1500000.00", "ARS");
      const formatted = formatCompactMoney(m);
      expect(formatted).toMatch(/\$\s?1,5\s?M/i);
    });

    it("formats compact money for thousands", () => {
      const k = createMoney("25000.00", "ARS");
      const formatted = formatCompactMoney(k);
      expect(formatted).toMatch(/\$\s?25\s?k/i);
    });

    it("formats compact money for values under 1000 using full formatMoney", () => {
      const small = createMoney("450.50", "ARS");
      const formatted = formatCompactMoney(small);
      expect(formatted).toMatch(/\$\s?450,50/);
    });

    it("formats compact money for USD", () => {
      const usdMillions = createMoney("2500000.00", "USD");
      expect(formatCompactMoney(usdMillions)).toMatch(/US\$\s?2,5\s?M/i);

      const usdThousands = createMoney("10000.00", "USD");
      expect(formatCompactMoney(usdThousands)).toMatch(/US\$\s?10\s?k/i);
    });
  });

  describe("formatPercentage", () => {
    it("formats percentages from numbers and strings", () => {
      expect(formatPercentage(12.5)).toBe("12,5%");
      expect(formatPercentage("33.33")).toBe("33,3%");
    });

    it("respects custom decimals parameter", () => {
      expect(formatPercentage(12.3456, 2)).toBe("12,35%");
      expect(formatPercentage(10, 0)).toBe("10%");
    });

    it("handles invalid or NaN inputs safely", () => {
      expect(formatPercentage("invalid")).toBe("0%");
      expect(formatPercentage(NaN)).toBe("0%");
    });
  });

  describe("formatDate", () => {
    it("formats date strings and Date instances with default options", () => {
      const d = new Date(2026, 7, 15); // Aug 15 2026
      const formatted = formatDate(d);
      expect(formatted).toBeTruthy();
      expect(formatted.toLowerCase()).toContain("2026");

      const strFormatted = formatDate("2026-08-15T00:00:00Z");
      expect(strFormatted).toBeTruthy();
    });

    it("returns empty string for invalid dates", () => {
      expect(formatDate("not-a-date")).toBe("");
      expect(formatDate(new Date(NaN))).toBe("");
    });

    it("accepts custom Intl.DateTimeFormatOptions", () => {
      const d = new Date(2026, 7, 15);
      const formatted = formatDate(d, { day: "2-digit", month: "2-digit", year: "numeric" });
      expect(formatted).toMatch(/15\/08\/2026/);
    });
  });

  describe("formatMonthDelta", () => {
    it("formats month deltas correctly", () => {
      expect(formatMonthDelta(3)).toBe("+3 meses");
      expect(formatMonthDelta(1)).toBe("+1 mes");
      expect(formatMonthDelta(-1)).toBe("-1 mes");
      expect(formatMonthDelta(-4)).toBe("-4 meses");
      expect(formatMonthDelta(0)).toBe("mismo mes");
    });
  });

  describe("formatCalendarMonth", () => {
    it("formats a capitalized calendar month in Argentine Spanish", () => {
      expect(formatCalendarMonth("2026-09")).toBe("Septiembre de 2026");
    });
  });

  describe("formatMonthName", () => {
    it("formats a month name in Argentine Spanish lowercase", () => {
      expect(formatMonthName("2026-04")).toBe("abril");
      expect(formatMonthName("2026-08")).toBe("agosto");
      expect(formatMonthName("2026-09")).toBe("septiembre");
    });
  });
});

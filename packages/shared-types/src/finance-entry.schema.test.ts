import { describe, expect, it } from "vitest";
import { ExpenseDraftSchema } from "./expense.schema";
import { IncomeDraftSchema } from "./income.schema";

describe("ExpenseDraftSchema & IncomeDraftSchema amount validation", () => {
  const baseExpense = {
    concept: "Supermercado",
    source: { kind: "housing" as const },
    amount: "1.250,50",
    currency: "ARS" as const,
    recurring: true,
  };

  const baseIncome = {
    concept: "Sueldo",
    source: { kind: "salary" as const },
    amount: "1.250,50",
    currency: "ARS" as const,
    recurring: true,
    effectiveMonth: "2026-10",
  };

  it.each(["1.250,50", "0,001", "0,0001"])("accepts valid amount '%s'", (amount) => {
    expect(ExpenseDraftSchema.safeParse({ ...baseExpense, amount }).success).toBe(true);
    expect(IncomeDraftSchema.safeParse({ ...baseIncome, amount }).success).toBe(true);
  });

  it.each(["0", "", "abc", "-5", "1e309"])("rejects '%s' with 'Ingresá un monto mayor a cero.'", (amount) => {
    const expenseRes = ExpenseDraftSchema.safeParse({ ...baseExpense, amount });
    expect(expenseRes.success).toBe(false);
    if (!expenseRes.success) {
      expect(expenseRes.error.issues[0].message).toBe("Ingresá un monto mayor a cero.");
    }

    const incomeRes = IncomeDraftSchema.safeParse({ ...baseIncome, amount });
    expect(incomeRes.success).toBe(false);
    if (!incomeRes.success) {
      expect(incomeRes.error.issues[0].message).toBe("Ingresá un monto mayor a cero.");
    }
  });
});

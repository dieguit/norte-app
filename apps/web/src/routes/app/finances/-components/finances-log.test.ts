import { describe, expect, it } from "vitest";
import type { FinancesWorkspace } from "@repo/shared-types";
import { financesLog } from "./finances-log";

const workspace: FinancesWorkspace = {
  goalDedicationPercentage: "90",
  month: "2026-10",
  summary: {
    income: { amount: "0.00", currency: "ARS" },
    expenses: { amount: "0.00", currency: "ARS" },
    balance: { amount: "0.00", currency: "ARS" },
    contribution: { amount: "0.00", currency: "ARS" },
  },
  savings: {
    places: [],
    movements: [
      {
        kind: "contribution",
        id: "c1",
        placeId: "p1",
        placeName: "Mercado Pago",
        amount: "5000.00",
        currency: "ARS",
        createdAt: "2026-10-21T15:00:00Z",
      },
      {
        kind: "contribution",
        id: "c0",
        placeId: "p1",
        placeName: "Mercado Pago",
        amount: "5000.00",
        currency: "ARS",
        createdAt: "2026-09-30T15:00:00Z",
      },
      {
        kind: "transfer",
        id: "t1",
        fromPlaceId: "p1",
        fromPlaceName: "Mercado Pago",
        toPlaceId: "p2",
        toPlaceName: "Banco",
        amount: "1000.00",
        currency: "ARS",
        createdAt: "2026-10-20T15:00:00Z",
      },
      {
        kind: "completion",
        id: "k1",
        goalId: "g1",
        goalName: "Meta",
        placeId: "p1",
        placeName: "Mercado Pago",
        amount: "2000.00",
        currency: "ARS",
        createdAt: "2026-10-19T15:00:00Z",
      },
    ] as any,
  },
  incomes: {
    sources: [],
    incomes: [
      {
        id: "i1",
        sourceKind: "bonus",
        sourceId: null,
        sourceName: "Bono",
        concept: null,
        amount: "50000.00",
        currency: "ARS",
        recurring: false,
        effectiveMonth: "2026-10-01",
        createdAt: "2026-10-18T15:00:00Z",
        arsEquivalent: null,
      },
    ],
  },
  expenses: {
    sources: [],
    expenses: [
      {
        id: "e1",
        sourceKind: "supermarket",
        sourceId: null,
        sourceName: "Supermercado",
        concept: null,
        amount: "18000.00",
        currency: "ARS",
        recurring: false,
        effectiveMonth: "2026-10-01",
        endMonth: null,
        createdAt: "2026-10-23T15:00:00Z",
        arsEquivalent: null,
      },
      {
        id: "e2",
        sourceKind: "housing",
        sourceId: null,
        sourceName: "Alquiler",
        concept: null,
        amount: "120000.00",
        currency: "ARS",
        recurring: true,
        effectiveMonth: "2026-09-01",
        endMonth: null,
        createdAt: "2026-09-05T15:00:00Z",
        arsEquivalent: null,
      },
    ],
  },
};

describe("financesLog", () => {
  it("merges month movements by day, newest first, excluding transfers, completions and other months", () => {
    const days = financesLog(workspace, "all");
    expect(days.map((d) => [d.day, d.items.map((i) => i.id)])).toEqual([
      ["2026-10-23", ["e1"]],
      ["2026-10-21", ["c1"]],
      ["2026-10-18", ["i1"]],
      ["2026-10-05", ["e2"]],
    ]);
  });

  it("formats kinds", () => {
    const items = financesLog(workspace, "all").flatMap((d) => d.items);
    expect(items.find((i) => i.id === "c1")).toMatchObject({
      label: "Ahorro registrado",
      category: "Aporte · Mercado Pago · a tus objetivos",
    });
    expect(items.find((i) => i.id === "i1")).toMatchObject({ tone: "positive", sign: "always" });
    expect(items.find((i) => i.id === "e1")?.amount.amount).toBe("-18000.00");
    expect(items.find((i) => i.id === "e1")?.category).toMatch(/^Gasto · /);
  });

  it("filters by kind and returns [] when nothing matches", () => {
    expect(financesLog(workspace, "income").flatMap((d) => d.items.map((i) => i.id))).toEqual(["i1"]);
    expect(financesLog({ ...workspace, incomes: { ...workspace.incomes, incomes: [] } }, "income")).toEqual([]);
  });
});

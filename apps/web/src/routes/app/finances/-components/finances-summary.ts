import BigNumber from "bignumber.js";
import type { FinancesWorkspace } from "@repo/shared-types";
import { createMoney } from "../../../../lib/money";

type Entry = FinancesWorkspace["incomes"]["incomes"][number];

export function categoryTotals(entries: Entry[]) {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    const key = entry.sourceId ?? `${entry.sourceKind}:${entry.sourceName}`;
    totals.set(key, (totals.get(key) ?? 0) + Number(entry.arsEquivalent ?? entry.amount));
  }
  return [...totals.values()].sort((a, b) => b - a);
}

export function savingsTotals(places: FinancesWorkspace["savings"]["places"]) {
  return (["ARS", "USD"] as const).map((currency) =>
    createMoney(places.reduce((sum, place) => sum.plus(place.balances[currency]), new BigNumber(0)), currency),
  );
}

export const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

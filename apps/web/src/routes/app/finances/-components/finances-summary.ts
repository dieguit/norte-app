import BigNumber from "bignumber.js";
import type { FinancesWorkspace } from "@repo/shared-types";
import { createMoney } from "../../../../lib/money";
import { groupByCategory } from "./entry-groups";

export const categoryTotals = (
  entries: FinancesWorkspace["incomes"]["incomes"],
) => groupByCategory(entries).map((group) => Number(group.total.amount));

export function savingsTotals(places: FinancesWorkspace["savings"]["places"]) {
  return (["ARS", "USD"] as const).map((currency) =>
    createMoney(
      places.reduce(
        (sum, place) => sum.plus(place.balances[currency]),
        new BigNumber(0),
      ),
      currency,
    ),
  );
}

export const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

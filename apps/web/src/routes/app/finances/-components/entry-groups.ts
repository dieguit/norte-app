import BigNumber from "bignumber.js";
import { createMoney } from "../../../../lib/money";
import { movementDay } from "../../../../lib/movement-day";

export type GroupableEntry = {
  id: string;
  sourceKind: string;
  sourceId: string | null;
  sourceName: string;
  concept: string | null;
  amount: string;
  currency: "ARS" | "USD";
  recurring: boolean;
  effectiveMonth: string;
  createdAt: string;
  arsEquivalent?: string | null;
};

type Labels = Readonly<Record<string, string>>;

export const categoryName = (entry: GroupableEntry, labels: Labels) =>
  entry.sourceKind === "custom"
    ? entry.sourceName
    : (labels[entry.sourceKind] ?? entry.sourceName);

export const entryLabel = (entry: GroupableEntry, labels: Labels) =>
  entry.concept ?? categoryName(entry, labels);

export const categoryKey = (entry: GroupableEntry) =>
  entry.sourceId ?? `${entry.sourceKind}:${entry.sourceName}`;

export const sumArs = (entries: GroupableEntry[]) =>
  entries.reduce(
    (sum, entry) => sum.plus(entry.arsEquivalent ?? entry.amount),
    new BigNumber(0),
  );

function groupBy<T>(items: T[], keyOf: (item: T) => string) {
  const groups = new Map<string, T[]>();
  for (const item of items)
    groups.set(keyOf(item), [...(groups.get(keyOf(item)) ?? []), item]);
  return [...groups];
}

export function groupByCategory<T extends GroupableEntry>(
  entries: T[],
  labels: Labels = {},
  month?: string,
) {
  const grand = sumArs(entries);
  return groupBy(entries, categoryKey)
    .map(([key, items]) => {
      const total = sumArs(items);
      return {
        key,
        label: categoryName(items[0], labels),
        total: createMoney(total, "ARS"),
        share: grand.isZero() ? 0 : total.div(grand).toNumber(),
        entries: month
          ? [...items].sort((a, b) =>
              movementDay(b, month).localeCompare(movementDay(a, month)),
            )
          : [...items].sort((a, b) =>
              b.effectiveMonth.localeCompare(a.effectiveMonth),
            ),
      };
    })
    .sort((a, b) => b.share - a.share || a.label.localeCompare(b.label, "es"))
    .map((group, rank) => ({ ...group, rank }));
}

export function groupByDay<T>(items: T[], dayOf: (item: T) => string) {
  return groupBy(items, dayOf)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([day, entries]) => ({ day, entries }));
}

export function formatShare(share: number) {
  const percent = Math.round(share * 100);
  return percent === 0 && share > 0 ? "<1%" : `${percent}%`;
}

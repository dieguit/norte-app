import BigNumber from "bignumber.js";
import { createMoney } from "../../../../lib/money";

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
  arsEquivalent?: string | null;
};

type Labels = Readonly<Record<string, string>>;

const categoryName = (entry: GroupableEntry, labels: Labels) =>
  entry.sourceKind === "custom" ? entry.sourceName : (labels[entry.sourceKind] ?? entry.sourceName);

export const entryLabel = (entry: GroupableEntry, labels: Labels) => entry.concept ?? categoryName(entry, labels);

export const categoryKey = (entry: GroupableEntry) => entry.sourceId ?? `${entry.sourceKind}:${entry.sourceName}`;

const sumArs = (entries: GroupableEntry[]) =>
  entries.reduce((sum, entry) => sum.plus(entry.arsEquivalent ?? entry.amount), new BigNumber(0));

function groupBy<T>(items: T[], keyOf: (item: T) => string) {
  const groups = new Map<string, T[]>();
  for (const item of items) groups.set(keyOf(item), [...(groups.get(keyOf(item)) ?? []), item]);
  return [...groups];
}

export function groupByCategory<T extends GroupableEntry>(entries: T[], labels: Labels = {}) {
  const grand = sumArs(entries);
  return groupBy(entries, categoryKey)
    .map(([key, items]) => {
      const total = sumArs(items);
      return {
        key,
        label: categoryName(items[0], labels),
        total: createMoney(total, "ARS"),
        share: grand.isZero() ? 0 : total.div(grand).toNumber(),
        entries: [...items].sort((a, b) => b.effectiveMonth.localeCompare(a.effectiveMonth)),
      };
    })
    .sort((a, b) => b.share - a.share || a.label.localeCompare(b.label, "es"))
    .map((group, rank) => ({ ...group, rank }));
}

export function groupByMonth<T extends GroupableEntry>(entries: T[]) {
  return groupBy(entries, (entry) => entry.effectiveMonth.slice(0, 7))
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, items]) => ({ month, total: createMoney(sumArs(items), "ARS"), entries: items }));
}

export function formatShare(share: number) {
  const percent = Math.round(share * 100);
  return percent === 0 && share > 0 ? "<1%" : `${percent}%`;
}

import BigNumber from "bignumber.js";
import { CategoryDonut, chartColor, type ChartFamily } from "../../../../components/norte/CategoryDonut";
import { CategoryGroup, DateHeader, EntryRow, LogRow } from "../../../../components/norte/EntryList";
import { GroupBy, type GroupByValue } from "../../../../components/norte/GroupBy";
import { formatCalendarMonth } from "../../../../lib/format";
import { createMoney } from "../../../../lib/money";
import { categoryKey, entryLabel, formatShare, groupByCategory, groupByMonth, type GroupableEntry } from "./entry-groups";
import { plural } from "./finances-summary";

const monthTitle = (month: string) => formatCalendarMonth(month).replace(" de ", " ");

export function EntryBreakdown<T extends GroupableEntry>({
  month,
  entries,
  family,
  labels,
  groupNoun,
  entryNoun,
  empty,
  editPrefix,
  groupBy,
  onGroupByChange,
  onEdit,
}: {
  month: string;
  entries: T[];
  family: ChartFamily;
  labels: Readonly<Record<string, string>>;
  groupNoun: [string, string];
  entryNoun: [string, string];
  empty: string;
  editPrefix: string;
  groupBy: GroupByValue;
  onGroupByChange: (value: GroupByValue) => void;
  onEdit: (id: string) => void;
}) {
  const groups = groupByCategory(entries, labels);
  const byKey = new Map(groups.map((group) => [group.key, group]));
  const total = createMoney(groups.reduce((sum, group) => sum.plus(group.total.amount), new BigNumber(0)), "ARS");
  const entryCount = plural(entries.length, entryNoun[0], entryNoun[1]);
  const row = (entry: T) => {
    const label = entryLabel(entry, labels);
    return {
      key: entry.id,
      label,
      recurring: entry.recurring,
      amount: { amount: entry.amount, currency: entry.currency },
      actionLabel: `${editPrefix} ${label}`,
      onClick: () => onEdit(entry.id),
    };
  };

  return (
    <div className="flex flex-col">
      <div className="pb-5">
        <CategoryDonut values={groups.map((group) => Number(group.total.amount))} family={family} total={total} meta={entryCount} />
      </div>
      {entries.length === 0 ? (
        <p className="m-0 py-8 text-center text-body-sm text-muted-foreground">{empty}</p>
      ) : (
        <section aria-label="Movimientos" className="flex flex-col">
          <div className="flex items-center justify-between gap-3 py-2">
            <p className="m-0 text-body-sm font-medium text-muted-foreground">
              {groupBy === "category" ? plural(groups.length, groupNoun[0], groupNoun[1]) : entryCount}
            </p>
            <GroupBy value={groupBy} onValueChange={onGroupByChange} />
          </div>
          {groupBy === "category" ? (
            <div className="flex flex-col">
              {groups.map((group) => (
                <CategoryGroup key={group.key} label={group.label} share={formatShare(group.share)} total={group.total} color={chartColor(family, group.rank)}>
                  {group.entries.map((entry) => {
                    const { key, ...props } = row(entry);
                    return <EntryRow key={key} {...props} />;
                  })}
                </CategoryGroup>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {groupByMonth(entries).map((group) => (
                <div key={group.month}>
                  <DateHeader label={group.month === month ? monthTitle(group.month) : `Desde ${monthTitle(group.month)}`} total={group.total} />
                  <ul className="m-0 list-none p-0">
                    {group.entries.map((entry) => {
                      const category = byKey.get(categoryKey(entry))!;
                      const { key, ...props } = row(entry);
                      return <LogRow key={key} {...props} category={category.label} color={chartColor(family, category.rank)} />;
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

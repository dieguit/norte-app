import BigNumber from "bignumber.js";
import {
  CategoryDonut,
  chartColor,
  type ChartFamily,
} from "../../../../components/norte/CategoryDonut";
import {
  CategoryGroup,
  EntryRow,
} from "../../../../components/norte/EntryList";
import {
  GroupBy,
  type GroupByValue,
} from "../../../../components/norte/GroupBy";
import { MovementLog } from "../../../../components/norte/MovementLog";
import { SplitLayout } from "../../../../components/norte/PageLayout";
import { createMoney } from "../../../../lib/money";
import {
  formatShortDay,
  localDay,
  movementDay,
} from "../../../../lib/movement-day";
import { shortMoney } from "../../-components/home-view";
import {
  categoryKey,
  entryLabel,
  formatShare,
  groupByCategory,
  groupByDay,
  sumArs,
  type GroupableEntry,
} from "./entry-groups";
import { plural } from "./finances-summary";

function BreakdownStats({
  groups,
  entries,
}: {
  groups: ReturnType<typeof groupByCategory>;
  entries: GroupableEntry[];
}) {
  const grand = sumArs(entries);
  const part = (value: BigNumber) =>
    `${shortMoney(createMoney(value, "ARS"))} · ${formatShare(grand.isZero() ? 0 : value.div(grand).toNumber())}`;
  const rows = [
    ["Mayor categoría", `${groups[0].label} · ${formatShare(groups[0].share)}`],
    ["Recurrentes", part(sumArs(entries.filter((entry) => entry.recurring)))],
    ["Únicos", part(sumArs(entries.filter((entry) => !entry.recurring)))],
  ];
  return (
    <dl className="m-0 hidden flex-col xl:flex">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex items-center justify-between gap-3 border-t border-border py-3"
        >
          <dt className="text-body-sm text-muted-foreground">{label}</dt>
          <dd className="m-0 text-body-sm font-semibold text-foreground">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

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
  const groups = groupByCategory(entries, labels, month);
  const byKey = new Map(groups.map((group) => [group.key, group]));
  const total = createMoney(
    groups.reduce(
      (sum, group) => sum.plus(group.total.amount),
      new BigNumber(0),
    ),
    "ARS",
  );
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
    <SplitLayout
      aside={
        <>
          <div className="pb-5">
            <CategoryDonut
              values={groups.map((group) => Number(group.total.amount))}
              family={family}
              total={total}
              meta={entryCount}
            />
          </div>
          {entries.length > 0 && (
            <BreakdownStats groups={groups} entries={entries} />
          )}
        </>
      }
    >
      {entries.length === 0 ? (
        <p className="m-0 py-8 text-center text-body-sm text-muted-foreground">
          {empty}
        </p>
      ) : (
        <section aria-label="Movimientos" className="flex flex-col">
          <div className="flex items-center justify-between gap-3 py-2">
            <p className="m-0 text-body-sm font-medium text-muted-foreground">
              {groupBy === "category"
                ? plural(groups.length, groupNoun[0], groupNoun[1])
                : entryCount}
            </p>
            <GroupBy value={groupBy} onValueChange={onGroupByChange} />
          </div>
          {groupBy === "category" ? (
            <div className="flex flex-col">
              {groups.map((group) => (
                <CategoryGroup
                  key={group.key}
                  label={group.label}
                  share={formatShare(group.share)}
                  total={group.total}
                  color={chartColor(family, group.rank)}
                >
                  {group.entries.map((entry) => {
                    const { key, ...props } = row(entry);
                    return (
                      <EntryRow
                        key={key}
                        day={formatShortDay(movementDay(entry, month))}
                        {...props}
                      />
                    );
                  })}
                </CategoryGroup>
              ))}
            </div>
          ) : (
            <MovementLog
              today={localDay(new Date().toISOString())}
              empty={empty}
              days={groupByDay(entries, (entry) =>
                movementDay(entry, month),
              ).map(({ day, entries: dayEntries }) => ({
                day,
                total: createMoney(sumArs(dayEntries), "ARS"),
                items: dayEntries.map((entry) => {
                  const category = byKey.get(categoryKey(entry))!;
                  const { key, ...props } = row(entry);
                  return {
                    id: key,
                    kind: family === "income" ? "income" : "expense",
                    ...props,
                    category: category.label,
                    color: chartColor(family, category.rank),
                  };
                }),
              }))}
            />
          )}
        </section>
      )}
    </SplitLayout>
  );
}

import type { LucideIcon } from "lucide-react";
import type { Money as MoneyValue } from "@/lib/money";
import { formatDayHeading } from "@/lib/movement-day";
import { DateHeader, LogRow } from "./EntryList";
import type { MoneySign } from "./Money";

export type LogKind = "income" | "expense" | "contribution";
export type LogItem = {
  id: string;
  kind: LogKind;
  label: string;
  category: string;
  amount: MoneyValue;
  recurring: boolean;
  color?: string;
  icon?: LucideIcon;
  tone?: "default" | "positive";
  sign?: MoneySign;
  actionLabel?: string;
  onClick?: () => void;
};
export type LogDay = { day: string; total?: MoneyValue; items: LogItem[] };

export function MovementLog({ days, today, empty }: { days: LogDay[]; today: string; empty: string }) {
  if (days.length === 0) return <p className="m-0 py-8 text-center text-body-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="flex flex-col gap-2">
      {days.map(({ day, total, items }) => (
        <div key={day}>
          <DateHeader label={formatDayHeading(day)} total={total} badge={day === today ? "Hoy" : undefined} />
          <ul className="m-0 list-none p-0">
            {items.map(({ id, kind: _kind, ...item }) => <LogRow key={id} {...item} />)}
          </ul>
        </div>
      ))}
    </div>
  );
}

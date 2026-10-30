import type { ReactNode } from "react";
import { ChevronDown, Repeat, type LucideIcon } from "lucide-react";
import type { Money as MoneyValue } from "@/lib/money";
import { Money, type MoneySign } from "./Money";

const ROW =
  "flex min-h-11 w-full items-center gap-3 rounded-sm text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring motion-reduce:transition-none";

function Recurring({ recurring }: { recurring: boolean }) {
  return recurring ? <Repeat className="size-3 shrink-0 text-subtle-foreground" aria-hidden="true" /> : null;
}

export function CategoryGroup({
  label,
  share,
  total,
  color,
  children,
}: {
  label: string;
  share: string;
  total: MoneyValue;
  color: string;
  children: ReactNode;
}) {
  return (
    <details open role="group" aria-label={label} className="group border-t border-border">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2.5 py-3.5 [&::-webkit-details-marker]:hidden">
        <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: color }} />
        <span className="truncate text-[15px] font-semibold text-foreground">{label}</span>
        <span className="shrink-0 text-body-sm text-subtle-foreground">{share}</span>
        <Money value={total} className="ml-auto" />
        <ChevronDown className="size-4 shrink-0 text-subtle-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
      </summary>
      <ul className="m-0 flex list-none flex-col gap-0.5 p-0 pb-2.5 pl-5">{children}</ul>
    </details>
  );
}

export function EntryRow({
  day,
  label,
  recurring,
  amount,
  actionLabel,
  onClick,
}: {
  day?: string;
  label: string;
  recurring: boolean;
  amount: MoneyValue;
  actionLabel: string;
  onClick: () => void;
}) {
  return (
    <li>
      <button type="button" aria-label={actionLabel} onClick={onClick} className={`${ROW} py-2`}>
        {day && <span className="w-12 shrink-0 text-caption text-subtle-foreground tabular-nums">{day}</span>}
        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className="truncate text-[14px] text-foreground">{label}</span>
          <Recurring recurring={recurring} />
        </span>
        <Money value={amount} size="sm" tone="muted" />
      </button>
    </li>
  );
}

export function DateHeader({ label, total, badge }: { label: string; total?: MoneyValue; badge?: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-border pt-3 pb-1.5">
      <h2 className="m-0 text-body-sm font-semibold text-foreground">{label}</h2>
      {badge && <span className="rounded-full bg-accent-brand/10 px-2 py-0.5 text-[11px] font-semibold text-accent-brand">{badge}</span>}
      {total && <Money value={total} size="sm" tone="muted" className="ml-auto" />}
    </div>
  );
}

export function LogRow({
  label, category, color, icon: Icon, recurring, amount, tone = "default", sign = "auto", actionLabel, onClick,
}: {
  label: string; category: string; color?: string; icon?: LucideIcon; recurring: boolean; amount: MoneyValue;
  tone?: "default" | "positive"; sign?: MoneySign; actionLabel?: string; onClick?: () => void;
}) {
  const body = (
    <>
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted"
        style={color ? { background: `color-mix(in srgb, ${color} 15%, transparent)` } : undefined}
      >
        {Icon ? <Icon className="size-4 text-foreground" style={color ? { color } : undefined} aria-hidden="true" /> : <span className="size-2.5 rounded-full" style={{ background: color }} />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[15px] font-medium text-foreground">{label}</span>
          <Recurring recurring={recurring} />
        </span>
        <span className="truncate text-caption text-muted-foreground">{category}</span>
      </span>
      <Money value={amount} tone={tone} sign={sign} />
    </>
  );
  return (
    <li>
      {onClick ? (
        <button type="button" aria-label={actionLabel} onClick={onClick} className={`${ROW} py-2.5`}>{body}</button>
      ) : (
        <div className="flex min-h-11 w-full items-center gap-3 py-2.5">{body}</div>
      )}
    </li>
  );
}

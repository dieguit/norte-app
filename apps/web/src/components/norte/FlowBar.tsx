import type { ReactNode } from "react";
import BigNumber from "bignumber.js";
import { formatPercentage } from "@/lib/format";
import { createMoney, type Money as MoneyValue } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Money } from "./Money";

type FlowSummary = { income: MoneyValue; expenses: MoneyValue; balance: MoneyValue; contribution: MoneyValue };
type SegmentKey = "expenses" | "goals" | "free" | "over";

const SWATCH: Record<SegmentKey, string> = {
  expenses: "bg-foreground",
  goals: "bg-accent-brand",
  free: "bg-accent-brand-soft",
  over: "bg-negative",
};

export function getFlowSegments({ income, expenses, balance, contribution }: FlowSummary) {
  const [i, e, b, c] = [income, expenses, balance, contribution].map((money) => Number(money.amount));
  const parts: Array<[SegmentKey, number, number]> =
    b < 0
      ? [["expenses", i, e], ["over", -b, e]]
      : [["expenses", e, i], ["goals", c, i], ["free", b - c, i]];
  return parts
    .filter(([, value, base]) => value > 0 && base > 0)
    .map(([key, value, base]) => ({ key, share: value / base }));
}

export function FlowBar({ summary, goalsPercentage }: { summary: FlowSummary; goalsPercentage: string }) {
  const overspent = Number(summary.balance.amount) < 0;
  const segments = getFlowSegments(summary);
  const legend: Array<[SegmentKey, string, ReactNode]> = overspent
    ? [
        ["expenses", "Gastos", <Money value={summary.expenses} />],
        ["goals", "Objetivos", <Money value={summary.contribution} />],
        ["over", "Excedido", <Money value={summary.balance} sign="never" tone="negative" />],
      ]
    : [
        ["expenses", "Gastos", <Money value={summary.expenses} />],
        ["goals", `Objetivos ${formatPercentage(goalsPercentage)}`, <Money value={summary.contribution} />],
        ["free", "Queda", <Money value={createMoney(new BigNumber(summary.balance.amount).minus(summary.contribution.amount), "ARS")} />],
      ];

  return (
    <div className="flex flex-col gap-3.5">
      <div aria-hidden="true" className={cn("flex h-2.5 gap-[3px] rounded-[3px]", segments.length === 0 && "bg-muted")}>
        {segments.map(({ key, share }) => (
          <span key={key} className={cn("rounded-[3px]", SWATCH[key])} style={{ flex: `${share} 1 0` }} />
        ))}
      </div>
      <dl className="m-0 flex justify-between gap-3">
        {legend.map(([key, label, value]) => (
          <div key={key} className="flex flex-col gap-1">
            <dt className="flex items-center gap-1.5 text-caption text-muted-foreground">
              <span className={cn("size-2 rounded-xs", SWATCH[key])} />
              {label}
            </dt>
            <dd className="m-0">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

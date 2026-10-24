import type { ReactNode } from "react";
import { Link, type LinkProps } from "@tanstack/react-router";
import { ChevronRight, type LucideIcon } from "lucide-react";

const RING = {
  income: [
    "stroke-chart-income-1", "stroke-chart-income-2", "stroke-chart-income-3",
    "stroke-chart-income-4", "stroke-chart-income-5", "stroke-chart-income-6",
    "stroke-chart-income-7", "stroke-chart-income-8", "stroke-chart-income-9",
  ],
  expense: [
    "stroke-chart-expense-1", "stroke-chart-expense-2", "stroke-chart-expense-3",
    "stroke-chart-expense-4", "stroke-chart-expense-5", "stroke-chart-expense-6",
    "stroke-chart-expense-7", "stroke-chart-expense-8", "stroke-chart-expense-9",
  ],
} as const;

const RADIUS = 15.12;
const STROKE = 5.76;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function MiniRing({ values, family }: { values: number[]; family: keyof typeof RING }) {
  const total = values.reduce((sum, value) => sum + value, 0);
  const starts = values.map((_, index) => values.slice(0, index).reduce((sum, value) => sum + value, 0));
  return (
    <svg viewBox="0 0 36 36" className="size-9 shrink-0 -rotate-90" aria-hidden="true">
      <circle cx="18" cy="18" r={RADIUS} fill="none" strokeWidth={STROKE} className="stroke-muted" />
      {total > 0 &&
        values.map((value, index) => (
          <circle
            key={index}
            cx="18"
            cy="18"
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            className={RING[family][Math.min(index, 8)]}
            strokeDasharray={`${(value / total) * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={(-starts[index] / total) * CIRCUMFERENCE}
          />
        ))}
    </svg>
  );
}

export function SectionIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-accent-brand">
      <Icon className="size-[18px]" aria-hidden="true" />
    </span>
  );
}

export function SectionRow({
  to,
  label,
  meta,
  leading,
  value,
}: {
  to: LinkProps["to"];
  label: string;
  meta: string;
  leading: ReactNode;
  value?: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3.5 border-t border-border py-4 text-foreground no-underline transition-colors hover:bg-muted/40 hover:text-foreground motion-reduce:transition-none"
    >
      {leading}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-heading">{label}</span>
        <span className="truncate text-caption text-muted-foreground">{meta}</span>
      </span>
      {value}
      <ChevronRight className="size-[18px] shrink-0 text-subtle-foreground" aria-hidden="true" />
    </Link>
  );
}

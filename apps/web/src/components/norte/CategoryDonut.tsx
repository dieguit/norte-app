import type { Money as MoneyValue } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Money } from "./Money";

export type ChartFamily = "expense" | "income" | "savings";

export const chartColor = (family: ChartFamily, rank: number) => `var(--chart-${family}-${Math.min(rank, 8) + 1})`;

export function ChartRing({
  values,
  family,
  size,
  thickness,
  gap = 0,
  className,
}: {
  values: number[];
  family: ChartFamily;
  size: number;
  thickness: number;
  gap?: number;
  className?: string;
}) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = values.reduce((sum, value) => sum + value, 0);
  const circle = { cx: size / 2, cy: size / 2, r: radius, fill: "none", strokeWidth: thickness };
  const slices = values.filter((value) => value > 0).length;
  let start = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={cn("shrink-0 -rotate-90", className)} aria-hidden="true">
      {total > 0 ? (
        values.map((value, index) => {
          const length = (value / total) * circumference;
          const offset = start;
          start += length;
          return (
            <circle
              key={index}
              {...circle}
              style={{ stroke: chartColor(family, index) }}
              strokeDasharray={`${slices > 1 ? Math.max(length - gap, 0) : length} ${circumference}`}
              strokeDashoffset={-offset}
            />
          );
        })
      ) : (
        <circle {...circle} className="stroke-muted" />
      )}
    </svg>
  );
}

export function CategoryDonut({
  values,
  family,
  total,
  meta,
}: {
  values: number[];
  family: ChartFamily;
  total: MoneyValue;
  meta: string;
}) {
  return (
    <figure aria-label="Total del mes" className="relative m-0 mx-auto size-55">
      <ChartRing values={values} family={family} size={220} thickness={28.6} gap={2} className="size-full" />
      <figcaption className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span className="text-caption text-muted-foreground">Total del mes</span>
        <Money value={total} size="title" decimals={false} />
        <span className="text-caption text-subtle-foreground">{meta}</span>
      </figcaption>
    </figure>
  );
}

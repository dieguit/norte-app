import { formatMoney } from "@/lib/format";
import type { Money as MoneyValue } from "@/lib/money";
import { cn } from "@/lib/utils";

export type MoneySign = "auto" | "always" | "never";

export function formatMoneyParts(money: MoneyValue, sign: MoneySign = "auto") {
  const value = Number(money.amount);
  if (value === 0) return null;
  const [integer, decimals] = formatMoney({ ...money, amount: money.amount.replace(/^-/, "") }).split(",");
  const prefix = sign === "never" ? "" : value < 0 ? "−" : sign === "always" ? "+" : "";
  return { integer: `${prefix}${integer}`, decimals: `,${decimals}` };
}

const SIZES = {
  hero: ["text-[42px] tracking-[-1.2px]", "pb-1 text-[20px]"],
  title: ["text-[26px] tracking-[-0.6px]", "pb-0.5 text-[15px]"],
  large: ["text-[18px]", "pb-px text-[13px]"],
  default: ["text-[15px]", "pb-px text-[12px]"],
  sm: ["text-[14px]", "pb-px text-[11px]"],
} as const;

const TONES = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  positive: "text-positive",
  negative: "text-negative",
} as const;

export function Money({
  value,
  size = "default",
  tone = "default",
  sign = "auto",
  decimals = true,
  className,
}: {
  value: MoneyValue;
  size?: keyof typeof SIZES;
  tone?: keyof typeof TONES;
  sign?: MoneySign;
  decimals?: boolean;
  className?: string;
}) {
  const parts = formatMoneyParts(value, sign);
  const [integerSize, decimalsSize] = SIZES[size];
  return (
    <span className={cn("inline-flex items-end gap-0.5 whitespace-nowrap leading-none tabular-nums", className)}>
      {parts ? (
        <>
          <span className={cn("font-semibold", integerSize, TONES[tone])}>{parts.integer}</span>
          {decimals && <span className={cn("font-medium text-subtle-foreground", decimalsSize)}>{parts.decimals}</span>}
        </>
      ) : (
        <span className={cn("font-semibold text-subtle-foreground", integerSize)}>—</span>
      )}
    </span>
  );
}

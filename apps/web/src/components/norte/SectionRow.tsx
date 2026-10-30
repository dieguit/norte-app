import type { ReactNode } from "react";
import { Link, type LinkProps } from "@tanstack/react-router";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { ChartRing, type ChartFamily } from "./CategoryDonut";

export function MiniRing({ values, family }: { values: number[]; family: ChartFamily }) {
  return <ChartRing values={values} family={family} size={36} thickness={5.76} className="size-9" />;
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

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Page({ children, wide = true, className }: { children: ReactNode; wide?: boolean; className?: string }) {
  return (
    <div
      data-wide={wide || undefined}
      className={cn("flex flex-col gap-3 px-5 pt-0 xl:gap-9 xl:px-12 xl:pt-10 xl:pb-12 min-[120rem]:px-24 min-[120rem]:pt-12", className)}
    >
      {children}
    </div>
  );
}

export function SplitLayout({ aside, children }: { aside: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:gap-12 min-[120rem]:gap-16">
      <div className="flex flex-col gap-5 xl:w-105 xl:shrink-0 xl:gap-7 min-[120rem]:w-140">{aside}</div>
      <div className="min-w-0 xl:flex-1 xl:self-stretch xl:border-l xl:border-border xl:pl-12 min-[120rem]:pl-16">{children}</div>
    </div>
  );
}

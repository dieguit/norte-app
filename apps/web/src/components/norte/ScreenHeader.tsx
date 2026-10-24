import type { ReactNode } from "react";
import { Link, type LinkProps } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function ScreenHeader({
  title,
  subtitle,
  backTo,
  trailing,
}: {
  title: string;
  subtitle?: string;
  backTo?: LinkProps["to"];
  trailing?: ReactNode;
}) {
  return (
    <header className="flex items-center gap-2 px-5 pt-4 pb-2">
      {backTo && (
        <Link
          to={backTo}
          aria-label="Volver"
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border text-foreground no-underline transition-colors hover:bg-muted hover:text-foreground motion-reduce:transition-none"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="m-0 truncate text-display text-foreground">{title}</h1>
        {subtitle && <p className="m-0 text-body-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {trailing}
    </header>
  );
}

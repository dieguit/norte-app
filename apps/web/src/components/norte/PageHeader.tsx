import type { ReactNode } from "react";
import { Link, type LinkProps } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type Crumb = { label: string; to?: LinkProps["to"] };

export function HeaderAction({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <Button type="button" onClick={onClick} disabled={disabled} className="hidden h-11 gap-1.5 rounded-md px-5 text-[15px] font-semibold xl:inline-flex">
      <Plus className="size-4" aria-hidden="true" />
      {label}
    </Button>
  );
}

export function PageHeader({
  title,
  eyebrow,
  subtitle,
  breadcrumb,
  backTo,
  trailing,
  action,
  showMobileAction = false,
  stickyMobile = false,
}: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  breadcrumb?: Crumb[];
  backTo?: LinkProps["to"];
  trailing?: ReactNode;
  action?: ReactNode;
  showMobileAction?: boolean;
  stickyMobile?: boolean;
}) {
  return (
    <header className={cn("flex min-h-15 items-center gap-2 py-2 xl:min-h-0 xl:items-end xl:gap-5 xl:py-0", stickyMobile && "sticky top-0 z-20 -mx-5 bg-background px-5 xl:static xl:z-auto xl:mx-0 xl:bg-transparent xl:px-0")}>
      {backTo && (
        <Link
          to={backTo}
          aria-label="Volver"
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border text-foreground no-underline transition-colors hover:bg-muted hover:text-foreground motion-reduce:transition-none xl:mb-0.5"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
      )}
      <div className="flex min-w-0 flex-1 items-center gap-1 xl:flex-none xl:items-end xl:gap-6">
        <div className="min-w-0 flex-1 xl:flex-none">
          {breadcrumb && (
            <nav aria-label="Ruta" className="hidden xl:mb-1.5 xl:block">
              <ol className="m-0 flex list-none items-center gap-1.5 p-0 text-xs font-semibold tracking-[1.6px] text-accent-brand uppercase">
                {breadcrumb.map((crumb, index) => (
                  <li key={crumb.label} className="flex items-center gap-1.5">
                    {index > 0 && <ChevronRight className="size-3" aria-hidden="true" />}
                    {crumb.to ? (
                      <Link to={crumb.to} className="text-accent-brand no-underline hover:underline">{crumb.label}</Link>
                    ) : (
                      <span aria-current="page">{crumb.label}</span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <h1 className="m-0 text-display text-[24px] text-foreground xl:text-[36px] xl:tracking-[-0.6px]">
            {eyebrow && (
              <span className="sr-only font-sans text-overline text-accent-brand xl:not-sr-only xl:mb-1.5 xl:block xl:text-xs xl:tracking-[1.6px]">
                {eyebrow} <span className="sr-only">· </span>
              </span>
            )}{" "}
            {title}
          </h1>
          {subtitle && <p className="m-0 text-body-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {trailing}
      </div>
      {action && <div className={cn("ml-auto shrink-0 xl:flex", showMobileAction ? "flex" : "hidden")}>{action}</div>}
    </header>
  );
}

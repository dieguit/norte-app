import { Fragment } from "react";
import { Link } from "@tanstack/react-router";
import { House, Target, Wallet } from "lucide-react";

const NAV_ITEMS = [
  { to: "/app", label: "Inicio", icon: House },
  { to: "/app/goals", label: "Objetivos", icon: Target },
  {
    to: "/app/finances",
    label: "Finanzas",
    icon: Wallet,
    children: [
      { to: "/app/finances/incomes", label: "Ingresos" },
      { to: "/app/finances/expenses", label: "Gastos" },
      { to: "/app/finances/savings", label: "Ahorros" },
      { to: "/app/finances/benefits", label: "Beneficios" },
    ],
  },
] as const;

function isActivePath(pathname: string, path: string) {
  return path === "/app"
    ? pathname === path
    : pathname === path || pathname.startsWith(`${path}/`);
}

export function AppNavigation({
  pathname,
  mobile = false,
}: {
  pathname: string;
  mobile?: boolean;
}) {
  const navClassName = mobile
    ? "flex h-[calc(4.75rem+env(safe-area-inset-bottom))] shrink-0 items-start justify-around border-t border-border bg-secondary px-6 pt-2.5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:hidden"
    : "flex flex-1 flex-col gap-1";

  return (
    <nav aria-label="Navegación principal" className={navClassName}>
      {NAV_ITEMS.map((item) => {
        const { to, label, icon: Icon } = item;
        const active = isActivePath(pathname, to);
        const className = mobile
          ? `flex min-h-11 w-18 flex-col items-center gap-1 text-[11px] no-underline transition-colors motion-reduce:transition-none ${active ? "font-semibold text-foreground" : "font-medium text-subtle-foreground hover:text-foreground"}`
          : `flex min-h-11 items-center gap-3 rounded-md px-3 text-sm no-underline transition-colors motion-reduce:transition-none ${active ? "bg-background font-semibold text-foreground shadow-[var(--shadow-card)]" : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground"}`;
        return (
          <Fragment key={to}>
            <Link
              to={to}
              aria-current={active ? "page" : undefined}
              className={className}
            >
              <Icon
                className={mobile ? "size-[22px]" : "size-[18px]"}
                aria-hidden="true"
              />
              <span>{label}</span>
            </Link>
            {!mobile && "children" in item && (
              <div className="ml-7 flex flex-col gap-0.5">
                {item.children.map((child) => {
                  const childActive = pathname === child.to;
                  return (
                    <Link
                      key={child.to}
                      to={child.to}
                      aria-current={childActive ? "page" : undefined}
                      className={`flex min-h-11 items-center rounded-md px-3 text-sm no-underline transition-colors motion-reduce:transition-none ${childActive ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {child.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}

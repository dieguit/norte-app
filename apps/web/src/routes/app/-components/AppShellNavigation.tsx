import { Link } from "@tanstack/react-router";
import { House, Target, WalletCards } from "lucide-react";

const NAV_ITEMS = [
  { to: "/app", label: "Inicio", icon: House },
  { to: "/app/goals", label: "Objetivos", icon: Target },
  { to: "/app/finances", label: "Finanzas", icon: WalletCards },
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
    ? "flex h-[calc(4rem+env(safe-area-inset-bottom))] shrink-0 items-center justify-around border-t border-[var(--line)] bg-[var(--header-bg)] px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    : "flex flex-1 flex-col gap-2";

  return (
    <nav aria-label="Navegación principal" className={navClassName}>
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
        const active = isActivePath(pathname, to);
        const className = mobile
          ? `flex flex-1 flex-col items-center justify-center gap-1 py-1 text-xs font-medium no-underline transition-colors motion-reduce:transition-none ${active ? "font-semibold text-[var(--sea-ink)]" : "text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"}`
          : `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium no-underline transition-colors motion-reduce:transition-none ${active ? "bg-[var(--chip-bg)] font-semibold text-[var(--sea-ink)] shadow-sm" : "text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]"}`;
        return (
          <Link key={to} to={to} aria-current={active ? "page" : undefined} className={className}>
            <Icon className={mobile ? "size-5" : "size-4"} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

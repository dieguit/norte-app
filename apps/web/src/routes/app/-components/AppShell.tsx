import type { ReactNode } from "react";
import { UserButton } from "@clerk/tanstack-react-start";
import { useRouterState } from "@tanstack/react-router";
import { AppNavigation } from "./AppShellNavigation";

function AppBrand() {
  return (
    <a href="/app" aria-label="Norte" className="flex items-center gap-3 no-underline">
      <img
        src="/images/logo.png"
        alt=""
        className="size-9 rounded-xl object-contain shadow-[var(--shadow-card)]"
        width="36"
        height="36"
      />
      <span className="text-base font-semibold tracking-[0.22em] text-[var(--sea-ink)]">
        NORTE
      </span>
    </a>
  );
}

function MobileHeader() {
  return (
    <header className="flex h-[calc(3.5rem+env(safe-area-inset-top))] shrink-0 items-center justify-between border-b border-[var(--line)] bg-[var(--header-bg)] px-5 pt-[env(safe-area-inset-top)] backdrop-blur-md md:hidden">
      <a href="/app" aria-label="Norte" className="flex min-h-11 min-w-11 items-center gap-3 no-underline">
        <img
          src="/images/logo.png"
          alt=""
          className="size-8 rounded-xl object-contain shadow-[var(--shadow-card)]"
          width="32"
          height="32"
        />
        <span className="text-sm font-semibold tracking-[0.22em] text-[var(--sea-ink)]">
          NORTE
        </span>
      </a>
      <UserButton appearance={{ elements: { userButtonTrigger: "!size-11 !min-h-11 !min-w-11" } }} />
    </header>
  );
}

function DesktopSidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="hidden w-[250px] shrink-0 flex-col border-r border-[var(--line)] bg-[var(--header-bg)] p-6 md:flex">
      <div className="flex items-center gap-3 pb-8">
        <AppBrand />
      </div>
      <AppNavigation pathname={pathname} />
      <div className="mt-auto border-t border-[var(--line)] pt-4">
        <div className="flex items-center justify-between">
          <UserButton />
        </div>
      </div>
    </aside>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterPathname();

  return (
    <div className="flex h-dvh flex-col overflow-hidden text-[var(--sea-ink)] md:flex-row">
      <MobileHeader />
      <DesktopSidebar pathname={pathname} />
      <main
        id="app-scroll-area"
        data-scroll-restoration-id="app-scroll-area"
        className="flex min-h-0 flex-1 flex-col overflow-y-auto"
      >
        {children}
      </main>
      <AppNavigation pathname={pathname} mobile />
    </div>
  );
}

function useRouterPathname() {
  return useRouterState({ select: (state) => state.location.pathname });
}

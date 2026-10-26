import type { ReactNode } from "react";
import { UserButton, useUser } from "@clerk/tanstack-react-start";
import { useRouterState } from "@tanstack/react-router";
import { MapGrid } from "../../../components/norte/MapGrid";
import { AppNavigation } from "./AppShellNavigation";

function AppBrand() {
  return (
    <a
      href="/app"
      aria-label="Norte"
      className="flex min-h-11 items-center gap-2.5 text-foreground no-underline hover:text-foreground"
    >
      <img
        src="/images/logo.png"
        alt=""
        className="size-8 rounded-xl object-contain shadow-[var(--shadow-card)]"
        width="32"
        height="32"
      />
      <span className="text-sm font-semibold tracking-[4px]">NORTE</span>
    </a>
  );
}

function MobileHeader() {
  return (
    <header className="flex h-[calc(3.5rem+env(safe-area-inset-top))] shrink-0 items-center justify-between bg-secondary/90 px-5 pt-[env(safe-area-inset-top)] backdrop-blur-md md:hidden">
      <AppBrand />
      <UserButton
        appearance={{
          elements: {
            userButtonTrigger: "!size-11 !min-h-11 !min-w-11",
            userButtonAvatarBox: "!size-8",
          },
        }}
      />
    </header>
  );
}

function SidebarUser() {
  const { user } = useUser();
  return (
    <div className="mt-auto flex items-center gap-3 pt-4">
      <UserButton appearance={{ elements: { userButtonAvatarBox: "!size-8" } }} />
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold text-foreground">
          {user?.firstName ?? user?.username ?? "Cuenta"}
        </span>
        <span className="text-caption text-muted-foreground">Configuración</span>
      </div>
    </div>
  );
}

function DesktopSidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-secondary p-6 md:flex">
      <div className="pb-8">
        <AppBrand />
      </div>
      <AppNavigation pathname={pathname} />
      <SidebarUser />
    </aside>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterPathname();

  return (
    <div className="flex h-dvh flex-col overflow-hidden text-foreground md:flex-row">
      <MobileHeader />
      <DesktopSidebar pathname={pathname} />
      <main
        id="app-scroll-area"
        data-scroll-restoration-id="app-scroll-area"
        className="relative isolate flex min-h-0 flex-1 flex-col overflow-y-auto"
      >
        <MapGrid />
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col xl:has-[[data-wide]]:max-w-none">{children}</div>
      </main>
      <AppNavigation pathname={pathname} mobile />
    </div>
  );
}

function useRouterPathname() {
  return useRouterState({ select: (state) => state.location.pathname });
}

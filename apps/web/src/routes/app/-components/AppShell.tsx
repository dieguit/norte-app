import type { ReactNode } from 'react'
import { UserButton } from '@clerk/tanstack-react-start'
import { Link, useRouterState } from '@tanstack/react-router'
import { House, Target, WalletCards } from 'lucide-react'

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isHome = pathname === '/app'
  const isGoals = pathname === '/app/goals' || pathname.startsWith('/app/goals/')
  const isFinances = pathname === '/app/finances' || pathname.startsWith('/app/finances/')

  return (
    <div className="flex h-dvh flex-col overflow-hidden text-[var(--sea-ink)] md:flex-row">
      <header className="flex h-[calc(3.5rem+env(safe-area-inset-top))] shrink-0 items-center justify-between border-b border-[var(--line)] bg-[var(--header-bg)] px-5 pt-[env(safe-area-inset-top)] backdrop-blur-md md:hidden">
        <a href="/app" aria-label="Norte" className="flex min-h-11 min-w-11 items-center gap-3 no-underline">
          <img
            src="/images/logo.png"
            alt=""
            className="size-8 rounded-xl object-contain shadow-[var(--shadow-card)]"
            width="32"
            height="32"
          />
          <span className="text-sm font-semibold tracking-[0.22em] text-[var(--sea-ink)]">NORTE</span>
        </a>
        <UserButton appearance={{ elements: { userButtonTrigger: '!size-11 !min-h-11 !min-w-11' } }} />
      </header>

      <aside className="hidden w-[250px] shrink-0 flex-col border-r border-[var(--line)] bg-[var(--header-bg)] p-6 md:flex">
        <div className="flex items-center gap-3 pb-8">
          <a href="/app" aria-label="Norte" className="flex items-center gap-3 no-underline">
            <img
              src="/images/logo.png"
              alt=""
              className="size-9 rounded-xl object-contain shadow-[var(--shadow-card)]"
              width="36"
              height="36"
            />
            <span className="text-base font-semibold tracking-[0.22em] text-[var(--sea-ink)]">NORTE</span>
          </a>
        </div>

        <nav aria-label="Navegación principal" className="flex flex-1 flex-col gap-2">
          <Link
            to="/app"
            aria-current={isHome ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium no-underline transition-colors motion-reduce:transition-none ${
              isHome
                ? 'bg-[var(--chip-bg)] font-semibold text-[var(--sea-ink)] shadow-sm'
                : 'text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]'
            }`}
          >
            <House className="size-4" aria-hidden="true" />
            <span>Inicio</span>
          </Link>
          <Link
            to="/app/goals"
            aria-current={isGoals ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium no-underline transition-colors motion-reduce:transition-none ${
              isGoals
                ? 'bg-[var(--chip-bg)] font-semibold text-[var(--sea-ink)] shadow-sm'
                : 'text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]'
            }`}
          >
            <Target className="size-4" aria-hidden="true" />
            <span>Objetivos</span>
          </Link>
          <Link
            to="/app/finances"
            aria-current={isFinances ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium no-underline transition-colors motion-reduce:transition-none ${
              isFinances
                ? 'bg-[var(--chip-bg)] font-semibold text-[var(--sea-ink)] shadow-sm'
                : 'text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]'
            }`}
          >
            <WalletCards className="size-4" aria-hidden="true" />
            <span>Finanzas</span>
          </Link>
        </nav>

        <div className="mt-auto border-t border-[var(--line)] pt-4">
          <div className="flex items-center justify-between">
            <UserButton />
          </div>
        </div>
      </aside>

      <main
        id="app-scroll-area"
        data-scroll-restoration-id="app-scroll-area"
        className="flex min-h-0 flex-1 flex-col overflow-y-auto"
      >
        {children}
      </main>

      <nav
        aria-label="Navegación principal"
        className="flex h-[calc(4rem+env(safe-area-inset-bottom))] shrink-0 items-center justify-around border-t border-[var(--line)] bg-[var(--header-bg)] px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        <Link
          to="/app"
          aria-current={isHome ? 'page' : undefined}
          className={`flex flex-1 flex-col items-center justify-center gap-1 py-1 text-xs font-medium no-underline transition-colors motion-reduce:transition-none ${
            isHome
              ? 'font-semibold text-[var(--sea-ink)]'
              : 'text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]'
          }`}
        >
          <House className="size-5" aria-hidden="true" />
          <span>Inicio</span>
        </Link>
        <Link
          to="/app/goals"
          aria-current={isGoals ? 'page' : undefined}
          className={`flex flex-1 flex-col items-center justify-center gap-1 py-1 text-xs font-medium no-underline transition-colors motion-reduce:transition-none ${
            isGoals
              ? 'font-semibold text-[var(--sea-ink)]'
              : 'text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]'
          }`}
        >
          <Target className="size-5" aria-hidden="true" />
          <span>Objetivos</span>
        </Link>
        <Link
          to="/app/finances"
          aria-current={isFinances ? 'page' : undefined}
          className={`flex flex-1 flex-col items-center justify-center gap-1 py-1 text-xs font-medium no-underline transition-colors motion-reduce:transition-none ${
            isFinances
              ? 'font-semibold text-[var(--sea-ink)]'
              : 'text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]'
          }`}
        >
          <WalletCards className="size-5" aria-hidden="true" />
          <span>Finanzas</span>
        </Link>
      </nav>
    </div>
  )
}

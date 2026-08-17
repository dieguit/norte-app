import type { ReactNode } from 'react'
import { UserButton } from '@clerk/tanstack-react-start'
import { Link, useRouterState } from '@tanstack/react-router'
import { House, Target, WalletCards } from 'lucide-react'
import { Button } from '../../../components/ui/button'

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isHome = pathname === '/app'

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg-base)] text-[var(--sea-ink)] md:flex-row">
      <header className="flex h-16 items-center justify-between border-b border-[var(--line)] bg-[var(--header-bg)] px-5 backdrop-blur-md md:hidden">
        <a href="/app" aria-label="Norte" className="flex items-center gap-3 no-underline">
          <img
            src="/images/logo.png"
            alt=""
            className="size-8 rounded-xl object-contain shadow-[var(--shadow-card)]"
            width="32"
            height="32"
          />
          <span className="text-sm font-semibold tracking-[0.22em] text-[var(--sea-ink)]">NORTE</span>
        </a>
        <UserButton />
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
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium no-underline transition-colors ${
              isHome
                ? 'bg-[var(--chip-bg)] font-semibold text-[var(--sea-ink)] shadow-sm'
                : 'text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]'
            }`}
          >
            <House className="size-4" aria-hidden="true" />
            <span>Inicio</span>
          </Link>
          <Button
            variant="ghost"
            disabled
            aria-label="Objetivos"
            className="flex w-full items-center justify-start gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--sea-ink-soft)] opacity-60"
          >
            <Target className="size-4" aria-hidden="true" />
            <span>Objetivos</span>
          </Button>
          <Button
            variant="ghost"
            disabled
            aria-label="Finanzas"
            className="flex w-full items-center justify-start gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--sea-ink-soft)] opacity-60"
          >
            <WalletCards className="size-4" aria-hidden="true" />
            <span>Finanzas</span>
          </Button>
        </nav>

        <div className="mt-auto border-t border-[var(--line)] pt-4">
          <div className="flex items-center justify-between">
            <UserButton />
          </div>
        </div>
      </aside>

      <main className="flex min-h-0 flex-1 flex-col pb-20 md:pb-0">
        {children}
      </main>

      <nav
        aria-label="Navegación principal"
        className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-[var(--line)] bg-[var(--header-bg)] px-2 backdrop-blur-md md:hidden"
      >
        <Link
          to="/app"
          aria-current={isHome ? 'page' : undefined}
          className={`flex flex-1 flex-col items-center justify-center gap-1 py-1 text-xs font-medium no-underline transition-colors ${
            isHome
              ? 'font-semibold text-[var(--sea-ink)]'
              : 'text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]'
          }`}
        >
          <House className="size-5" aria-hidden="true" />
          <span>Inicio</span>
        </Link>
        <Button
          variant="ghost"
          disabled
          aria-label="Objetivos"
          className="flex h-auto flex-1 flex-col items-center justify-center gap-1 py-1 text-xs font-medium text-[var(--sea-ink-soft)] opacity-60 hover:bg-transparent"
        >
          <Target className="size-5" aria-hidden="true" />
          <span>Objetivos</span>
        </Button>
        <Button
          variant="ghost"
          disabled
          aria-label="Finanzas"
          className="flex h-auto flex-1 flex-col items-center justify-center gap-1 py-1 text-xs font-medium text-[var(--sea-ink-soft)] opacity-60 hover:bg-transparent"
        >
          <WalletCards className="size-5" aria-hidden="true" />
          <span>Finanzas</span>
        </Button>
      </nav>
    </div>
  )
}

import type { ReactNode } from 'react'
import { UserButton } from '@clerk/tanstack-react-start'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-base)] text-[var(--sea-ink)]">
      <header className="border-b border-[var(--line)] bg-[var(--header-bg)]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
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
          <nav aria-label="Navegación principal" className="flex items-center gap-4">
            <a
              href="/app"
              className="text-sm font-medium text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
            >
              Inicio
            </a>
            <UserButton />
          </nav>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col">
        {children}
      </main>
    </div>
  )
}

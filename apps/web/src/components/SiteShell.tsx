import type { ReactNode } from 'react'

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-[var(--line)] bg-[var(--header-bg)]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <a href="/" aria-label="Norte" className="flex items-center gap-3 no-underline">
            <img src="/images/logo.png" alt="" className="size-10 rounded-2xl object-contain shadow-[var(--shadow-card)]" width="40" height="40" />
            <span className="text-lg font-semibold tracking-[0.22em] text-[var(--sea-ink)]">NORTE</span>
          </a>
          <span className="rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--palm)]">Coming soon</span>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      <footer className="border-t border-[var(--line)] bg-[var(--header-bg)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-8 text-sm text-[var(--sea-ink-soft)] sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>&copy; 2026 Norte. Financial continuity system.</p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Footer navigation">
            <a href="/#what">What it does</a>
            <a href="/#services">Services</a>
            <a href="/#soon">Coming soon</a>
          </nav>
          <p>Financial continuity for clearer decisions.</p>
        </div>
      </footer>
    </div>
  )
}

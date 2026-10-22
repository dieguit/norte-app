import type { ReactNode } from 'react'
import { m } from '#/paraglide/messages'
import { localizeHref } from '#/paraglide/runtime'
import { LanguageMenu } from './LanguageMenu'

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-[var(--sea-ink)] focus:px-4 focus:py-2 focus:text-[var(--on-primary)]">{m.nav_skip()}</a>
      <header className="border-b border-[var(--line)] bg-[var(--header-bg)]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <a href={localizeHref('/')} aria-label="Norte" className="flex items-center gap-3 no-underline">
            <img src="/images/logo.png" alt="" className="size-10 rounded-2xl object-contain shadow-[var(--shadow-card)]" width="40" height="40" />
            <span className="text-lg font-semibold tracking-[0.22em] text-[var(--sea-ink)]">NORTE</span>
          </a>
          <div className="flex items-center gap-3">
            <LanguageMenu />
            <a href="/app" className="rounded-full bg-[var(--lagoon-deep)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--on-primary)]">{m.nav_go_to_app()}</a>
          </div>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      <footer className="border-t border-[var(--line)] bg-[var(--header-bg)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-8 text-sm text-[var(--sea-ink-soft)] sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>{m.footer_copyright()}</p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label={m.footer_nav_label()}>
            <a href="#what">{m.footer_what()}</a>
            <a href="#features">{m.footer_features()}</a>
            <a href="#start">{m.footer_start()}</a>
          </nav>
          <p>{m.footer_tagline()}</p>
        </div>
      </footer>
    </div>
  )
}

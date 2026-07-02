import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import type { PlaceholderItemList } from '@repo/shared-types'
import { listPlaceholderItems } from '../lib/api'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const [items, setItems] = useState<PlaceholderItemList>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let shouldIgnore = false

    listPlaceholderItems()
      .then((nextItems) => {
        if (!shouldIgnore) {
          setItems(nextItems)
        }
      })
      .catch((nextError: unknown) => {
        if (!shouldIgnore) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : 'TODO: replace unknown placeholder API error',
          )
        }
      })

    return () => {
      shouldIgnore = true
    }
  }, [])

  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_66%)]" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(47,106,74,0.18),transparent_66%)]" />
        <p className="island-kicker mb-3">TODO Full-Stack Boilerplate</p>
        <h1 className="display-title mb-5 max-w-3xl text-4xl leading-[1.02] font-bold tracking-tight text-[var(--sea-ink)] sm:text-6xl">
          TODO: replace this app shell.
        </h1>
        <p className="mb-8 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
          This page is wired to the NestJS API through shared Zod contracts.
          Replace the placeholder resource when the real product shape is clear.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="/about"
            className="rounded-full border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.14)] px-5 py-2.5 text-sm font-semibold text-[var(--lagoon-deep)] no-underline transition hover:-translate-y-0.5 hover:bg-[rgba(79,184,178,0.24)]"
          >
            TODO: app route
          </a>
          <a
            href="https://tanstack.com/router"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-[rgba(23,58,64,0.2)] bg-white/50 px-5 py-2.5 text-sm font-semibold text-[var(--sea-ink)] no-underline transition hover:-translate-y-0.5 hover:border-[rgba(23,58,64,0.35)]"
          >
            TanStack Docs
          </a>
        </div>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [
            'TODO: Shared Types',
            'Zod schemas live in packages/shared-types and are consumed by both apps.',
          ],
          [
            'TODO: NestJS API',
            'The backend validates request and response contracts with nestjs-zod.',
          ],
          [
            'TODO: Frontend Data',
            'The frontend API client parses responses before rendering placeholder data.',
          ],
          [
            'TODO: Product UI',
            'Replace this generated layout once the app direction is decided.',
          ],
        ].map(([title, desc], index) => (
          <article
            key={title}
            className="island-shell feature-card rise-in rounded-2xl p-5"
            style={{ animationDelay: `${index * 90 + 80}ms` }}
          >
            <h2 className="mb-2 text-base font-semibold text-[var(--sea-ink)]">
              {title}
            </h2>
            <p className="m-0 text-sm text-[var(--sea-ink-soft)]">{desc}</p>
          </article>
        ))}
      </section>

      <section className="island-shell mt-8 rounded-2xl p-6">
        <p className="island-kicker mb-2">TODO API Contract Smoke Test</p>
        {error ? (
          <p className="text-sm text-red-700">{error}</p>
        ) : (
          <ul className="m-0 list-disc space-y-2 pl-5 text-sm text-[var(--sea-ink-soft)]">
            {items.map((item) => (
              <li key={item.id}>
                <strong>{item.title}</strong>: {item.description}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="island-shell mt-8 rounded-2xl p-6">
        <p className="island-kicker mb-2">TODO Next Steps</p>
        <ul className="m-0 list-disc space-y-2 pl-5 text-sm text-[var(--sea-ink-soft)]">
          <li>
            Replace <code>packages/shared-types/src/placeholder.schema.ts</code>{' '}
            with real domain schemas.
          </li>
          <li>
            Replace <code>apps/api/src/placeholder</code> with real modules and
            persistence.
          </li>
          <li>
            Replace <code>apps/web/src/routes/index.tsx</code> with product routes
            and UI.
          </li>
        </ul>
      </section>
    </main>
  )
}

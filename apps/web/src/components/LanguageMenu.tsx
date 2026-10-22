import { Globe } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover'
import { m } from '#/paraglide/messages'
import { getLocale, localizeHref, locales, setLocale } from '#/paraglide/runtime'

const labels = { es: 'Español', en: 'English' } as const

export function LanguageMenu() {
  const current = getLocale()
  return (
    <Popover>
      <PopoverTrigger
        aria-label={`${m.nav_language()}: ${labels[current]}`}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sea-ink)]"
      >
        <Globe aria-hidden className="size-4" />
        {current}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-40 p-1">
        <ul>
          {locales.map((locale) => (
            <li key={locale}>
              <a
                href={localizeHref('/', { locale })}
                hrefLang={locale}
                lang={locale}
                aria-current={locale === current ? 'true' : undefined}
                onClick={(event) => {
                  if (
                    event.button === 0 &&
                    !event.metaKey &&
                    !event.ctrlKey &&
                    !event.shiftKey &&
                    !event.altKey
                  ) {
                    event.preventDefault()
                    setLocale(locale)
                  }
                }}
                className="block rounded-md px-3 py-2 text-sm aria-[current=true]:font-semibold hover:bg-[var(--surface)]"
              >
                {labels[locale]}
              </a>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

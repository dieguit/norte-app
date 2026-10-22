import { describe, expect, it } from 'vitest'
import { overwriteGetLocale } from '#/paraglide/runtime'
import { Route } from './index'

type Head = { meta: Array<Record<string, string>>; links: Array<Record<string, string>>; scripts: Array<{ children: string }> }
const head = () => Route.options.head?.(undefined as never) as Head

describe('landing SEO head', () => {
  it('publishes canonical, hreflang alternates and es_AR metadata on /', () => {
    overwriteGetLocale(() => 'es')
    const { meta, links, scripts } = head()

    expect(meta).toContainEqual({ title: 'Norte | Planificá tus metas financieras y ahorrá con rumbo' })
    expect(meta).toContainEqual({ property: 'og:locale', content: 'es_AR' })
    expect(links).toContainEqual({ rel: 'canonical', href: 'https://somosnorte.lat/' })
    expect(links).toContainEqual({ rel: 'alternate', hrefLang: 'en', href: 'https://somosnorte.lat/en' })
    expect(links).toContainEqual({ rel: 'alternate', hrefLang: 'x-default', href: 'https://somosnorte.lat/' })
    const jsonLd = JSON.parse(scripts[0].children)
    expect(jsonLd.offers.availability).toBe('https://schema.org/InStock')
    expect(jsonLd.inLanguage).toBe('es')
  })

  it('switches canonical and og:locale on /en', () => {
    overwriteGetLocale(() => 'en')
    const { meta, links } = head()

    expect(meta).toContainEqual({ property: 'og:locale', content: 'en_US' })
    expect(links).toContainEqual({ rel: 'canonical', href: 'https://somosnorte.lat/en' })
  })
})

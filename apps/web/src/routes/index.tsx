import { createFileRoute } from '@tanstack/react-router'
import { SiteShell } from '#/components/SiteShell'
import { m } from '#/paraglide/messages'
import { getLocale } from '#/paraglide/runtime'
import { NorteLandingPage } from './-components/NorteLandingPage'

const SITE_URL = 'https://somosnorte.lat'
const urls = { es: `${SITE_URL}/`, en: `${SITE_URL}/en` } as const
const ogLocales = { es: 'es_AR', en: 'en_US' } as const

export const Route = createFileRoute('/')({
  head: () => {
    const locale = getLocale()
    const other = locale === 'es' ? 'en' : 'es'
    return {
      meta: [
        { title: m.meta_title() },
        { name: 'description', content: m.meta_description() },
        { name: 'theme-color', content: '#3a6e54' },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: urls[locale] },
        { property: 'og:title', content: m.meta_og_title() },
        { property: 'og:description', content: m.meta_og_description() },
        { property: 'og:image', content: `${SITE_URL}/images/compass.jpg` },
        { property: 'og:locale', content: ogLocales[locale] },
        { property: 'og:locale:alternate', content: ogLocales[other] },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: m.meta_og_title() },
        { name: 'twitter:description', content: m.meta_og_description() },
      ],
      links: [
        { rel: 'canonical', href: urls[locale] },
        { rel: 'alternate', hrefLang: 'es', href: urls.es },
        { rel: 'alternate', hrefLang: 'en', href: urls.en },
        { rel: 'alternate', hrefLang: 'x-default', href: urls.es },
      ],
      scripts: [{
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'Norte',
          url: urls[locale],
          inLanguage: locale,
          applicationCategory: 'FinanceApplication',
          operatingSystem: 'Web',
          description: m.meta_description(),
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
        }),
      }],
    }
  },
  component: () => <SiteShell><NorteLandingPage /></SiteShell>,
})

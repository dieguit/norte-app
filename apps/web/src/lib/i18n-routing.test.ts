import { describe, expect, it } from 'vitest'
import { deLocalizeUrl, localizeHref } from '#/paraglide/runtime'

describe('landing-only locale routing', () => {
  it('maps the landing to / (es) and /en (en)', () => {
    expect(localizeHref('/', { locale: 'es' })).toBe('/')
    expect(localizeHref('/', { locale: 'en' })).toBe('/en')
    expect(deLocalizeUrl(new URL('https://somosnorte.lat/en')).pathname).toBe('/')
  })

  it.each(['/app', '/app/goals', '/sign-in', '/onboarding', '/link', '/ingest/e', '/_serverFn/x'])(
    'never prefixes %s',
    (path) => {
      expect(localizeHref(path, { locale: 'en' })).toBe(path)
      expect(deLocalizeUrl(new URL(`https://somosnorte.lat${path}`)).pathname).toBe(path)
    },
  )
})

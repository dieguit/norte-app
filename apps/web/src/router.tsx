import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { deLocalizeUrl, locales, localizeUrl, overwriteGetLocale } from './paraglide/runtime'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  if (typeof document !== 'undefined') {
    const lang = document.documentElement.lang
    if ((locales as readonly string[]).includes(lang)) {
      // Client must agree with the server's Accept-Language-based choice to avoid hydration mismatch.
      overwriteGetLocale(() => lang as (typeof locales)[number])
    }
  }

  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    scrollToTopSelectors: ['#app-scroll-area'],
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    rewrite: {
      input: ({ url }) => deLocalizeUrl(url),
      output: ({ url }) => localizeUrl(url),
    },
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}

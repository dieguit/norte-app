import type { CompilerOptions } from '@inlang/paraglide-js'

export const paraglideOptions = {
  project: './project.inlang',
  outdir: './src/paraglide',
  outputStructure: 'message-modules',
  cookieName: 'NORTE_LOCALE',
  strategy: ['url', 'cookie', 'preferredLanguage', 'baseLocale'],
  urlPatterns: [
    { pattern: '/', localized: [['es', '/'], ['en', '/en']] },
    // Identity mapping: only the landing is localized; app/auth/proxy URLs never get a locale prefix.
    { pattern: '/:path(.*)?', localized: [['es', '/:path(.*)?'], ['en', '/:path(.*)?']] },
  ],
  routeStrategies: [
    // Root follows the visitor's saved choice or browser language; /en is always English so both stay crawlable.
    { match: '/', strategy: ['cookie', 'preferredLanguage', 'url', 'baseLocale'] },
    // cookie listed so setLocale() persists the choice from /en; url still wins here.
    { match: '/en', strategy: ['url', 'cookie', 'baseLocale'] },
    { match: '/:path(.*)?', exclude: true },
  ],
} satisfies CompilerOptions

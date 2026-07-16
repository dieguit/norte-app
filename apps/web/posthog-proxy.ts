export const posthogProxyRules = {
  '/ingest/static/**': { proxy: 'https://us-assets.i.posthog.com/static/**' },
  '/ingest/**': { proxy: 'https://us.i.posthog.com/**' },
}

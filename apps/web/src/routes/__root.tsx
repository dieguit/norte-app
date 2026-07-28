import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { PostHogProvider } from '@posthog/react'
import { SiteShell } from '../components/SiteShell'
import appCss from '../styles.css?url'
import { getAdminSession } from '../admin/auth'

export const Route = createRootRoute({
  loader: () => getAdminSession(),
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const authenticated = Route.useLoaderData()
  const content = (
    <>
      <SiteShell>{children}</SiteShell>
      <TanStackDevtools config={{ position: 'bottom-right' }} plugins={[{ name: 'Tanstack Router', render: <TanStackRouterDevtoolsPanel /> }]} />
    </>
  )

  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body className="font-sans antialiased [overflow-wrap:anywhere]">
        {authenticated ? content : (
          <PostHogProvider apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN!} options={{
            api_host: '/ingest',
            ui_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://us.posthog.com',
            defaults: '2025-05-24',
            capture_exceptions: true,
            debug: import.meta.env.DEV,
          }}>
            {content}
          </PostHogProvider>
        )}
        <Scripts />
      </body>
    </html>
  )
}

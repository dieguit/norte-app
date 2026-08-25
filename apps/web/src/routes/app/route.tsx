import { useUser } from '@clerk/tanstack-react-start'
import { PostHogProvider, usePostHog } from '@posthog/react'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useEffect } from 'react'
import { getFinancialAppState } from '../../features/financial/financial.functions'
import { AppShell } from './-components/AppShell'

export const Route = createFileRoute('/app')({
  beforeLoad: async () => await getFinancialAppState(),
  component: AppLayout,
})

function AppLayout() {
  return (
    <PostHogProvider
      apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN}
      options={{
        api_host: '/ingest',
        capture_exceptions: true,
        ui_host: 'https://us.posthog.com',
      }}
    >
      <IdentifyAppUser />
      <AppShell>
        <Outlet />
      </AppShell>
    </PostHogProvider>
  )
}

function IdentifyAppUser() {
  const posthog = usePostHog()
  const { isLoaded, isSignedIn, user } = useUser()

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return

    posthog.identify(user.id, {
      ...(user.fullName ? { $name: user.fullName } : {}),
      ...(user.primaryEmailAddress?.emailAddress
        ? { $email: user.primaryEmailAddress.emailAddress }
        : {}),
      ...(user.createdAt ? { created_at: user.createdAt.toISOString() } : {}),
    })

    return () => posthog.reset()
  }, [isLoaded, isSignedIn, posthog, user])

  return null
}

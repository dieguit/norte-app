import { SignIn } from '@clerk/tanstack-react-start'

export function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12 sm:px-8">
      <SignIn fallbackRedirectUrl="/app" />
    </main>
  )
}

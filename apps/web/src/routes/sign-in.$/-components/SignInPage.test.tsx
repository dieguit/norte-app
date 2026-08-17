// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { Route } from '../../sign-in.$'

vi.mock('@clerk/tanstack-react-start', () => ({
  SignIn: ({ fallbackRedirectUrl }: { fallbackRedirectUrl?: string }) => (
    <div data-fallback-redirect-url={fallbackRedirectUrl}>Clerk sign-in</div>
  ),
}))

afterEach(cleanup)

it('centers Clerk sign-in in the viewport', () => {
  const SignInRoute = Route.options.component!
  render(<SignInRoute />)

  expect(screen.getByText('Clerk sign-in').parentElement?.className).toContain('min-h-screen')
  expect(screen.getByText('Clerk sign-in').parentElement?.className).toContain('items-center')
  expect(screen.getByText('Clerk sign-in').parentElement?.className).toContain('justify-center')
})

it('redirects to the financial app after sign-in', () => {
  const SignInRoute = Route.options.component!
  render(<SignInRoute />)

  expect(screen.getByText('Clerk sign-in').getAttribute('data-fallback-redirect-url')).toBe('/app')
})

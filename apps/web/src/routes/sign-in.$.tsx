import { createFileRoute } from '@tanstack/react-router'
import { SignInPage } from './sign-in.$/-components/SignInPage'

export const Route = createFileRoute('/sign-in/$')({
  component: SignInPage,
})

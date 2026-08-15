import { createFileRoute } from '@tanstack/react-router'
import { SignInPage } from '../app/SignInPage'

export const Route = createFileRoute('/sign-in/$')({
  component: SignInPage,
})

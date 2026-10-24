import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/app/finances/')({
  beforeLoad: () => {
    throw redirect({ to: '/app/finances/incomes' })
  },
})

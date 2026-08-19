import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/goals/')({
  component: GoalsIndex,
})

function GoalsIndex() {
  return null
}

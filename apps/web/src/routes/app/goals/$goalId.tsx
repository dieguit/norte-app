import { createFileRoute, useLoaderData } from '@tanstack/react-router'
import { GoalDetailRoute as GoalDetailRouteView } from './-components/GoalDetailRoute'

export const Route = createFileRoute('/app/goals/$goalId')({
  component: GoalDetailRoute,
})

function GoalDetailRoute() {
  const { goalId } = Route.useParams()
  const data = useLoaderData({ from: '/app/goals' })
  const goal =
    data.profile === 'present'
      ? data.workspace.groups.flatMap((group) => group.goals).find((item) => item.id === goalId)
      : undefined

  return <GoalDetailRouteView goal={goal} />
}

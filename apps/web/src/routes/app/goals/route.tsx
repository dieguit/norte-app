import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { getGoalsWorkspace } from '../../../features/goals/goals.functions'
import { FinancialOnboarding } from '../-components/FinancialOnboarding'
import { GoalsEmpty, GoalsError, GoalsLoading } from './-components/GoalsRouteStates'
import { GoalsWorkspace } from './-components/GoalsWorkspace'
import { GoalCreationSheet } from './-components/GoalCreationSheet'
import { AllocationChangeSheet } from './-components/AllocationChangeSheet'
import { GoalEditSheet } from './-components/GoalEditSheet'

export const Route = createFileRoute('/app/goals')({
  loader: () => getGoalsWorkspace(),
  pendingMs: 0,
  pendingMinMs: 300,
  pendingComponent: GoalsLoading,
  errorComponent: GoalsRouteError,
  component: GoalsLayout,
})

function GoalsRouteError() {
  const router = useRouter()
  return (
    <GoalsError
      onRetry={() => {
        router.invalidate()
      }}
    />
  )
}

function GoalsLayout() {
  const data = Route.useLoaderData()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isAllocationChangeOpen, setIsAllocationChangeOpen] = useState(false)
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)

  if (data.profile === 'missing') return <FinancialOnboarding />

  const hasGoals = data.workspace.groups.some((group) => group.goals.length > 0)
  return (
    <>
      {hasGoals ? (
        <GoalsWorkspace
          workspace={data.workspace}
          onNewGoal={() => setIsCreateOpen(true)}
          onChangePlanning={() => setIsAllocationChangeOpen(true)}
          onEditGoal={setEditingGoalId}
        />
      ) : (
        <GoalsEmpty onNewGoal={() => setIsCreateOpen(true)} />
      )}
      <GoalCreationSheet open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      <AllocationChangeSheet
        open={isAllocationChangeOpen}
        onOpenChange={setIsAllocationChangeOpen}
      />
      <GoalEditSheet
        open={editingGoalId !== null}
        goalId={editingGoalId}
        onOpenChange={(open) => {
          if (!open) setEditingGoalId(null)
        }}
      />
    </>
  )
}

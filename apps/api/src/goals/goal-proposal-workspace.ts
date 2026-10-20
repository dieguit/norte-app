import type { Money } from '../finances/goals.money'
import type { GoalWorkspaceItem, GoalsWorkspace, GoalsWorkspaceSource } from '../finances/goals.engine'

export function findGoalInWorkspace(workspace: GoalsWorkspace, goalId: string): GoalWorkspaceItem | undefined {
  return workspace.groups.flatMap((group) => group.goals).find((goal) => goal.id === goalId)
}

export function getAllocatedMonthlyAmounts(
  goal: GoalWorkspaceItem | undefined,
  selectedSnapshot: GoalsWorkspaceSource['snapshots'][number] | undefined,
): Money[] {
  const fundingRow = goal?.funding?.find(
    (funding) => funding.effectiveMonth === selectedSnapshot?.effectiveMonth,
  ) ?? goal?.funding?.[0]
  return fundingRow?.allocatedDestinationAmount ? [fundingRow.allocatedDestinationAmount] : []
}

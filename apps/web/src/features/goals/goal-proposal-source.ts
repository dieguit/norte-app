import type { GoalsWorkspaceSource } from './goals'

export function buildGoalProposalSource(input: {
  source: GoalsWorkspaceSource
  pendingSnapshot?: GoalsWorkspaceSource['snapshots'][number]
  pendingAllocations?: GoalsWorkspaceSource['allocations']
  includePendingSnapshot?: boolean
  snapshotId: string
  effectiveMonth: string
  entries: ReadonlyArray<{ goalId: string; percentage: string }>
  goals: GoalsWorkspaceSource['goals']
  investmentPositions: GoalsWorkspaceSource['investmentPositions']
  profile: GoalsWorkspaceSource['profile']
}): GoalsWorkspaceSource {
  const snapshots = [
    ...input.source.snapshots,
    ...(input.includePendingSnapshot && input.pendingSnapshot ? [input.pendingSnapshot] : []),
  ]
  const sourceAllocations = [...input.source.allocations, ...(input.pendingAllocations ?? [])]
  const targetMonth = input.effectiveMonth.slice(0, 7)
  const replacedSnapshotIds = new Set(
    snapshots
      .filter((candidate) => candidate.effectiveMonth.slice(0, 7) === targetMonth)
      .map((candidate) => candidate.id),
  )
  const snapshot = {
    id: input.snapshotId,
    userId: input.source.profile?.userId,
    effectiveMonth: input.effectiveMonth,
  }
  const existingIndex = snapshots.findIndex(
    (candidate) => candidate.effectiveMonth.slice(0, 7) === targetMonth,
  )
  if (existingIndex >= 0) snapshots[existingIndex] = snapshot
  else snapshots.push(snapshot)
  const allocations = [
    ...sourceAllocations.filter((allocation) => !replacedSnapshotIds.has(allocation.snapshotId)),
    ...input.entries.map((entry) => ({
      id: `alloc-${input.snapshotId}-${entry.goalId}`,
      snapshotId: input.snapshotId,
      goalId: entry.goalId,
      percentage: entry.percentage,
    })),
  ]
  return {
    ...input.source,
    profile: input.profile,
    goals: input.goals,
    investmentPositions: input.investmentPositions,
    snapshots,
    allocations,
  }
}

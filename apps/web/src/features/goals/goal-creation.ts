import type { Money } from '../../lib/money'
import type {
  GoalStatus,
  GoalCreationContext,
} from '@repo/shared-types'
import type { GoalCreationDraft } from './goal-creation.schema'
import type { GoalCreationAllocationEntry } from '@repo/finance-utils'

export {
  allocationEntriesMatch,
  rebalanceAllocationEntries,
  calculatePercentageSum,
  recalculateAllocationAmounts,
  type GoalCreationAllocationEntry,
} from '@repo/finance-utils'
export type { GoalCreationContext, GoalCreationPreviewResult } from '@repo/shared-types'

export const PENDING_GOAL_ID = 'pending-goal'

export interface GoalEditContext {
  goalId: string
  status?: GoalStatus
  draft: GoalCreationDraft
  context: GoalCreationContext
}

export interface GoalCreationAllocation {
  monthlyContribution?: Money
  effectiveMonth: string
  entries: GoalCreationAllocationEntry[]
  totalPercentage: string
}

import { useStore } from '@tanstack/react-form'
import { PlanAllocationEditor } from '../../../../features/goals/PlanAllocationEditor'
import type {
  GoalCreationContext,
  GoalCreationPreviewResult,
} from '../../../../features/goals/goal-creation'
import { rebalanceAllocationEntries } from '../../../../features/goals/goal-creation'
import type { GoalCreationFormApi } from './useGoalCreationForm'
import { getGoalImpactDisplay } from './goal-impact-display'
import { GoalImpactComparison, PausedGoalAllocation } from './GoalImpactParts'

export interface GoalImpactTransition {
  goalId: string
  label?: string
  status?: 'active' | 'paused' | 'editing'
  editable?: boolean
}

export interface GoalImpactProps {
  form: GoalCreationFormApi
  context: GoalCreationContext
  preview: GoalCreationPreviewResult | null
  isPreviewPending: boolean
  onPercentageCommit: () => void
  transition?: GoalImpactTransition
}

export function GoalImpact({
  form,
  preview,
  isPreviewPending,
  onPercentageCommit,
  transition,
}: GoalImpactProps) {
  const values = useStore(form.store, (state) => state.values)
  const display = getGoalImpactDisplay(preview, values.allocations ?? [], transition)
  const isPaused = transition?.status === 'paused' || transition?.editable === false

  const handlePercentageChange = (goalId: string, percentage: string) => {
    const currentEntries = display.baseEntries.map((entry) => ({
      goalId: entry.goalId,
      percentage: entry.percentage,
    }))
    const nextEntries = rebalanceAllocationEntries(currentEntries, goalId, percentage)
    form.setFieldValue('allocations', nextEntries)
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Distribución del Plan" className="flex flex-col gap-3">
        {isPaused && (
          <PausedGoalAllocation name={display.pausedGoalName} label={transition?.label} />
        )}
        <PlanAllocationEditor
          allocation={display.allocation}
          disabled={isPreviewPending}
          onPercentageChange={handlePercentageChange}
          onPercentageCommit={onPercentageCommit}
        />
      </section>
      <GoalImpactComparison
        impacts={display.impacts}
        isAllocationsValid={display.isAllocationsValid}
        isPreviewPending={isPreviewPending}
        isPreviewOutdated={display.isPreviewOutdated}
      />
    </div>
  )
}

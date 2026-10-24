import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { GoalsWorkspaceData as GoalsWorkspaceType, GoalWorkspaceItem } from '@repo/shared-types'
import { MapGrid } from '../../../../components/norte/MapGrid'
import { Button } from '../../../../components/ui/button'
import { goalColor, planShares, sortByProjection } from './goal-display'
import { GoalDetailSheet } from './GoalDetailSheet'
import { GoalGroup, GoalMenu, GoalRow, PlanCard, goalActions, type GoalActionProps } from './GoalsWorkspaceParts'

export interface GoalsWorkspaceProps extends GoalActionProps {
  workspace: GoalsWorkspaceType
  onNewGoal?: () => void
  onChangePlanning?: () => void
}

export function GoalsWorkspace({ workspace, onNewGoal, onChangePlanning, ...actionProps }: GoalsWorkspaceProps) {
  const [detailGoalId, setDetailGoalId] = useState<string | null>(null)
  const [openGroups, setOpenGroups] = useState<Partial<Record<'paused' | 'completed', boolean>>>({})
  const month = workspace.financialSummary.month
  const canChangePlan = Number(workspace.financialSummary.balance.amount) > 0
  const activeGoals = sortByProjection(workspace.groups.find((group) => group.status === 'active')?.goals ?? [])
  const secondaryGroups = workspace.groups.filter(
    (group): group is typeof group & { status: 'paused' | 'completed' } => group.status !== 'active' && group.goals.length > 0,
  )
  const detailGoal = workspace.groups.flatMap((group) => group.goals).find((goal) => goal.id === detailGoalId) ?? null

  const row = (goal: GoalWorkspaceItem, color?: string) => (
    <GoalRow
      key={goal.id}
      goal={goal}
      color={color}
      month={month}
      onAssign={canChangePlan ? onChangePlanning : undefined}
      actions={<GoalMenu goal={goal} onDetail={() => setDetailGoalId(goal.id)} {...actionProps} />}
    />
  )

  return (
    <div className="relative isolate flex flex-col gap-6 px-5 pt-5 pb-8">
      <MapGrid className="h-65" />
      <div className="flex items-center justify-between gap-3">
        <h1 className="m-0 text-display text-foreground">Objetivos</h1>
        <Button type="button" id="new-goal-trigger" aria-label="Nuevo objetivo" onClick={onNewGoal} className="relative h-9 gap-1.5 rounded-md px-3.5 text-[14px] font-semibold after:absolute after:-inset-1">
          <Plus className="size-4" aria-hidden="true" />
          Nuevo
        </Button>
      </div>
      {activeGoals.length > 0 && (
        <>
          <PlanCard summary={workspace.financialSummary} shares={planShares(activeGoals, month)} onChangePlanning={onChangePlanning} />
          <section aria-labelledby="goals-active-heading">
            <div className="flex items-baseline justify-between gap-3 pb-1">
              <h2 id="goals-active-heading" className="m-0 text-heading text-foreground">Activos</h2>
              <span className="text-caption text-subtle-foreground">Por fecha proyectada</span>
            </div>
            <ul className="m-0 list-none p-0">{activeGoals.map((goal, index) => row(goal, goalColor(index)))}</ul>
          </section>
        </>
      )}
      {secondaryGroups.length > 0 && (
        <div>
          {secondaryGroups.map((group) => (
            <GoalGroup
              key={group.status}
              status={group.status}
              count={group.goals.length}
              open={Boolean(openGroups[group.status])}
              onToggle={() => setOpenGroups((current) => ({ ...current, [group.status]: !current[group.status] }))}
            >
              {group.goals.map((goal) => row(goal))}
            </GoalGroup>
          ))}
        </div>
      )}
      <GoalDetailSheet
        goal={detailGoal}
        actions={detailGoal ? goalActions(detailGoal, actionProps) : []}
        onClose={() => setDetailGoalId(null)}
        onChangePlanning={canChangePlan ? onChangePlanning : undefined}
      />
    </div>
  )
}

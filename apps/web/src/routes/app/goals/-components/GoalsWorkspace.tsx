import { useState } from 'react'
import { FinancialSummaryCards } from '../../../../components/FinancialSummaryCards'
import { Button } from '../../../../components/ui/button'
import type { GoalsWorkspace as GoalsWorkspaceType } from '../../../../features/goals/goals'
import { GoalCard, SecondaryGoalGroup } from './GoalsWorkspaceParts'

export interface GoalsWorkspaceProps {
  workspace: GoalsWorkspaceType
  onNewGoal?: () => void
  onChangePlanning?: () => void
  onEditGoal?: (goalId: string) => void
  onChangeGoalLifecycle?: (goalId: string, lifecycle: 'pause' | 'resume') => void
  onCompleteGoal?: (goalId: string) => void
}

function WorkspaceHeader({ onNewGoal }: { onNewGoal?: () => void }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="font-serif text-3xl font-bold tracking-tight text-[var(--sea-ink)] sm:text-4xl">Objetivos</h1><p className="mt-2 text-base leading-relaxed text-[var(--sea-ink-soft)]">Administrá tus metas financieras y su asignación mensual.</p></div>
      <div className="flex flex-wrap items-center gap-3 sm:justify-end"><Button type="button" id="new-goal-trigger" onClick={onNewGoal} className="self-start sm:self-auto">Nuevo objetivo</Button></div>
    </div>
  )
}

function getActiveGoals(workspace: GoalsWorkspaceType) {
  return workspace.groups.find((group) => group.status === 'active')?.goals ?? []
}

function getSecondaryGroups(workspace: GoalsWorkspaceType) {
  return workspace.groups.filter((group): group is typeof group & { status: 'paused' | 'completed' } => (group.status === 'paused' || group.status === 'completed') && group.goals.length > 0)
}

export function GoalsWorkspace({ workspace, onNewGoal, onChangePlanning, onEditGoal, onChangeGoalLifecycle, onCompleteGoal }: GoalsWorkspaceProps) {
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null)
  const [openGroups, setOpenGroups] = useState<Partial<Record<'paused' | 'completed', boolean>>>({})
  const activeGoals = getActiveGoals(workspace)
  const secondaryGroups = getSecondaryGroups(workspace)
  const actionProps = { onEditGoal, onChangeGoalLifecycle, onCompleteGoal }
  const toggleGoal = (goalId: string) => setExpandedGoalId((current) => current === goalId ? null : goalId)

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-8 sm:px-8 sm:py-12">
      <WorkspaceHeader onNewGoal={onNewGoal} />
      {activeGoals.length > 0 && <FinancialSummaryCards mode="goals" summary={workspace.financialSummary} onChangePlanning={onChangePlanning} />}
      <div className="flex flex-col gap-7">
        {activeGoals.length > 0 && <div className="flex flex-col gap-4"><>{activeGoals.map((goal) => <GoalCard key={goal.id} goal={goal} expanded={expandedGoalId === goal.id} onToggle={() => toggleGoal(goal.id)} {...actionProps} />)}</></div>}
        {secondaryGroups.map((group) => <SecondaryGoalGroup key={group.status} status={group.status} goals={group.goals} isOpen={Boolean(openGroups[group.status])} onToggleGroup={() => setOpenGroups((current) => ({ ...current, [group.status]: !current[group.status] }))} expandedGoalId={expandedGoalId} onToggleGoal={toggleGoal} actionProps={actionProps} />)}
      </div>
    </div>
  )
}

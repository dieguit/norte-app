import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { GoalsWorkspaceData as GoalsWorkspaceType, GoalWorkspaceItem } from '@repo/shared-types'
import { Button } from '../../../../components/ui/button'
import { PageHeader } from '../../../../components/norte/PageHeader'
import { Page, SplitLayout } from '../../../../components/norte/PageLayout'
import { formatPercentage } from '../../../../lib/format'
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
  const [detailEditing, setDetailEditing] = useState(false)
  const closeDetail = () => {
    setDetailGoalId(null)
    setDetailEditing(false)
  }
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
      onDetail={() => { setDetailGoalId(goal.id); setDetailEditing(false) }}
      onAssign={canChangePlan ? onChangePlanning : undefined}
      actions={<GoalMenu goal={goal} onDetail={() => { setDetailGoalId(goal.id); setDetailEditing(false) }} {...actionProps} />}
    />
  )

  const content = (
    <div className="flex flex-col gap-6">
      {activeGoals.length > 0 && (
        <section aria-labelledby="goals-active-heading">
          <div className="flex items-baseline justify-between gap-3 pb-1">
            <h2 id="goals-active-heading" className="m-0 text-heading text-foreground">
              Activos
            </h2>
            <span className="text-caption text-subtle-foreground">Por fecha proyectada</span>
          </div>
          <ul className="m-0 list-none p-0">{activeGoals.map((goal, index) => row(goal, goalColor(index)))}</ul>
        </section>
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
    </div>
  )

  return (
    <Page className="pb-8">
      <PageHeader
        eyebrow="Objetivos"
        title="Tus objetivos"
        showMobileAction
        action={
          <Button
            type="button"
            id="new-goal-trigger"
            aria-label="Nuevo objetivo"
            onClick={onNewGoal}
            className="relative h-9 gap-1.5 rounded-md px-3.5 text-[14px] font-semibold after:absolute after:-inset-1 xl:h-11 xl:px-5 xl:text-[15px]"
          >
            <Plus className="size-4" aria-hidden="true" />
            <span className="xl:hidden">Nuevo</span>
            <span className="hidden xl:inline">Nuevo objetivo</span>
          </Button>
        }
      />
      {activeGoals.length > 0 ? (
        <SplitLayout
          aside={
            <>
              <PlanCard summary={workspace.financialSummary} shares={planShares(activeGoals, month)} onChangePlanning={onChangePlanning} />
              <section aria-labelledby="goals-how-heading" className="hidden flex-col gap-1.5 xl:flex">
                <h2 id="goals-how-heading" className="m-0 text-body font-semibold text-foreground">
                  Cómo funciona
                </h2>
                <p className="m-0 text-body-sm text-muted-foreground">
                  Cada mes, el {formatPercentage(workspace.financialSummary.dedicationPercentage, 0)} de lo que te queda después de gastos se reparte entre tus objetivos activos. Cuando uno se completa, su parte se redistribuye entre los demás.
                </p>
              </section>
            </>
          }
        >
          {content}
        </SplitLayout>
      ) : (
        content
      )}
      <GoalDetailSheet
        goal={detailGoal}
        editing={detailEditing}
        onEditBack={() => setDetailEditing(false)}
        actions={detailGoal ? goalActions(detailGoal, { ...actionProps, onEditGoal: actionProps.onEditGoal && (() => setDetailEditing(true)) }) : []}
        onClose={closeDetail}
        onChangePlanning={canChangePlan ? onChangePlanning : undefined}
      />
    </Page>
  )
}

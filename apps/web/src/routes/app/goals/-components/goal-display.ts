import { formatCalendarMonth, formatPercentage } from '../../../../lib/format'
import type { Money } from '../../../../lib/money'
import type { GoalPriority, GoalWorkspaceItem } from '@repo/shared-types'
import { currentFunding, shortMonth } from '../../-components/home-view'

type Funding = GoalWorkspaceItem['funding'][number]

export const GOAL_PRIORITY_LABELS: Record<GoalPriority, string> = {
  high: 'Prioridad alta',
  medium: 'Prioridad media',
  low: 'Prioridad baja',
}

export function getGoalProjectionDisplay(goal: GoalWorkspaceItem): string {
  if (goal.status === 'completed') {
    return goal.completedAt ? formatCalendarMonth(goal.completedAt.slice(0, 7)) : 'Fecha no disponible'
  }

  if (goal.status === 'paused') return 'Proyección pausada'

  switch (goal.projection.status) {
    case 'available':
      return formatCalendarMonth(goal.projection.completionMonth)
    case 'target_unavailable':
      return 'Objetivo por calcular'
    case 'plan_paused':
      return 'Proyección pausada'
    case 'commitment_absent':
      return 'Sin aporte mensual'
    case 'no_future_allocation':
      return 'Sin asignación futura'
    case 'investment_assumption_unavailable':
      return 'Supuesto de inversión no disponible'
    case 'outside_horizon':
      return 'No alcanzado dentro del horizonte'
  }
}

export const STRATEGY_LABELS = { save: 'Ahorro', invest: 'Inversión' } as const

export function capitalizedMonth(month: string) {
  const label = shortMonth(month)
  return label[0].toUpperCase() + label.slice(1)
}

// New plans take effect next month; until then the upcoming row is the plan the user sees.
export function planFunding(goal: GoalWorkspaceItem, month: string): Funding | undefined {
  return currentFunding(goal, month) ?? [...goal.funding].sort((a, b) => a.effectiveMonth.localeCompare(b.effectiveMonth))[0]
}

export const isDated = (goal: GoalWorkspaceItem) => goal.status === 'active' && goal.projection.status === 'available'

function receivesLabel(goal: GoalWorkspaceItem, month: string) {
  const percentage = Number(planFunding(goal, month)?.percentage ?? 0)
  return percentage > 0 ? `recibe ${formatPercentage(percentage, 0)}` : 'no recibe aportes'
}

export function goalRowMeta(goal: GoalWorkspaceItem, month: string) {
  if (goal.status === 'completed') return `Cumplido · ${getGoalProjectionDisplay(goal)}`
  if (isDated(goal)) return `${STRATEGY_LABELS[goal.strategy]} · ${goal.currency} · ${receivesLabel(goal, month)}`
  const reason = goal.projection.status === 'no_future_allocation' ? 'Sin fecha' : getGoalProjectionDisplay(goal)
  return `${reason} · ${receivesLabel(goal, month)}`
}

export function goalProgress(goal: GoalWorkspaceItem) {
  if (goal.status === 'completed') return 100
  return goal.targetAmount && goal.progressPercentage ? Number(goal.progressPercentage) : undefined
}

export function sortByProjection(goals: GoalWorkspaceItem[]) {
  const key = (goal: GoalWorkspaceItem) => (goal.projection.status === 'available' ? goal.projection.completionMonth : '9999-12')
  return [...goals].sort((a, b) => key(a).localeCompare(key(b)))
}

// Spread across the income family so neighbouring goals stay distinguishable (pen rows use 2, 4, 7).
const GOAL_STEPS = [2, 4, 7, 1, 5, 8, 3, 6, 9]
export const goalColor = (index: number) => `var(--chart-income-${GOAL_STEPS[index % GOAL_STEPS.length]})`

export type PlanShare = { goal: GoalWorkspaceItem; color: string; percentage: number; monthly?: Money }

export function planShares(goals: GoalWorkspaceItem[], month: string): PlanShare[] {
  return goals
    .flatMap((goal, index) => {
      const funding = planFunding(goal, month)
      const percentage = Number(funding?.percentage ?? 0)
      return percentage > 0 ? [{ goal, color: goalColor(index), percentage, monthly: funding?.allocatedDestinationAmount }] : []
    })
    .sort((a, b) => b.percentage - a.percentage)
}

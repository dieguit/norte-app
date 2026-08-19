import { formatCalendarMonth } from '../../../../lib/format'
import type { GoalPriority, GoalWorkspaceItem } from '../../../../features/goals/goals'

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

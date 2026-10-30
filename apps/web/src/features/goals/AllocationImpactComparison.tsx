import { formatCalendarMonth } from '../../lib/format'
import type { GoalProjection } from './goals'
import type { Money } from '../../lib/money'

function formatGoalProjection(projection: GoalProjection): string {
  switch (projection.status) {
    case 'available':
      return formatCalendarMonth(projection.completionMonth)
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

export type AllocationImpactBefore =
  | { status: 'not_created' }
  | { status: 'existing'; projection: GoalProjection; allocatedMonthlyAmounts?: Money[] }

export interface AllocationImpactItem {
  goalId: string
  goalName: string
  before: AllocationImpactBefore
  after: GoalProjection
}

export interface AllocationImpactComparisonProps {
  impacts: AllocationImpactItem[]
  beforeNotCreatedLabel?: string
}

export function AllocationImpactComparison({
  impacts,
  beforeNotCreatedLabel,
}: AllocationImpactComparisonProps) {
  if (!impacts || impacts.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-3">
      {impacts.map((impact) => {
        const beforeText =
          impact.before.status === 'not_created'
            ? (beforeNotCreatedLabel ?? 'Objetivo todavía no creado')
            : formatGoalProjection(impact.before.projection)

        return (
          <div
            key={impact.goalId}
            className="flex flex-col gap-2.5 rounded-lg border border-border bg-muted/40 p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">
                {impact.goalName}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="flex flex-col gap-0.5 rounded-lg bg-background p-2.5 border border-border">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Antes
                </span>
                <p className="text-sm font-medium text-muted-foreground">
                  {beforeText}
                </p>
              </div>

              <div className="flex flex-col gap-0.5 rounded-lg bg-muted/40 p-2.5 border border-border">
                <span className="text-xs font-semibold text-accent-brand uppercase tracking-wider">
                  Con este cambio
                </span>
                <p className="text-sm font-semibold text-foreground">
                  {formatGoalProjection(impact.after)}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

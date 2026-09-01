import { CircleCheck } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import type { GoalWorkspaceItem } from '../../../features/goals/goals'
import { formatMoney } from '../../../lib/format'

export interface GoalCompletionBannerProps {
  goal: GoalWorkspaceItem
  onComplete: (goalId: string) => void
}

export function GoalCompletionBanner({ goal, onComplete }: GoalCompletionBannerProps) {
  return (
    <section
      aria-labelledby={`completion-banner-heading-${goal.id}`}
      className="rounded-2xl border border-[var(--lagoon-deep)]/25 bg-[var(--lagoon)]/35 p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <CircleCheck className="mt-0.5 size-5 shrink-0 text-[var(--lagoon-deep)]" aria-hidden="true" />
          <div>
            <h2
              id={`completion-banner-heading-${goal.id}`}
              className="font-semibold text-[var(--sea-ink)]"
            >
              Ya tenés los ahorros necesarios para {goal.name}
            </h2>
            <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
              Alcanzaste el monto planificado de {formatMoney(goal.targetAmount!)}.
            </p>
          </div>
        </div>
        <Button type="button" onClick={() => onComplete(goal.id)} className="w-full sm:w-auto">
          Marcar como cumplido
        </Button>
      </div>
    </section>
  )
}

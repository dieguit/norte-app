import { Link } from '@tanstack/react-router'
import { Badge } from '../../../../components/ui/badge'
import { formatMoney, formatPercentage } from '../../../../lib/format'
import {
  type GoalsWorkspace as GoalsWorkspaceType,
  type GoalWorkspaceItem,
} from '../../../../features/goals/goals'
import { GOAL_PRIORITY_LABELS, getGoalProjectionDisplay } from './goal-display'

export interface GoalsWorkspaceProps {
  workspace: GoalsWorkspaceType
}

function GoalCard({ goal }: { goal: GoalWorkspaceItem }) {
  const projectionText = getGoalProjectionDisplay(goal)
  const isCompleted = goal.status === 'completed'
  const isPaused = goal.status === 'paused'
  const planSectionLabel = goal.status === 'active' ? 'Plan mensual' : 'Último plan'

  return (
    <article
      aria-labelledby={`goal-heading-${goal.id}`}
      className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm transition-shadow motion-reduce:transition-none hover:shadow-md sm:p-8"
    >
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-3">
          <h3 id={`goal-heading-${goal.id}`} className="font-serif text-2xl font-bold text-[var(--sea-ink)]">
            <Link
              to="/app/goals/$goalId"
              params={{ goalId: goal.id }}
              id={`goal-link-${goal.id}`}
              aria-label={`Ver ${goal.name}`}
              className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lagoon)] rounded-sm"
            >
              {goal.name}
            </Link>
          </h3>
          <Badge variant="outline" className="text-xs">
            {GOAL_PRIORITY_LABELS[goal.priority]}
          </Badge>
        </div>

        <div className="text-xs text-[var(--sea-ink-soft)]">
          {isCompleted ? (
            <span>
              {goal.completedAt ? `Completado en ${projectionText}` : projectionText}
            </span>
          ) : isPaused ? (
            <span>{projectionText}</span>
          ) : (
            <span>
              Fecha proyectada: <span className="font-medium text-[var(--sea-ink)]">{projectionText}</span>
            </span>
          )}
        </div>
      </div>

      {/* Target & Actual values */}
      <div className="mt-6 grid grid-cols-1 gap-4 border-t border-[var(--line)] pt-6 sm:grid-cols-2">
        <div aria-label={`Valor actual de ${goal.name}`}>
          <div className="text-xs text-[var(--sea-ink-soft)]">Valor actual</div>
          <div className="mt-1 text-2xl font-bold text-[var(--sea-ink)]">
            {formatMoney(goal.actualValue)}
          </div>
        </div>

        <div>
          <div className="text-xs text-[var(--sea-ink-soft)]">Monto objetivo</div>
          <div className="mt-1 text-2xl font-bold text-[var(--sea-ink)]">
            {goal.targetAmount ? formatMoney(goal.targetAmount) : 'Objetivo por calcular'}
          </div>
        </div>
      </div>

      {/* Progress Bar (when target is known) */}
      {goal.targetAmount && goal.progressPercentage && (
        <div className="mt-4 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-[var(--sea-ink-soft)]">
            <span>Progreso</span>
            <span className="font-semibold text-[var(--sea-ink)]">
              {formatPercentage(goal.progressPercentage, 1)}
            </span>
          </div>
          <progress
            max={100}
            value={Math.min(Number(goal.progressPercentage), 100)}
            aria-label={`Progreso de ${goal.name}`}
            className="h-2 w-full overflow-hidden rounded-full bg-[var(--foam)] accent-[var(--lagoon)] [&::-webkit-progress-bar]:bg-[var(--foam)] [&::-webkit-progress-value]:bg-[var(--lagoon)] [&::-moz-progress-bar]:bg-[var(--lagoon)]"
          />
        </div>
      )}

      {/* Funding Rows */}
      {goal.funding.length > 0 && (
        <div className="mt-6 border-t border-[var(--line)] pt-6" aria-label={`Plan de ${goal.name}`}>
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)]">
            {planSectionLabel}
          </div>
          <div className="mt-3 flex flex-col gap-2.5">
            {goal.funding.map((row) => {
              const methodLabel = `${row.fundingMethod === 'save' ? 'Ahorrar' : 'Invertir'} ${row.destinationCurrency}`
              const percentageLabel = `${Number(row.percentage)}%`
              const isPausedRow = row.commitmentStatus === 'paused'
              const hasCommitment = row.monthlyCommitment !== undefined && row.allocatedDestinationAmount !== undefined

              return (
                <div
                  key={row.channelId}
                  className="flex flex-col justify-between gap-1 rounded-xl bg-[var(--foam)] px-4 py-2.5 text-sm sm:flex-row sm:items-center border border-[var(--line)]/50"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--sea-ink)]">{methodLabel}</span>
                    <span className="rounded-md bg-white px-2 py-0.5 text-xs font-medium text-[var(--sea-ink-soft)] border border-[var(--line)]">
                      {percentageLabel}
                    </span>
                    {isPausedRow && (
                      <Badge variant="outline" className="text-[10px] text-amber-800 border-amber-300 bg-amber-50">
                        Pausado
                      </Badge>
                    )}
                  </div>

                  <div className="text-xs text-[var(--sea-ink-soft)] sm:text-right">
                    {hasCommitment ? (
                      isPausedRow ? (
                        <span className="font-medium text-[var(--sea-ink-soft)]">
                          Plan pausado: {formatMoney(row.allocatedDestinationAmount!)}
                        </span>
                      ) : (
                        <span className="font-medium text-[var(--sea-ink)]">
                          Plan: {formatMoney(row.allocatedDestinationAmount!)}
                        </span>
                      )
                    ) : (
                      <span className="italic text-[var(--sea-ink-soft)]">Sin aporte mensual</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </article>
  )
}

export function GoalsWorkspace({ workspace }: GoalsWorkspaceProps) {
  const nonEmptyGroups = workspace.groups.filter((group) => group.goals.length > 0)

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-12">
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-[var(--sea-ink)] sm:text-4xl">
          Objetivos
        </h1>
        <p className="mt-2 text-base leading-relaxed text-[var(--sea-ink-soft)]">
          Administrá tus metas financieras y su asignación mensual.
        </p>
      </div>

      <div className="flex flex-col gap-10">
        {nonEmptyGroups.map((group) => {
          const groupTitle =
            group.status === 'active'
              ? 'Activos'
              : group.status === 'paused'
                ? 'Pausados'
                : 'Completados'

          return (
            <section
              key={group.status}
              aria-labelledby={`group-heading-${group.status}`}
              className="flex flex-col gap-4"
            >
              <h2
                id={`group-heading-${group.status}`}
                className="font-serif text-2xl font-bold text-[var(--sea-ink)]"
              >
                {groupTitle}
              </h2>
              <div className="flex flex-col gap-6">
                {group.goals.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

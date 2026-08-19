import { Badge } from '../../../../components/ui/badge'
import { formatCalendarMonth, formatMoney, formatPercentage } from '../../../../lib/format'
import { PLANNING_ARS_PER_USD, PROJECTION_HORIZON_MONTHS } from '../../../../features/financial/financial'
import {
  GOAL_STATUS_LABELS,
  type GoalWorkspaceItem,
  type InvestmentAvailability,
} from '../../../../features/goals/goals'
import { GOAL_PRIORITY_LABELS, getGoalProjectionDisplay } from './goal-display'

export interface GoalDetailProps {
  goal: GoalWorkspaceItem
}

function getAvailabilityDisplay(
  availability?: InvestmentAvailability,
  availableFrom?: string,
): string {
  if (!availability) return 'No especificada'
  switch (availability) {
    case 'available_now':
      return 'Disponible ahora'
    case 'available_from':
      return availableFrom
        ? `Disponible a partir de ${formatCalendarMonth(availableFrom)}`
        : 'Disponible a futuro'
    case 'long_term':
      return 'Largo plazo'
  }
}

function getDeltaComparisonDisplay(delta?: number): string | null {
  if (delta === undefined) return null
  if (delta === 0) return 'Mismo mes que la fecha deseada'
  const absDelta = Math.abs(delta)
  const unit = absDelta === 1 ? 'mes' : 'meses'
  return delta < 0
    ? `${absDelta} ${unit} antes de la fecha deseada`
    : `${absDelta} ${unit} después de la fecha deseada`
}

export function GoalDetail({ goal }: GoalDetailProps) {
  const isCompleted = goal.status === 'completed'
  const isActive = goal.status === 'active'

  const planSectionId = isActive ? 'plan-heading' : 'ultimo-plan-heading'
  const planSectionTitle = isActive ? 'Plan' : 'Último plan'

  const projectionText = getGoalProjectionDisplay(goal)
  const deltaText = getDeltaComparisonDisplay(goal.desiredDateDeltaMonths)
  const availabilityText = getAvailabilityDisplay(goal.availability, goal.availableFrom)

  const planningRateDisclosure = `1 USD = ${Number(PLANNING_ARS_PER_USD).toLocaleString('es-AR')} ARS`

  return (
    <div className="flex flex-col gap-6 py-2">
      {/* 1. Resumen Section */}
      <section
        aria-labelledby="resumen-heading"
        className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6 shadow-sm"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
          <h2 id="resumen-heading" className="text-lg font-bold text-[var(--sea-ink)]">
            Resumen
          </h2>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {GOAL_STATUS_LABELS[goal.status]}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {GOAL_PRIORITY_LABELS[goal.priority]}
            </Badge>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-[var(--sea-ink-soft)]">Fecha deseada</dt>
            <dd className="mt-0.5 text-sm font-semibold text-[var(--sea-ink)]">
              {goal.desiredDate ? formatCalendarMonth(goal.desiredDate.slice(0, 7)) : 'Sin fecha deseada'}
            </dd>
          </div>

          <div>
            <dt className="text-xs text-[var(--sea-ink-soft)]">
              {isCompleted ? 'Fecha de completado' : 'Fecha proyectada'}
            </dt>
            <dd className="mt-0.5 text-sm font-semibold text-[var(--sea-ink)]">
              {projectionText}
            </dd>
          </div>

          {deltaText && (
            <div className="sm:col-span-2 rounded-xl bg-[var(--foam)] px-3.5 py-2 border border-[var(--line)]/60">
              <dt className="text-xs text-[var(--sea-ink-soft)]">Comparación con objetivo</dt>
              <dd className="mt-0.5 text-sm font-medium text-[var(--sea-ink)]">
                {deltaText}
              </dd>
            </div>
          )}

          <div>
            <dt className="text-xs text-[var(--sea-ink-soft)]">Monto objetivo</dt>
            <dd className="mt-0.5 text-lg font-bold text-[var(--sea-ink)]">
              {goal.targetAmount ? formatMoney(goal.targetAmount) : 'Objetivo por calcular'}
            </dd>
          </div>

          <div>
            <dt className="text-xs text-[var(--sea-ink-soft)]">Total actual</dt>
            <dd className="mt-0.5 text-lg font-bold text-[var(--sea-ink)]">
              {formatMoney(goal.actualValue)}
            </dd>
          </div>

          {goal.targetAmount && goal.progressPercentage && (
            <div className="sm:col-span-2 flex flex-col gap-1.5 pt-1">
              <div className="flex items-center justify-between text-xs text-[var(--sea-ink-soft)]">
                <dt>Progreso</dt>
                <dd className="font-semibold text-[var(--sea-ink)]">
                  {formatPercentage(goal.progressPercentage, 1)}
                </dd>
              </div>
              <progress
                max={100}
                value={Math.min(Number(goal.progressPercentage), 100)}
                aria-label={`Progreso de ${goal.name}`}
                className="h-2 w-full overflow-hidden rounded-full bg-[var(--foam)] accent-[var(--lagoon)] [&::-webkit-progress-bar]:bg-[var(--foam)] [&::-webkit-progress-value]:bg-[var(--lagoon)] [&::-moz-progress-bar]:bg-[var(--lagoon)]"
              />
            </div>
          )}
        </dl>
      </section>

      {/* 2. Valor actual Section */}
      <section
        aria-labelledby="valor-actual-heading"
        className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6 shadow-sm"
      >
        <h2 id="valor-actual-heading" className="text-lg font-bold text-[var(--sea-ink)] border-b border-[var(--line)] pb-4">
          Valor actual
        </h2>

        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-[var(--foam)] p-3.5 border border-[var(--line)]/60">
            <dt className="text-xs text-[var(--sea-ink-soft)]">Ahorros</dt>
            <dd className="mt-1 text-base font-bold text-[var(--sea-ink)]">
              {formatMoney(goal.savingsValue)}
            </dd>
          </div>

          <div className="rounded-xl bg-[var(--foam)] p-3.5 border border-[var(--line)]/60">
            <dt className="text-xs text-[var(--sea-ink-soft)]">Inversiones</dt>
            <dd className="mt-1 text-base font-bold text-[var(--sea-ink)]">
              {formatMoney(goal.investmentValue)}
            </dd>
          </div>
        </dl>
      </section>

      {/* 3. Plan / Último plan Section */}
      <section
        aria-labelledby={planSectionId}
        className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6 shadow-sm"
      >
        <h2 id={planSectionId} className="text-lg font-bold text-[var(--sea-ink)] border-b border-[var(--line)] pb-4">
          {planSectionTitle}
        </h2>

        {goal.funding.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--sea-ink-soft)]">
            Sin canales asignados
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {goal.funding.map((row) => {
              const methodLabel = `${row.fundingMethod === 'save' ? 'Ahorrar' : 'Invertir'} ${row.destinationCurrency}`
              const percentageLabel = `${Number(row.percentage)}%`
              const isPaused = row.commitmentStatus === 'paused'
              const hasCommitment = row.monthlyCommitment !== undefined && row.allocatedDestinationAmount !== undefined

              return (
                <div
                  key={row.channelId}
                  className="flex flex-col gap-2 rounded-xl bg-[var(--foam)] p-4 border border-[var(--line)]/60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-[var(--sea-ink)]">
                        {methodLabel}
                      </span>
                      {isPaused && (
                        <Badge variant="outline" className="text-[10px] text-amber-800 border-amber-300 bg-amber-50">
                          Pausado
                        </Badge>
                      )}
                    </div>
                    <span className="rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-[var(--sea-ink-soft)] border border-[var(--line)]">
                      {percentageLabel}
                    </span>
                  </div>

                  <dl className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2 text-xs">
                    <div>
                      <dt className="text-[var(--sea-ink-soft)]">Aporte mensual</dt>
                      <dd className="mt-0.5 font-medium text-[var(--sea-ink)]">
                        {row.monthlyCommitment ? formatMoney(row.monthlyCommitment) : 'Sin aporte mensual'}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-[var(--sea-ink-soft)]">Monto asignado</dt>
                      <dd className="mt-0.5 font-medium text-[var(--sea-ink)]">
                        {hasCommitment ? (
                          isPaused ? (
                            <span>{formatMoney(row.allocatedDestinationAmount!)} (pausado)</span>
                          ) : (
                            formatMoney(row.allocatedDestinationAmount!)
                          )
                        ) : (
                          'Sin aporte mensual'
                        )}
                      </dd>
                    </div>

                    <div className="sm:col-span-2">
                      <dt className="text-[var(--sea-ink-soft)]">Vigencia</dt>
                      <dd className="mt-0.5 font-medium text-[var(--sea-ink)]">
                        Desde {formatCalendarMonth(row.effectiveMonth)}
                      </dd>
                    </div>
                  </dl>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* 4. Supuestos Section */}
      <section
        aria-labelledby="supuestos-heading"
        className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6 shadow-sm"
      >
        <h2 id="supuestos-heading" className="text-lg font-bold text-[var(--sea-ink)] border-b border-[var(--line)] pb-4">
          Supuestos
        </h2>

        <dl className="mt-4 flex flex-col gap-4">
          {goal.usesPlanningRate && (
            <div className="rounded-xl bg-[var(--foam)] p-3.5 border border-[var(--line)]/60">
              <dt className="text-xs text-[var(--sea-ink-soft)]">Tipo de cambio de planificación</dt>
              <dd className="mt-1 text-sm font-semibold text-[var(--sea-ink)]">
                {planningRateDisclosure}
              </dd>
            </div>
          )}

          {goal.investEnabled && (
            <>
              <div className="rounded-xl bg-[var(--foam)] p-3.5 border border-[var(--line)]/60">
                <dt className="flex items-center justify-between gap-2 text-xs text-[var(--sea-ink-soft)]">
                  <span>Retorno anual de inversiones</span>
                  <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)] border border-[var(--line)]">
                    Estimación
                  </span>
                </dt>
                <dd className="mt-1 text-sm font-semibold text-[var(--sea-ink)]">
                  {goal.annualReturnRate !== undefined
                    ? `${formatPercentage(goal.annualReturnRate, 1)} anual`
                    : 'Supuesto no disponible'}
                </dd>
              </div>

              <div className="rounded-xl bg-[var(--foam)] p-3.5 border border-[var(--line)]/60">
                <dt className="text-xs text-[var(--sea-ink-soft)]">Disponibilidad</dt>
                <dd className="mt-1 text-sm font-semibold text-[var(--sea-ink)]">
                  {availabilityText}
                </dd>
              </div>
            </>
          )}

          <div className="rounded-xl bg-[var(--foam)] p-3.5 border border-[var(--line)]/60">
            <dt className="text-xs text-[var(--sea-ink-soft)]">Horizonte de proyección</dt>
            <dd className="mt-1 text-sm text-[var(--sea-ink)]">
              {PROJECTION_HORIZON_MONTHS} meses (60 años). Las proyecciones contemplan un plazo máximo de simulación de {PROJECTION_HORIZON_MONTHS} meses.
            </dd>
          </div>
        </dl>
      </section>
    </div>
  )
}

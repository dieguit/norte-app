import { useState } from 'react'
import { Button } from '../../../components/ui/button'
import { formatCalendarMonth, formatMoney } from '../../../lib/format'
import {
  PLANNING_ARS_PER_USD,
  type InitialHomeState,
} from '../../../features/financial/financial'
import { ContributionActionSheet } from './ContributionActionSheet'

export interface HomeProps {
  home: InitialHomeState
}

export function Home({ home }: HomeProps) {
  const [isContributionOpen, setIsContributionOpen] = useState(false)

  const isUnknownExpensesEmergency =
    home.goal.type === 'emergency_fund' && home.projection.status === 'unknown_expenses'

  const channelLabel = `${home.plan.fundingMethod === 'save' ? 'Ahorrar' : 'Invertir'} ${home.plan.destinationCurrency}`
  const projectionLabel =
    home.projection.status === 'available'
      ? formatCalendarMonth(home.projection.completionMonth)
      : home.projection.status === 'unknown_expenses'
        ? 'Fecha por calcular'
        : 'No alcanzado dentro del horizonte'

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-12">
      {/* Top Header */}
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-[var(--sea-ink)] sm:text-4xl">
          Tu plan está empezando a tomar forma
        </h1>
        <p className="mt-2 text-base leading-relaxed text-[var(--sea-ink-soft)]">
          Acá vas a ver el resumen de tu planificación inicial y los próximos pasos para tu patrimonio.
        </p>
      </div>

      <div className="flex items-center">
        <Button type="button" onClick={() => setIsContributionOpen(true)}>
          + Registrar
        </Button>
      </div>
      <ContributionActionSheet open={isContributionOpen} onOpenChange={setIsContributionOpen} />

      {/* Tu Plan Section (Trajectory First) */}
      <section
        aria-labelledby="plan-heading"
        className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)] sm:p-8"
      >
        <div className="flex flex-col justify-between gap-4 border-b border-[var(--line)] pb-6 sm:flex-row sm:items-center">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--palm)]">
              Objetivo principal
            </div>
            <h2 className="mt-1 font-serif text-2xl font-bold text-[var(--sea-ink)]">
              {home.goal.name}
            </h2>
          </div>

          {home.goal.targetAmount && (
            <div className="text-left sm:text-right">
              <div className="text-xs text-[var(--sea-ink-soft)]">Monto objetivo</div>
              <div className="text-2xl font-bold text-[var(--sea-ink)]">
                {formatMoney(home.goal.targetAmount)}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6">
          <h3 id="plan-heading" className="font-serif text-xl font-bold text-[var(--sea-ink)]">
            Tu Plan
          </h3>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <div>
              <div className="text-sm font-semibold text-[var(--sea-ink)]">{channelLabel}</div>
              <div className="mt-1 text-sm text-[var(--sea-ink-soft)]">
                {formatMoney(home.plan.monthlyCommitment)} por mes
              </div>
              {home.plan.destinationCurrency !== home.plan.monthlyCommitment.currency && (
                <>
                  <div className="text-sm text-[var(--sea-ink-soft)]">
                    {formatMoney(home.plan.destinationAmount)} estimados por mes
                  </div>
                  <div className="mt-2 text-xs text-[var(--sea-ink-soft)]">
                    1 USD = {Number(PLANNING_ARS_PER_USD).toLocaleString('es-AR')} ARS
                  </div>
                </>
              )}
              <div className="mt-3">
                <span className="inline-flex items-center rounded-md bg-[var(--foam)] px-2.5 py-1 text-xs font-medium text-[var(--sea-ink)] border border-[var(--line)]">
                  {Number(home.plan.allocationPercentage)}% asignado a este objetivo
                </span>
              </div>
            </div>
            <div className="text-sm text-[var(--sea-ink-soft)]">
              <div>Desde {formatCalendarMonth(home.plan.effectiveMonth)}</div>
              <div className="mt-1">
                Fecha proyectada: <span className="font-medium text-[var(--sea-ink)]">{projectionLabel}</span>
              </div>
            </div>
          </div>
        </div>

        {isUnknownExpensesEmergency && (
          <div className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--foam)] p-5">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-[var(--sea-ink)]">
                  Necesitamos conocer mejor tus gastos para calcular cuánto necesitás.
                </p>
                <span className="inline-flex shrink-0 items-center rounded-full bg-[var(--surface-strong)] px-3 py-1 text-xs font-semibold text-[var(--sea-ink-soft)] border border-[var(--line)]">
                  Fecha por calcular
                </span>
              </div>

              <div className="border-t border-[var(--line)]/60 pt-4">
                <div className="text-sm font-semibold text-[var(--sea-ink)]">
                  Agregar mis gastos principales
                </div>
                <p className="mt-1 text-xs text-[var(--sea-ink-soft)]">
                  Podés comenzar identificando rubros frecuentes:
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {['Alquiler', 'Obra social', 'Servicios', 'Suscripciones'].map((item) => (
                    <span
                      key={item}
                      className="rounded-lg border border-[var(--line)] bg-white px-2.5 py-1 text-xs font-medium text-[var(--sea-ink-soft)]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Tus avances Section */}
      <section
        aria-labelledby="progress-heading"
        className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm sm:p-8"
      >
        <h2 id="progress-heading" className="font-serif text-2xl font-bold text-[var(--sea-ink)]">
          Tus avances
        </h2>
        <div className="mt-3 text-xl font-bold text-[var(--sea-ink)]">
          {formatMoney(home.goal.currentAmount)}
        </div>
        <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
          Todavía no registraste aportes
        </p>
      </section>

      {/* Supporting Context: Ingresos y Gastos */}
      <section aria-label="Resumen de planificación">
        <div className="text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)] mb-3">
          Contexto de ingresos y gastos
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)]">
              Ingresos mensuales
            </div>
            <div className="mt-2 text-xl font-bold text-[var(--sea-ink)]">
              {formatMoney(home.income)}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)]">
              Gastos mensuales
            </div>
            <div className="mt-2 text-xl font-bold text-[var(--sea-ink)]">
              {home.expenses ? formatMoney(home.expenses) : 'Todavía no sabemos'}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

import { formatMoney } from '../lib/format'
import type { InitialHomeState } from './financial.server'

export interface HomeProps {
  home: InitialHomeState
}

export function Home({ home }: HomeProps) {
  const isUnknownExpensesEmergency =
    home.goal.type === 'emergency_fund' && home.projectionState === 'unknown_expenses'

  const formattedTarget = home.goal.targetAmount
    ? formatMoney(home.goal.targetAmount)
    : 'Fecha por calcular'

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

      {/* Planning Summary Cards */}
      <section aria-label="Resumen de planificación">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)]">
              Ingresos mensuales
            </div>
            <div className="mt-2 text-xl font-bold text-[var(--sea-ink)]">
              {formatMoney(home.income)}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)]">
              Gastos mensuales
            </div>
            <div className="mt-2 text-xl font-bold text-[var(--sea-ink)]">
              {home.expenses ? formatMoney(home.expenses) : 'Todavía no sabemos'}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)]">
              Aporte planificado
            </div>
            <div className="mt-2 text-xl font-bold text-[var(--palm)]">
              {formatMoney(home.plannedContribution)}
            </div>
          </div>
        </div>
      </section>

      {/* Selected Goal Section */}
      <section aria-label="Objetivo principal">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow-card)] sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
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
        </div>
      </section>

      {/* Visible Roadmap Row */}
      <section aria-label="Hoja de ruta inicial">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-6 shadow-sm sm:p-8">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)]">
            Hoja de ruta inicial
          </h3>
          <div className="mt-4 flex items-center justify-between rounded-xl border border-[var(--line)] bg-white/60 p-4">
            <div className="flex items-center gap-2 font-medium text-[var(--sea-ink)]">
              <span>{home.goal.name}</span>
              <span className="text-[var(--sea-ink-soft)]">—</span>
              <span className="font-semibold">{formattedTarget}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

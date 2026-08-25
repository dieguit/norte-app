import { Link } from "@tanstack/react-router";
import { formatCalendarMonth, formatMoney } from "../../../../lib/format";
import { type GoalsFinancialSummary as GoalsFinancialSummaryType } from "../../../../features/goals/goals";
import { Button } from "../../../../components/ui/button";
import { Slider } from "../../../../components/ui/slider";

export interface GoalsFinancialSummaryProps {
  summary: GoalsFinancialSummaryType;
  onChangePlanning?: () => void;
}

export function GoalsFinancialSummary({
  summary,
  onChangePlanning,
}: GoalsFinancialSummaryProps) {
  const hasPositiveBalance = Number(summary.balance.amount) > 0;

  return (
    <section
      aria-label="Resumen mensual para objetivos"
      className="grid gap-4 lg:grid-cols-2"
    >
      <article className="flex flex-col justify-between gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-5 shadow-[var(--shadow-card)]">
        <div>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[var(--sea-ink-soft)]">
              Finanzas de {formatCalendarMonth(summary.month)}
            </h2>
            <Link
              to="/app/finances"
              className="text-sm font-semibold text-[var(--lagoon-deep)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lagoon)]"
            >
              Ver finanzas
            </Link>
          </div>
          <dl className="mt-4 flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm">
              <dt className="text-[var(--sea-ink-soft)]">Ingresos</dt>
              <dd className="font-semibold tabular-nums text-[var(--sea-ink)]">
                {formatMoney(summary.income)}
              </dd>
            </div>
            <div className="flex items-center justify-between text-sm">
              <dt className="text-[var(--sea-ink-soft)]">Gastos</dt>
              <dd className="font-semibold tabular-nums text-[var(--sea-ink)]">
                {formatMoney(summary.expenses)}
              </dd>
            </div>
            <div className="flex items-center justify-between border-t border-[var(--line)] pt-2 text-sm">
              <dt className="font-semibold text-[var(--sea-ink)]">Balance</dt>
              <dd className="font-bold tabular-nums text-[var(--sea-ink)]">
                {formatMoney(summary.balance)}
              </dd>
            </div>
          </dl>
        </div>
        {!hasPositiveBalance && (
          <p className="text-xs text-[var(--sea-ink-soft)]">
            Sin saldo disponible este mes
          </p>
        )}
      </article>

      <article className="flex flex-col justify-between gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[var(--sea-ink-soft)]">
              Aporte mensual a objetivos
            </h2>
            <span className="font-semibold tabular-nums text-[var(--sea-ink)]">
              {summary.dedicationPercentage}%
            </span>
          </div>
          <Slider
            aria-label="Porcentaje destinado a objetivos"
            value={[Number(summary.dedicationPercentage)]}
            min={0}
            max={100}
            step={1}
            disabled
          />
          <p className="text-sm text-[var(--sea-ink-soft)]">
            {summary.dedicationPercentage}% · aproximadamente{" "}
            {formatMoney(summary.contribution)}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onChangePlanning}
          disabled={!hasPositiveBalance}
          className="self-start"
        >
          Cambiar planificación de objetivos
        </Button>
      </article>
    </section>
  );
}

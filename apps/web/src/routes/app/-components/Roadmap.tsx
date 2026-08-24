import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "../../../components/ui/button";
import type {
  RoadmapData,
  RoadmapMonth,
} from "../../../features/roadmap/roadmap";
import { FIXED_EXPENSE_SOURCES } from "../../../features/financial/expenses";
import { FIXED_INCOME_SOURCES } from "../../../features/financial/incomes";
import type { GoalWorkspaceItem } from "../../../features/goals/goals";
import { formatCalendarMonth, formatMoney } from "../../../lib/format";

const projectionReason = (goal: GoalWorkspaceItem) => {
  if (goal.status === "paused" || goal.projection.status === "plan_paused")
    return "Proyección pausada";
  switch (goal.projection.status) {
    case "target_unavailable":
      return "Objetivo por calcular";
    case "commitment_absent":
      return "Sin aporte mensual";
    case "no_future_allocation":
      return "Sin asignación futura";
    case "investment_assumption_unavailable":
      return "Supuesto de inversión no disponible";
    case "outside_horizon":
      return "No alcanzado dentro del horizonte";
    case "available":
      return formatCalendarMonth(goal.projection.completionMonth);
  }
};

const incomeLabel = (income: RoadmapMonth["oneTimeIncomes"][number]) =>
  income.sourceKind === "custom"
    ? income.sourceName
    : (FIXED_INCOME_SOURCES[
        income.sourceKind as keyof typeof FIXED_INCOME_SOURCES
      ] ?? income.sourceName);

const expenseLabel = (expense: RoadmapMonth["oneTimeExpenses"][number]) =>
  expense.sourceKind === "custom"
    ? expense.sourceName
    : (FIXED_EXPENSE_SOURCES[
        expense.sourceKind as keyof typeof FIXED_EXPENSE_SOURCES
      ] ?? expense.sourceName);

function RecordGroup<
  T extends { id: string; amount: string; currency: "ARS" | "USD" },
>({
  title,
  items,
  getLabel,
  titleClassName = "text-[var(--sea-ink-soft)]",
}: {
  title: string;
  items: T[];
  getLabel: (item: T) => string;
  titleClassName?: string;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p
        className={`text-[0.65rem] font-semibold uppercase tracking-wider ${titleClassName}`}
      >
        {title}
      </p>
      <ul className="mt-2 flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="min-w-0 rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] p-3 text-xs sm:text-sm"
          >
            <span className="block break-words text-[var(--sea-ink-soft)]">
              {getLabel(item)}
            </span>
            <strong className="mt-1 block break-words tabular-nums text-[var(--sea-ink)]">
              {formatMoney({ amount: item.amount, currency: item.currency })}
            </strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MonthGroup({
  group,
  kind,
}: {
  group: RoadmapMonth;
  kind: "future" | "today" | "history";
}) {
  const label = formatCalendarMonth(group.month);
  const isGoalMonth = group.objectives.length > 0;
  const recurringExpenses = isGoalMonth ? [] : group.recurringExpenses;
  const recurringIncomes = isGoalMonth ? [] : group.recurringIncomes;
  const hasSideContent =
    group.oneTimeExpenses.length > 0 ||
    recurringExpenses.length > 0 ||
    group.endingExpenses.length > 0 ||
    group.oneTimeIncomes.length > 0 ||
    recurringIncomes.length > 0 ||
    group.contributions.length > 0;

  return (
    <section
      aria-labelledby={`roadmap-${kind}-${group.month}`}
      className="relative flex flex-col gap-2 py-3"
    >
      <h3
        id={`roadmap-${kind}-${group.month}`}
        className="relative z-10 mx-auto rounded-full border border-[var(--line)] bg-[var(--sand)] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--palm)]"
      >
        {kind === "today" ? `Hoy · ${label}` : label}
      </h3>
      {group.objectives.length > 0 && (
        <div className="relative z-10 flex flex-col gap-3">
          {group.objectives.map((goal) => (
            <article
              key={goal.id}
              className="w-full rounded-2xl border border-[var(--line)] bg-white/90 p-4 text-center shadow-[var(--shadow-card)]"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--palm)]">
                Objetivo proyectado
              </p>
              <h4
                data-roadmap-objective="full-width"
                className="mt-1 font-serif text-xl font-bold text-[var(--sea-ink)]"
              >
                {goal.name}
              </h4>
            </article>
          ))}
        </div>
      )}
      {hasSideContent && (
        <div className="relative z-10 grid grid-cols-2 gap-6 sm:gap-10">
          <section
            data-side="left"
            aria-label={`Gastos previstos para ${label}`}
            className="flex min-w-0 flex-col gap-3 text-right"
          >
            <RecordGroup
              title="Gastos únicos"
              items={group.oneTimeExpenses}
              getLabel={expenseLabel}
              titleClassName="text-[var(--error)]"
            />
            <RecordGroup
              title="Gastos recurrentes"
              items={recurringExpenses}
              getLabel={expenseLabel}
              titleClassName="text-[var(--error)]"
            />
            <RecordGroup
              title="Finalizan este mes"
              items={group.endingExpenses}
              getLabel={expenseLabel}
            />
          </section>
          <section
            data-side="right"
            aria-label={`Ingresos y aportes para ${label}`}
            className="flex min-w-0 flex-col gap-3 text-left"
          >
            <RecordGroup
              title="Ingresos únicos"
              items={group.oneTimeIncomes}
              getLabel={incomeLabel}
              titleClassName="text-[var(--palm)]"
            />
            <RecordGroup
              title="Ingresos recurrentes"
              items={recurringIncomes}
              getLabel={incomeLabel}
              titleClassName="text-[var(--palm)]"
            />
            <RecordGroup
              title="Aportes registrados"
              items={group.contributions}
              getLabel={(contribution) =>
                contribution.kind === "investment" ? "Inversión" : "Ahorro"
              }
            />
          </section>
        </div>
      )}
    </section>
  );
}

export function Roadmap({ roadmap }: { roadmap: RoadmapData }) {
  const [visibleHistoryCount, setVisibleHistoryCount] = useState(1);
  const visibleHistory = roadmap.historyMonths.slice(0, visibleHistoryCount);
  const nextHistory = roadmap.historyMonths[visibleHistoryCount];
  const hasActivity =
    roadmap.undatedObjectives.length > 0 ||
    roadmap.futureMonths.length > 0 ||
    roadmap.currentMonth.objectives.length > 0 ||
    roadmap.currentMonth.oneTimeExpenses.length > 0 ||
    roadmap.currentMonth.recurringExpenses.length > 0 ||
    roadmap.currentMonth.endingExpenses.length > 0 ||
    roadmap.currentMonth.oneTimeIncomes.length > 0 ||
    roadmap.currentMonth.recurringIncomes.length > 0 ||
    roadmap.currentMonth.contributions.length > 0 ||
    roadmap.historyMonths.length > 0;

  return (
    <section
      aria-labelledby="roadmap-heading"
      className="mx-auto w-full max-w-lg"
    >
      <header>
        <h2
          id="roadmap-heading"
          className="font-serif text-3xl font-bold text-[var(--sea-ink)]"
        >
          Tu hoja de ruta
        </h2>
        <p className="mt-2 text-sm text-[var(--sea-ink-soft)]">
          Tu plan, tus aportes y los hitos que proyectan tus objetivos.
        </p>
      </header>
      {roadmap.undatedObjectives.length > 0 && (
        <section
          aria-labelledby="undated-objectives-heading"
          className="mt-8 flex flex-col gap-3"
        >
          <h3
            id="undated-objectives-heading"
            className="text-sm font-semibold text-[var(--sea-ink)]"
          >
            Sin fecha proyectada
          </h3>
          {roadmap.undatedObjectives.map((goal) => (
            <article
              key={goal.id}
              className="rounded-2xl border border-[var(--line)] bg-white/90 p-4"
            >
              <h4 className="font-semibold">{goal.name}</h4>
              <p className="text-sm text-[var(--sea-ink-soft)]">
                {projectionReason(goal)}
              </p>
            </article>
          ))}
          <Link
            to="/app/goals"
            className="text-sm font-semibold text-[var(--palm)] underline-offset-4 hover:underline"
          >
            Revisar objetivos
          </Link>
        </section>
      )}
      <div className="relative mt-8 before:absolute before:inset-y-0 before:left-1/2 before:-ml-[1px] before:border-l-2 before:border-dashed before:border-[var(--palm)]">
        {roadmap.futureMonths.map((month) => (
          <MonthGroup key={month.month} group={month} kind="future" />
        ))}
        <MonthGroup group={roadmap.currentMonth} kind="today" />
      </div>
      <div className="relative before:absolute before:inset-y-0 before:left-1/2 before:-ml-[1px] before:border-l-2 before:border-solid before:border-[var(--palm)]">
        <p className="relative z-10 mx-auto w-fit bg-[var(--sand)] px-2 text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)]">
          Historial
        </p>
        {visibleHistory.map((month) => (
          <MonthGroup key={month.month} group={month} kind="history" />
        ))}
      </div>
      {!hasActivity && (
        <div className="relative z-10 mx-auto mt-6 max-w-md rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 text-center">
          <p className="font-semibold">Tu hoja de ruta empieza hoy</p>
          <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
            Agregá tus finanzas u objetivos para ver cómo cambia tu camino.
          </p>
          <div className="mt-4 flex justify-center gap-4">
            <Link to="/app/finances">Ir a Finanzas</Link>
            <Link to="/app/goals">Ir a Objetivos</Link>
          </div>
        </div>
      )}
      {nextHistory && (
        <Button
          type="button"
          variant="outline"
          className="mx-auto mt-6 flex"
          onClick={() => setVisibleHistoryCount((count) => count + 1)}
        >
          Cargar {formatCalendarMonth(nextHistory.month)}
        </Button>
      )}
    </section>
  );
}

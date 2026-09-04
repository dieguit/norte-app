import { Link } from "@tanstack/react-router";
import BigNumber from "bignumber.js";
import { CircleCheck } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { FIXED_EXPENSE_SOURCES } from "../../../features/financial/expenses";
import { FIXED_INCOME_SOURCES } from "../../../features/financial/incomes";
import type { GoalWorkspaceItem } from "../../../features/goals/goals";
import type { RoadmapMonth } from "../../../features/roadmap/roadmap";
import { formatCalendarMonth, formatMoney } from "../../../lib/format";

function projectionReason(goal: GoalWorkspaceItem) {
  if (goal.status === "paused" || goal.projection.status === "plan_paused") {
    return "Proyección pausada";
  }
  if (goal.projection.status === "available") {
    return formatCalendarMonth(goal.projection.completionMonth);
  }
  return {
    target_unavailable: "Objetivo por calcular",
    commitment_absent: "Sin aporte mensual",
    no_future_allocation: "Sin asignación futura",
    investment_assumption_unavailable: "Supuesto de inversión no disponible",
    outside_horizon: "No alcanzado dentro del horizonte",
  }[goal.projection.status];
}

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

function groupRecords<
  T extends { amount: string; currency: "ARS" | "USD"; concept: string | null },
>(items: T[], getCategory: (item: T) => string) {
  const groups = new Map<
    string,
    {
      category: string;
      currency: T["currency"];
      total: BigNumber;
      concepts: Map<string, BigNumber>;
    }
  >();

  for (const item of items) {
    const category = getCategory(item);
    const key = `${category}\0${item.currency}`;
    const group = groups.get(key) ?? {
      category,
      currency: item.currency,
      total: new BigNumber(0),
      concepts: new Map(),
    };
    const concept = item.concept?.trim() || "Sin concepto";
    group.total = group.total.plus(item.amount);
    group.concepts.set(
      concept,
      group.concepts.get(concept)?.plus(item.amount) ?? new BigNumber(item.amount),
    );
    groups.set(key, group);
  }

  return [...groups.values()];
}

function FinancialRecordGroup<
  T extends { amount: string; currency: "ARS" | "USD"; concept: string | null },
>({
  title,
  items,
  getCategory,
  titleClassName = "text-[var(--sea-ink-soft)]",
}: {
  title: string;
  items: T[];
  getCategory: (item: T) => string;
  titleClassName?: string;
}) {
  if (items.length === 0) return null;
  const groups = groupRecords(items, getCategory);
  return (
    <div>
      <p
        className={`text-[0.65rem] font-semibold uppercase tracking-wider ${titleClassName}`}
      >
        {title}
      </p>
      <ul className="mt-2 flex flex-col gap-2">
        {groups.map((group) => (
          <li
            key={`${group.category}-${group.currency}`}
            className="min-w-0 rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] p-3 text-xs sm:text-sm"
          >
            <span className="block break-words font-semibold text-[var(--sea-ink)]">
              {group.category}
            </span>
            <strong className="mt-1 block break-words tabular-nums text-[var(--sea-ink)]">
              {formatMoney({
                amount: group.total.toFixed(2),
                currency: group.currency,
              })}
            </strong>
            <ul className="mt-2 border-t border-[var(--line)] pt-2">
              {[...group.concepts].map(([concept, total]) => (
                <li
                  key={concept}
                  className="flex justify-between gap-2 text-[var(--sea-ink-soft)]"
                >
                  <span className="min-w-0 break-words">{concept}</span>
                  <span className="shrink-0 tabular-nums">
                    {formatMoney({
                      amount: total.toFixed(2),
                      currency: group.currency,
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

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

function RoadmapObjectives({ objectives }: { objectives: RoadmapMonth["objectives"] }) {
  if (objectives.length === 0) return null;
  return (
    <div className="relative z-10 flex flex-col gap-3">
      {objectives.map((goal) => (
        <article
          key={goal.id}
          className={`w-full rounded-2xl border p-4 text-center shadow-[var(--shadow-card)] ${
            goal.status === "completed"
              ? "border-[var(--lagoon-deep)]/35 bg-[var(--lagoon)]/90"
              : "border-[var(--line)] bg-[var(--surface-strong)]"
          }`}
        >
          <p
            className={`flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${
              goal.status === "completed"
                ? "text-[var(--sea-ink)]"
                : "text-[var(--palm)]"
            }`}
          >
            {goal.status === "completed" && (
              <CircleCheck
                className="size-4 text-[var(--lagoon-deep)]"
                aria-hidden="true"
              />
            )}
            <span>
              {goal.status === "completed"
                ? "Objetivo completado"
                : "Objetivo proyectado"}
            </span>
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
  );
}

function RoadmapMonthRecords({ group, label }: { group: RoadmapMonth; label: string }) {
  return (
    <div className="relative z-10 grid grid-cols-2 gap-6 sm:gap-10">
      <section
        data-side="left"
        aria-label={`Gastos previstos para ${label}`}
        className="flex min-w-0 flex-col gap-3 text-right"
      >
        <FinancialRecordGroup
          title="Gastos únicos"
          items={group.oneTimeExpenses}
          getCategory={expenseLabel}
          titleClassName="text-[var(--error)]"
        />
        <FinancialRecordGroup
          title="Gastos recurrentes"
          items={group.recurringExpenses}
          getCategory={expenseLabel}
          titleClassName="text-[var(--error)]"
        />
        <FinancialRecordGroup
          title="Finalizan este mes"
          items={group.endingExpenses}
          getCategory={expenseLabel}
        />
      </section>
      <section
        data-side="right"
        aria-label={`Ingresos y aportes para ${label}`}
        className="flex min-w-0 flex-col gap-3 text-left"
      >
        <FinancialRecordGroup
          title="Ingresos únicos"
          items={group.oneTimeIncomes}
          getCategory={incomeLabel}
          titleClassName="text-[var(--palm)]"
        />
        <FinancialRecordGroup
          title="Ingresos recurrentes"
          items={group.recurringIncomes}
          getCategory={incomeLabel}
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
  const hasSideContent = [
    group.oneTimeExpenses,
    group.recurringExpenses,
    group.endingExpenses,
    group.oneTimeIncomes,
    group.recurringIncomes,
    group.contributions,
  ].some((items) => items.length > 0);

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
      <RoadmapObjectives objectives={group.objectives} />
      {hasSideContent && <RoadmapMonthRecords group={group} label={label} />}
    </section>
  );
}

export function RoadmapUndatedObjectives({
  objectives,
}: {
  objectives: GoalWorkspaceItem[];
}) {
  if (objectives.length === 0) return null;
  return (
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
      {objectives.map((goal) => (
        <article
          key={goal.id}
          className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-4"
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
  );
}

export function RoadmapTimeline({
  futureMonths,
  currentMonth,
}: {
  futureMonths: RoadmapMonth[];
  currentMonth: RoadmapMonth;
}) {
  return (
    <div className="relative mt-8 before:absolute before:inset-y-0 before:left-1/2 before:-ml-[1px] before:border-l-2 before:border-dashed before:border-[var(--palm)]">
      {futureMonths.map((month) => (
        <MonthGroup key={month.month} group={month} kind="future" />
      ))}
      <MonthGroup group={currentMonth} kind="today" />
    </div>
  );
}

export function RoadmapHistory({
  months,
}: {
  months: RoadmapMonth[];
}) {
  return (
    <div className="relative before:absolute before:inset-y-0 before:left-1/2 before:-ml-[1px] before:border-l-2 before:border-solid before:border-[var(--palm)]">
      <p className="relative z-10 mx-auto w-fit bg-[var(--sand)] px-2 text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)]">
        Historial
      </p>
      {months.map((month) => (
        <MonthGroup key={month.month} group={month} kind="history" />
      ))}
    </div>
  );
}

export function RoadmapEmptyState() {
  return (
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
  );
}

export function LoadMoreHistory({
  month,
  onLoad,
}: {
  month: string;
  onLoad: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className="mx-auto mt-6 flex"
      onClick={onLoad}
    >
      Cargar {formatCalendarMonth(month)}
    </Button>
  );
}

import { Link } from "@tanstack/react-router";
import { ArrowUpRight, PiggyBank } from "lucide-react";
import type { FinancesWorkspace } from "@repo/shared-types";
import { FlowBar } from "../../../../components/norte/FlowBar";
import { Money } from "../../../../components/norte/Money";
import {
  MiniRing,
  SectionIcon,
  SectionRow,
} from "../../../../components/norte/SectionRow";
import { isExpenseIncludedInMonth } from "../../../../features/financial/expenses";
import { isIncomeIncludedInMonth } from "../../../../features/financial/incomes";
import { formatPercentage } from "../../../../lib/format";
import { cn } from "../../../../lib/utils";
import { categoryTotals, plural, savingsTotals } from "./finances-summary";

export function FinancesSummary({
  workspace,
}: {
  workspace: FinancesWorkspace;
}) {
  const { month, summary, goalDedicationPercentage } = workspace;
  const balance = Number(summary.balance.amount);
  const overspent = balance < 0;
  const incomes = workspace.incomes.incomes.filter((income) =>
    isIncomeIncludedInMonth(income, month),
  );
  const expenses = workspace.expenses.expenses.filter((expense) =>
    isExpenseIncludedInMonth(expense, month),
  );
  const incomeTotals = categoryTotals(incomes);
  const expenseTotals = categoryTotals(expenses);
  const [savingsArs, savingsUsd] = savingsTotals(workspace.savings.places);
  const hasUsd = Number(savingsUsd.amount) !== 0;
  const places = workspace.savings.places.length;

  return (
    <>
      <section aria-label="Resumen del mes" className="flex flex-col gap-3.5">
        <div
          className={
            overspent
              ? "flex flex-col gap-3.5"
              : "flex flex-wrap items-end gap-x-2.5 gap-y-1"
          }
        >
          <Money
            value={summary.balance}
            size="hero"
            tone={overspent ? "negative" : "default"}
          />
          <p
            className={cn(
              "m-0 text-body-sm text-muted-foreground",
              overspent ? "order-first" : "pb-[5px] leading-none",
            )}
          >
            Disponible este mes
          </p>
        </div>
        <FlowBar summary={summary} goalsPercentage={goalDedicationPercentage} />
        <div
          className={cn(
            "flex items-center justify-between gap-3 rounded-md px-3 py-2.5",
            overspent ? "bg-negative/5" : "bg-accent-brand/6",
          )}
        >
          <p className="m-0 text-body-sm text-foreground">
            {balance > 0
              ? `${formatPercentage(goalDedicationPercentage)} de lo libre va a tus objetivos`
              : "Sin margen para objetivos este mes"}
          </p>
          <Link
            to="/app/goals"
            className="-my-3 flex min-h-11 shrink-0 items-center gap-0.5 text-body-sm font-semibold text-accent-brand no-underline hover:underline"
          >
            Planificar
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <nav aria-label="Secciones de finanzas" className="flex flex-col">
        <SectionRow
          to="/app/finances/incomes"
          label="Ingresos"
          meta={
            incomes.length
              ? `${plural(incomeTotals.length, "fuente", "fuentes")} · ${plural(incomes.filter((income) => income.recurring).length, "recurrente", "recurrentes")}`
              : "Sin ingresos este mes"
          }
          leading={<MiniRing values={incomeTotals} family="income" />}
          value={<Money value={summary.income} />}
        />
        <SectionRow
          to="/app/finances/expenses"
          label="Gastos"
          meta={
            expenses.length
              ? `${plural(expenses.length, "movimiento", "movimientos")} · ${plural(expenseTotals.length, "categoría", "categorías")}`
              : "Sin gastos este mes"
          }
          leading={<MiniRing values={expenseTotals} family="expense" />}
          value={<Money value={summary.expenses} />}
        />
        <SectionRow
          to="/app/finances/savings"
          label="Ahorros"
          meta={
            places
              ? plural(places, "lugar", "lugares")
              : "Sin lugares de ahorro"
          }
          leading={<SectionIcon icon={PiggyBank} />}
          value={
            <span className="flex flex-col items-end gap-1">
              {(Number(savingsArs.amount) !== 0 || !hasUsd) && (
                <Money value={savingsArs} />
              )}
              {hasUsd && <Money value={savingsUsd} />}
            </span>
          }
        />
      </nav>
    </>
  );
}

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, ChevronDown, ChevronLeft, ChevronRight, PiggyBank } from "lucide-react";
import type { FinancesWorkspace } from "@repo/shared-types";
import { FloatingAdd } from "../../../../components/norte/FloatingAdd";
import { FlowBar } from "../../../../components/norte/FlowBar";
import { Money } from "../../../../components/norte/Money";
import { MonthPickerPopover, shiftMonth } from "../../../../components/norte/MonthStepper";
import { MiniRing, SectionIcon, SectionRow } from "../../../../components/norte/SectionRow";
import { isExpenseIncludedInMonth } from "../../../../features/financial/expenses";
import { isIncomeIncludedInMonth } from "../../../../features/financial/incomes";
import { formatCalendarMonth, formatPercentage } from "../../../../lib/format";
import { cn } from "../../../../lib/utils";
import { ExpenseSheet } from "./ExpenseSheet";
import { categoryTotals, plural, savingsTotals } from "./finances-summary";

const ARROW =
  "relative flex size-9 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors after:absolute after:-inset-1 hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring motion-reduce:transition-none";

export function FinancesSummaryHeader({ month, onMonthChange }: { month: string; onMonthChange: (month: string) => void }) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="m-0 text-overline text-accent-brand">Finanzas</p>
        <h1 className="m-0 text-display text-foreground">
          <MonthPickerPopover
            value={month}
            onValueChange={onMonthChange}
            trigger={
              <button
                type="button"
                className="-my-1.5 flex min-h-11 items-center gap-1.5 rounded-md text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
              >
                {formatCalendarMonth(month).replace(" de ", " ")}
                <ChevronDown className="size-[18px] text-muted-foreground" aria-hidden="true" />
              </button>
            }
          />
        </h1>
      </div>
      <div className="flex shrink-0 gap-1">
        <button type="button" aria-label="Mes anterior" className={ARROW} onClick={() => onMonthChange(shiftMonth(month, -1))}>
          <ChevronLeft className="size-[18px]" aria-hidden="true" />
        </button>
        <button type="button" aria-label="Mes siguiente" className={ARROW} onClick={() => onMonthChange(shiftMonth(month, 1))}>
          <ChevronRight className="size-[18px]" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}

export function FinancesSummary({ workspace }: { workspace: FinancesWorkspace }) {
  const { month, summary, goalDedicationPercentage } = workspace;
  const [isAddOpen, setIsAddOpen] = useState(false);
  const balance = Number(summary.balance.amount);
  const overspent = balance < 0;
  const incomes = workspace.incomes.incomes.filter((income) => isIncomeIncludedInMonth(income, month));
  const expenses = workspace.expenses.expenses.filter((expense) => isExpenseIncludedInMonth(expense, month));
  const incomeTotals = categoryTotals(incomes);
  const expenseTotals = categoryTotals(expenses);
  const [savingsArs, savingsUsd] = savingsTotals(workspace.savings.places);
  const hasUsd = Number(savingsUsd.amount) !== 0;
  const places = workspace.savings.places.length;

  return (
    <>
      <section aria-label="Resumen del mes" className="flex flex-col gap-3.5">
        <div className={overspent ? "flex flex-col gap-3.5" : "flex flex-wrap items-end gap-x-2.5 gap-y-1"}>
          <Money value={summary.balance} size="hero" tone={overspent ? "negative" : "default"} />
          <p className={cn("m-0 text-body-sm text-muted-foreground", overspent ? "order-first" : "pb-[5px] leading-none")}>
            Disponible este mes
          </p>
        </div>
        <FlowBar summary={summary} goalsPercentage={goalDedicationPercentage} />
        <div className={cn("flex items-center justify-between gap-3 rounded-md px-3 py-2.5", overspent ? "bg-negative/5" : "bg-accent-brand/6")}>
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
          meta={incomes.length
            ? `${plural(incomeTotals.length, "fuente", "fuentes")} · ${plural(incomes.filter((income) => income.recurring).length, "recurrente", "recurrentes")}`
            : "Sin ingresos este mes"}
          leading={<MiniRing values={incomeTotals} family="income" />}
          value={<Money value={summary.income} />}
        />
        <SectionRow
          to="/app/finances/expenses"
          label="Gastos"
          meta={expenses.length
            ? `${plural(expenses.length, "movimiento", "movimientos")} · ${plural(expenseTotals.length, "categoría", "categorías")}`
            : "Sin gastos este mes"}
          leading={<MiniRing values={expenseTotals} family="expense" />}
          value={<Money value={summary.expenses} />}
        />
        <SectionRow
          to="/app/finances/savings"
          label="Ahorros"
          meta={places ? plural(places, "lugar", "lugares") : "Sin lugares de ahorro"}
          leading={<SectionIcon icon={PiggyBank} />}
          value={
            <span className="flex flex-col items-end gap-1">
              {(Number(savingsArs.amount) !== 0 || !hasUsd) && <Money value={savingsArs} />}
              {hasUsd && <Money value={savingsUsd} />}
            </span>
          }
        />
      </nav>

      <FloatingAdd aria-label="Agregar gasto" onClick={() => setIsAddOpen(true)} />
      <ExpenseSheet open={isAddOpen} onOpenChange={setIsAddOpen} month={month} sources={workspace.expenses.sources} />
    </>
  );
}

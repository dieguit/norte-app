import { useState } from "react";
import type { FinancesWorkspace } from "@repo/shared-types";
import { MonthStepper } from "../../../../components/norte/MonthStepper";
import { ScreenHeader } from "../../../../components/norte/ScreenHeader";
import { SavingsPlacesTab } from "./SavingsPlacesTab";
import { ExpenseWorkspaceTab, IncomeWorkspaceTab } from "./FinancesWorkspaceTabs";
import { FinancesSummary, FinancesSummaryHeader } from "./FinancesSummary";
import { useFinancesMonth } from "./useFinancesMonth";

export type FinancesWorkspaceData = FinancesWorkspace;

export type FinancesView = "summary" | "incomes" | "expenses" | "savings";

const TITLES = { incomes: "Ingresos", expenses: "Gastos", savings: "Ahorros" } as const;

export function FinancesWorkspace({
  workspace,
  initialMonth = new Date().toISOString().slice(0, 7),
  view,
}: {
  workspace: FinancesWorkspaceData;
  initialMonth?: string;
  view: FinancesView;
}) {
  const { selectedMonth, selectMonth, current, loadingMonth, loadError } = useFinancesMonth(workspace, initialMonth);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [isCreateExpenseOpen, setIsCreateExpenseOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  const monthStatus = (
    <>
      {loadingMonth && <p role="status" className="m-0 text-body-sm text-muted-foreground">Cargando finanzas del mes…</p>}
      {loadError && <p role="alert" className="m-0 text-body-sm text-negative">No pudimos cargar las finanzas de este mes.</p>}
    </>
  );

  if (view === "summary") {
    return (
      <div className="relative isolate flex flex-col gap-7 px-5 pt-5 pb-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[linear-gradient(var(--map-grid)_1px,transparent_1px),linear-gradient(90deg,var(--map-grid)_1px,transparent_1px)] bg-size-[24px_24px] [mask-image:linear-gradient(to_bottom,black_35%,transparent)]"
        />
        <FinancesSummaryHeader month={selectedMonth} onMonthChange={selectMonth} />
        {monthStatus}
        {current && <FinancesSummary workspace={current} />}
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-8">
      <ScreenHeader
        title={TITLES[view]}
        backTo="/app/finances"
        trailing={(view === "incomes" || view === "expenses") && (
          <MonthStepper value={selectedMonth} onValueChange={selectMonth} aria-label="Mes de finanzas" />
        )}
      />
      <div className="flex flex-col gap-8 px-5 pt-4">
        {monthStatus}
        {view === "incomes" && current && <IncomeWorkspaceTab month={selectedMonth} incomes={current.incomes} createOpen={isCreateOpen} editingId={editingIncomeId} onCreateOpenChange={setIsCreateOpen} onEditingIdChange={setEditingIncomeId} />}
        {view === "expenses" && current && <ExpenseWorkspaceTab month={selectedMonth} expenses={current.expenses} createOpen={isCreateExpenseOpen} editingId={editingExpenseId} onCreateOpenChange={setIsCreateExpenseOpen} onEditingIdChange={setEditingExpenseId} />}
        {view === "savings" && current && <SavingsPlacesTab workspace={current.savings} />}
      </div>
    </div>
  );
}

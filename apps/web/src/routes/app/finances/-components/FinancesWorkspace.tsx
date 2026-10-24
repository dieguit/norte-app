import { useState } from "react";
import type { FinancesWorkspace } from "@repo/shared-types";
import type { GroupByValue } from "../../../../components/norte/GroupBy";
import { MonthStepper } from "../../../../components/norte/MonthStepper";
import { ScreenHeader } from "../../../../components/norte/ScreenHeader";
import { SavingsPlacesTab } from "./SavingsPlacesTab";
import { ExpenseWorkspaceTab, IncomeWorkspaceTab } from "./FinancesWorkspaceTabs";
import { FinancesSummary, FinancesSummaryHeader } from "./FinancesSummary";
import { useFinancesMonth } from "./useFinancesMonth";

export type FinancesWorkspaceData = FinancesWorkspace;

export type FinancesView = "summary" | "incomes" | "expenses" | "savings";

const TITLES = { incomes: "Ingresos", expenses: "Gastos", savings: "Ahorros" } as const;

function MonthStatus({ view, loading, error }: { view: FinancesView; loading: boolean; error: boolean }) {
  if (loading) return <p role="status" className="m-0 text-body-sm text-muted-foreground">Cargando finanzas del mes…</p>;
  if (error) return <p role="alert" className="m-0 text-body-sm text-negative">No pudimos cargar las finanzas de este mes.</p>;
  return null;
}

function SubPageContent({
  view,
  current,
  month,
  incomeProps,
  expenseProps,
}: {
  view: FinancesView;
  current: FinancesWorkspaceData | null;
  month: string;
  incomeProps: { createOpen: boolean; editingId: string | null; groupBy: GroupByValue; onCreateOpenChange: (open: boolean) => void; onEditingIdChange: (id: string | null) => void; onGroupByChange: (v: GroupByValue) => void };
  expenseProps: { createOpen: boolean; editingId: string | null; groupBy: GroupByValue; onCreateOpenChange: (open: boolean) => void; onEditingIdChange: (id: string | null) => void; onGroupByChange: (v: GroupByValue) => void };
}) {
  if (!current) return null;
  switch (view) {
    case "incomes":
      return <IncomeWorkspaceTab month={month} incomes={current.incomes} {...incomeProps} />;
    case "expenses":
      return <ExpenseWorkspaceTab month={month} expenses={current.expenses} {...expenseProps} />;
    case "savings":
      return <SavingsPlacesTab workspace={current.savings} />;
    default:
      return null;
  }
}

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
  const [expenseGroupBy, setExpenseGroupBy] = useState<GroupByValue>("category");
  const [incomeGroupBy, setIncomeGroupBy] = useState<GroupByValue>("category");

  const status = <MonthStatus view={view} loading={loadingMonth} error={loadError} />;

  if (view === "summary") {
    return (
      <div className="relative isolate flex flex-col gap-7 px-5 pt-5 pb-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[linear-gradient(var(--map-grid)_1px,transparent_1px),linear-gradient(90deg,var(--map-grid)_1px,transparent_1px)] bg-size-[24px_24px] [mask-image:linear-gradient(to_bottom,black_35%,transparent)]"
        />
        <FinancesSummaryHeader month={selectedMonth} onMonthChange={selectMonth} />
        {status}
        {current && <FinancesSummary workspace={current} />}
      </div>
    );
  }

  const hasMonthStepper = view === "incomes" || view === "expenses";

  return (
    <div className={view === "benefits" ? "flex flex-col pb-8" : "flex flex-col pb-24"}>
      <ScreenHeader
        title={TITLES[view]}
        subtitle={view === "savings" ? "Acumulado" : undefined}
        backTo="/app/finances"
        trailing={hasMonthStepper ? <MonthStepper value={selectedMonth} onValueChange={selectMonth} aria-label="Mes de finanzas" /> : undefined}
      />
      <div className={hasMonthStepper ? "flex flex-col gap-8 px-5 pt-3" : "flex flex-col gap-8 px-5 pt-4"}>
        {status}
        <SubPageContent
          view={view}
          current={current}
          month={selectedMonth}
          incomeProps={{ createOpen: isCreateOpen, editingId: editingIncomeId, groupBy: incomeGroupBy, onCreateOpenChange: setIsCreateOpen, onEditingIdChange: setEditingIncomeId, onGroupByChange: setIncomeGroupBy }}
          expenseProps={{ createOpen: isCreateExpenseOpen, editingId: editingExpenseId, groupBy: expenseGroupBy, onCreateOpenChange: setIsCreateExpenseOpen, onEditingIdChange: setEditingExpenseId, onGroupByChange: setExpenseGroupBy }}
        />
      </div>
    </div>
  );
}

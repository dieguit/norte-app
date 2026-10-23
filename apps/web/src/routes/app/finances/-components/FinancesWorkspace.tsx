import { useState } from "react";
import type { FinancesWorkspace } from "@repo/shared-types";
import { MonthPickerInput } from "../../../../components/MonthPicker";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../../components/ui/tabs";
import { FinancialSummaryCards } from "../../../../components/FinancialSummaryCards";
import { SavingsPlacesTab } from "./SavingsPlacesTab";
import { ExpenseWorkspaceTab, IncomeWorkspaceTab } from "./FinancesWorkspaceTabs";
import { useFinancesMonth } from "./useFinancesMonth";

export type FinancesWorkspaceData = FinancesWorkspace;

export type FinancesTab = "incomes" | "expenses" | "savings";
export const FINANCES_TAB_PATHS = {
  incomes: "/app/finances/incomes",
  expenses: "/app/finances/expenses",
  savings: "/app/finances/savings",
} as const satisfies Record<FinancesTab, string>;

export function FinancesWorkspace({
  workspace,
  initialMonth = new Date().toISOString().slice(0, 7),
  tab,
  onTabChange,
}: {
  workspace: FinancesWorkspaceData;
  initialMonth?: string;
  tab?: FinancesTab;
  onTabChange?: (tab: FinancesTab) => void;
}) {
  const { selectedMonth, selectMonth, current, loadingMonth, loadError } = useFinancesMonth(workspace, initialMonth);
  const [localTab, setLocalTab] = useState<FinancesTab>("incomes");
  const activeTab = tab ?? localTab;
  const changeTab = (value: string) => {
    setLocalTab(value as FinancesTab);
    onTabChange?.(value as FinancesTab);
  };
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [isCreateExpenseOpen, setIsCreateExpenseOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-12">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-serif text-3xl font-bold tracking-tight whitespace-nowrap text-[var(--sea-ink)] sm:text-4xl">
          Tus Finanzas
        </h1>
        <MonthPickerInput
          className="w-full sm:w-auto"
          aria-label="Mes de finanzas"
          value={selectedMonth}
          onValueChange={selectMonth}
        />
      </header>

      {current && <FinancialSummaryCards
        mode="finances"
        summary={{
          month: selectedMonth,
          income: current.summary.income,
          expenses: current.summary.expenses,
          balance: current.summary.balance,
          dedicationPercentage: current.goalDedicationPercentage,
          contribution: current.summary.contribution,
        }}
      />}

      {loadingMonth && <p role="status">Cargando finanzas del mes…</p>}
      {loadError && <p role="alert">No pudimos cargar las finanzas de este mes.</p>}

      <Tabs value={activeTab} onValueChange={changeTab}>
        <TabsList className="h-10 p-1">
          <TabsTrigger className="px-3 py-1 text-base" value="incomes">
            Ingresos
          </TabsTrigger>
          <TabsTrigger className="px-3 py-1 text-base" value="expenses">
            Gastos
          </TabsTrigger>
          <TabsTrigger className="px-3 py-1 text-base" value="savings">
            Ahorros
          </TabsTrigger>
        </TabsList>
        {current && <TabsContent value="incomes"><IncomeWorkspaceTab month={selectedMonth} incomes={current.incomes} createOpen={isCreateOpen} editingId={editingIncomeId} onCreateOpenChange={setIsCreateOpen} onEditingIdChange={setEditingIncomeId} /></TabsContent>}
        {current && <TabsContent value="expenses"><ExpenseWorkspaceTab month={selectedMonth} expenses={current.expenses} createOpen={isCreateExpenseOpen} editingId={editingExpenseId} onCreateOpenChange={setIsCreateExpenseOpen} onEditingIdChange={setEditingExpenseId} /></TabsContent>}
        {current && <TabsContent value="savings"><SavingsPlacesTab workspace={current.savings} /></TabsContent>}
      </Tabs>
    </div>
  );
}

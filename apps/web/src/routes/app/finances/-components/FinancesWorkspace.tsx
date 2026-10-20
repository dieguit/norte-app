import { useEffect, useRef, useState } from "react";
import type { FinancesWorkspace } from "@repo/shared-types";
import { MonthPickerInput } from "../../../../components/MonthPicker";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../../components/ui/tabs";
import { FinancialSummaryCards } from "../../../../components/FinancialSummaryCards";
import { getFinancesWorkspace } from "../../../../features/financial/financial.functions";
import { SavingsPlacesTab } from "./SavingsPlacesTab";
import { ExpenseWorkspaceTab, IncomeWorkspaceTab } from "./FinancesWorkspaceTabs";

export type FinancesWorkspaceData = FinancesWorkspace;

export function FinancesWorkspace({
  workspace,
  initialMonth = new Date().toISOString().slice(0, 7),
}: {
  workspace: FinancesWorkspaceData;
  initialMonth?: string;
}) {
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [monthData, setMonthData] = useState(workspace);
  const [freshForWorkspace, setFreshForWorkspace] = useState<typeof workspace | null>(workspace);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const requestId = useRef(0);
  const [activeTab, setActiveTab] = useState("incomes");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [isCreateExpenseOpen, setIsCreateExpenseOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);


  useEffect(() => {
    if (workspace.month === selectedMonth) {
      setMonthData(workspace);
      setFreshForWorkspace(workspace);
      setLoadingMonth(false);
      setLoadError(false);
      return;
    }
    const id = ++requestId.current;
    setFreshForWorkspace(null);
    setLoadingMonth(true);
    setLoadError(false);
    getFinancesWorkspace({ data: { month: selectedMonth } }).then((next) => {
      if (id === requestId.current && next?.month === selectedMonth) {
        setMonthData(next);
        setFreshForWorkspace(workspace);
      }
      else if (id === requestId.current) setLoadError(true);
    }).catch(() => {
      if (id === requestId.current) setLoadError(true);
    }).finally(() => {
      if (id === requestId.current) setLoadingMonth(false);
    });
    return () => { requestId.current += 1; };
  }, [selectedMonth, workspace]);
  const current = !loadingMonth && freshForWorkspace === workspace && monthData.month === selectedMonth ? monthData : null;
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
          onValueChange={(month) => {
            setFreshForWorkspace(null);
            setSelectedMonth(month);
          }}
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
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

import { useState } from "react";
import { MonthPickerInput } from "../../../../components/MonthPicker";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../../components/ui/tabs";
import {
  getIncomeTotalArs,
  type IncomesWorkspace,
} from "../../../../features/financial/incomes";
import {
  getExpenseTotalArs,
  getMonthlyBalanceArs,
  type ExpensesWorkspace,
} from "../../../../features/financial/expenses";
import { FinancialSummaryCards } from "../../../../components/FinancialSummaryCards";
import { getGoalContributionArs } from "../../../../features/financial/monthly-plan";
import { SavingsPlacesTab } from "./SavingsPlacesTab";
import type { SavingsPlacesWorkspace } from "../../../../features/savings-places/savings-places";
import { ExpenseWorkspaceTab, IncomeWorkspaceTab } from "./FinancesWorkspaceTabs";

export interface FinancesWorkspaceData {
  goalDedicationPercentage: string;
  incomes: IncomesWorkspace;
  expenses: ExpensesWorkspace;
  savings: SavingsPlacesWorkspace;
}

export function FinancesWorkspace({
  workspace,
  initialMonth = new Date().toISOString().slice(0, 7),
}: {
  workspace: FinancesWorkspaceData;
  initialMonth?: string;
}) {
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [activeTab, setActiveTab] = useState("incomes");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [isCreateExpenseOpen, setIsCreateExpenseOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);


  const expensesTotal = getExpenseTotalArs(
    workspace.expenses.expenses.map((expense) => ({
      amount: { amount: expense.amount, currency: expense.currency },
      recurring: expense.recurring,
      effectiveMonth: expense.effectiveMonth,
      endMonth: expense.endMonth,
    })),
    selectedMonth,
  );
  const incomeTotal = getIncomeTotalArs(
    workspace.incomes.incomes.map((income) => ({
      amount: { amount: income.amount, currency: income.currency },
      recurring: income.recurring,
      effectiveMonth: income.effectiveMonth,
    })),
    selectedMonth,
  );
  const balance = getMonthlyBalanceArs(incomeTotal, expensesTotal);
  const contribution = getGoalContributionArs(
    balance,
    workspace.goalDedicationPercentage,
  );
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
          onValueChange={setSelectedMonth}
        />
      </header>

      <FinancialSummaryCards
        mode="finances"
        summary={{
          month: selectedMonth,
          income: incomeTotal,
          expenses: expensesTotal,
          balance,
          dedicationPercentage: workspace.goalDedicationPercentage,
          contribution,
        }}
      />

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
        <TabsContent value="incomes"><IncomeWorkspaceTab month={selectedMonth} incomes={workspace.incomes} createOpen={isCreateOpen} editingId={editingIncomeId} onCreateOpenChange={setIsCreateOpen} onEditingIdChange={setEditingIncomeId} /></TabsContent>
        <TabsContent value="expenses"><ExpenseWorkspaceTab month={selectedMonth} expenses={workspace.expenses} createOpen={isCreateExpenseOpen} editingId={editingExpenseId} onCreateOpenChange={setIsCreateExpenseOpen} onEditingIdChange={setEditingExpenseId} /></TabsContent>
        <TabsContent value="savings">
          <SavingsPlacesTab workspace={workspace.savings} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

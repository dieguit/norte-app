import { useState } from "react";
import { Pencil } from "lucide-react";
import { MonthPickerInput } from "../../../../components/MonthPicker";
import { Button } from "../../../../components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../../components/ui/tabs";
import { formatCalendarMonth, formatMoney } from "../../../../lib/format";
import { createMoney } from "../../../../lib/money";
import {
  getIncomeTotalArs,
  isIncomeIncludedInMonth,
  FIXED_INCOME_SOURCES,
  type IncomesWorkspace,
} from "../../../../features/financial/incomes";
import {
  getExpenseTotalArs,
  getMonthlyBalanceArs,
  isExpenseIncludedInMonth,
  FIXED_EXPENSE_SOURCES,
  type ExpensesWorkspace,
} from "../../../../features/financial/expenses";
import { IncomeSheet } from "./IncomeSheet";
import { ExpenseSheet } from "./ExpenseSheet";
import { FinancialSummaryCards } from "../../../../components/FinancialSummaryCards";
import { getGoalContributionArs } from "../../../../features/financial/monthly-plan";
import { SavingsPlacesTab } from "./SavingsPlacesTab";
import type { SavingsPlacesWorkspace } from "../../../../features/savings-places/savings-places";

function formatArs(amount: string) {
  return Number(amount).toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

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

  const displayedIncomes = workspace.incomes.incomes.filter((income) =>
    isIncomeIncludedInMonth(income, selectedMonth),
  );
  const oneOffIncomes = displayedIncomes.filter((income) => !income.recurring);
  const recurringIncomes = displayedIncomes.filter((income) => income.recurring);
  const displayedExpenses = workspace.expenses.expenses.filter((expense) =>
    isExpenseIncludedInMonth(expense, selectedMonth),
  );
  const recurringExpenses = displayedExpenses.filter(
    (expense) => expense.recurring,
  );
  const oneOffExpenses = displayedExpenses.filter(
    (expense) => !expense.recurring,
  );

  const renderIncomeRow = (income: IncomesWorkspace["incomes"][number]) => {
    const label =
      income.sourceKind === "custom"
        ? income.sourceName
        : FIXED_INCOME_SOURCES[
            income.sourceKind as keyof typeof FIXED_INCOME_SOURCES
          ];

    return (
      <li
        key={income.id}
        className="flex flex-col items-stretch justify-between gap-5 p-5 sm:flex-row sm:items-center"
      >
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-[var(--sea-ink)]">{label}</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`Editar ingreso ${label}`}
              onClick={() => setEditingIncomeId(income.id)}
            >
              <Pencil data-icon="inline-start" aria-hidden="true" />
              Editar ingreso
            </Button>
          </div>
          <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
            {income.recurring
              ? `Todos los meses desde ${formatCalendarMonth(income.effectiveMonth.slice(0, 7))}`
              : formatCalendarMonth(income.effectiveMonth.slice(0, 7))}
          </p>
        </div>
        <div className="text-right">
          <p className="font-semibold tabular-nums text-[var(--sea-ink)]">
            {formatMoney(createMoney(income.amount, income.currency))}
          </p>
          {income.currency === "USD" && (
            <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
              Equivale a ARS{" "}
              {formatArs(
                getIncomeTotalArs(
                  [
                    {
                      amount: { amount: income.amount, currency: "USD" },
                      recurring: true,
                      effectiveMonth: selectedMonth,
                    },
                  ],
                  selectedMonth,
                ).amount,
              )}
            </p>
          )}
        </div>
      </li>
    );
  };

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
        <TabsContent value="incomes">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
              <div>
                <h2 className="font-serif text-xl font-bold tracking-tight text-[var(--sea-ink)] sm:text-4xl">
                  Ingresos de {formatCalendarMonth(selectedMonth)}
                </h2>
              </div>
              <Button
                className="sm:ml-auto"
                type="button"
                onClick={() => setIsCreateOpen(true)}
              >
                Agregar nuevo
              </Button>
            </div>

            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <h3 className="font-serif text-lg font-bold text-[var(--sea-ink)] sm:text-xl">
                  Únicos
                </h3>
                <section
                  aria-label="Ingresos únicos"
                  className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)]"
                >
                  {oneOffIncomes.length === 0 ? (
                    <div className="p-8 text-center text-sm text-[var(--sea-ink-soft)]">
                      No tenés ingresos únicos para este mes.
                    </div>
                  ) : (
                    <ul className="divide-y divide-[var(--line)]">
                      {oneOffIncomes.map(renderIncomeRow)}
                    </ul>
                  )}
                </section>
              </div>
              <div className="flex flex-col gap-3">
                <h3 className="font-serif text-lg font-bold text-[var(--sea-ink)] sm:text-xl">
                  Recurrentes
                </h3>
                <section
                  aria-label="Ingresos recurrentes"
                  className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)]"
                >
                  {recurringIncomes.length === 0 ? (
                    <div className="p-8 text-center text-sm text-[var(--sea-ink-soft)]">
                      No tenés ingresos recurrentes para este mes.
                    </div>
                  ) : (
                    <ul className="divide-y divide-[var(--line)]">
                      {recurringIncomes.map(renderIncomeRow)}
                    </ul>
                  )}
                </section>
              </div>
            </div>
            <IncomeSheet
              open={isCreateOpen}
              onOpenChange={setIsCreateOpen}
              month={selectedMonth}
              sources={workspace.incomes.sources}
            />
            <IncomeSheet
              open={editingIncomeId !== null}
              onOpenChange={(open) => {
                if (!open) setEditingIncomeId(null);
              }}
              month={selectedMonth}
              sources={workspace.incomes.sources}
              income={workspace.incomes.incomes.find(
                (income) => income.id === editingIncomeId,
              )}
            />
          </div>
        </TabsContent>
        <TabsContent value="expenses">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
              <div>
                <h2 className="font-serif text-xl font-bold tracking-tight text-[var(--sea-ink)] sm:text-4xl">
                  Gastos de {formatCalendarMonth(selectedMonth)}
                </h2>
              </div>
              <Button
                className="sm:ml-auto"
                type="button"
                onClick={() => setIsCreateExpenseOpen(true)}
              >
                Agregar nuevo
              </Button>
            </div>

            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <h3 className="font-serif text-lg font-bold text-[var(--sea-ink)] sm:text-xl">
                  Únicos
                </h3>
                <section
                  aria-label="Gastos únicos"
                  className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)]"
                >
                  {oneOffExpenses.length === 0 ? (
                    <div className="p-8 text-center text-sm text-[var(--sea-ink-soft)]">
                      No tenés gastos únicos para este mes.
                    </div>
                  ) : (
                    <ul className="divide-y divide-[var(--line)]">
                      {oneOffExpenses.map((expense) => {
                        const label =
                          expense.sourceKind === "custom"
                            ? expense.sourceName
                            : FIXED_EXPENSE_SOURCES[
                                expense.sourceKind as keyof typeof FIXED_EXPENSE_SOURCES
                              ];
                        return (
                          <li
                            key={expense.id}
                            className="flex flex-col items-stretch justify-between gap-5 p-5 sm:flex-row sm:items-center"
                          >
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-[var(--sea-ink)]">
                                  {label}
                                </p>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  aria-label={`Editar gasto ${label}`}
                                  onClick={() =>
                                    setEditingExpenseId(expense.id)
                                  }
                                >
                                  <Pencil
                                    data-icon="inline-start"
                                    aria-hidden="true"
                                  />
                                  Editar gasto
                                </Button>
                              </div>
                              <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
                                {formatCalendarMonth(
                                  expense.effectiveMonth.slice(0, 7),
                                )}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold tabular-nums text-[var(--sea-ink)]">
                                {formatMoney(
                                  createMoney(
                                    expense.amount,
                                    expense.currency,
                                  ),
                                )}
                              </p>
                              {expense.currency === "USD" && (
                                <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
                                  Equivale a ARS{" "}
                                  {formatArs(
                                    getExpenseTotalArs(
                                      [
                                        {
                                          amount: {
                                            amount: expense.amount,
                                            currency: "USD",
                                          },
                                          recurring: expense.recurring,
                                          effectiveMonth: selectedMonth,
                                          endMonth: expense.endMonth,
                                        },
                                      ],
                                      selectedMonth,
                                    ).amount,
                                  )}
                                </p>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="font-serif text-lg font-bold text-[var(--sea-ink)] sm:text-xl">
                  Recurrentes
                </h3>
                <section
                  aria-label="Gastos recurrentes"
                  className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)]"
                >
                  {recurringExpenses.length === 0 ? (
                    <div className="p-8 text-center text-sm text-[var(--sea-ink-soft)]">
                      No tenés gastos recurrentes para este mes.
                    </div>
                  ) : (
                    <ul className="divide-y divide-[var(--line)]">
                      {recurringExpenses.map((expense) => {
                        const label =
                          expense.sourceKind === "custom"
                            ? expense.sourceName
                            : FIXED_EXPENSE_SOURCES[
                                expense.sourceKind as keyof typeof FIXED_EXPENSE_SOURCES
                              ];
                        return (
                          <li
                            key={expense.id}
                            className="flex flex-col items-stretch justify-between gap-5 p-5 sm:flex-row sm:items-center"
                          >
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-[var(--sea-ink)]">
                                  {label}
                                </p>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  aria-label={`Editar gasto ${label}`}
                                  onClick={() =>
                                    setEditingExpenseId(expense.id)
                                  }
                                >
                                  <Pencil
                                    data-icon="inline-start"
                                    aria-hidden="true"
                                  />
                                  Editar gasto
                                </Button>
                              </div>
                              <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
                                Todos los meses desde{" "}
                                {formatCalendarMonth(
                                  expense.effectiveMonth.slice(0, 7),
                                )}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold tabular-nums text-[var(--sea-ink)]">
                                {formatMoney(
                                  createMoney(
                                    expense.amount,
                                    expense.currency,
                                  ),
                                )}
                              </p>
                              {expense.currency === "USD" && (
                                <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
                                  Equivale a ARS{" "}
                                  {formatArs(
                                    getExpenseTotalArs(
                                      [
                                        {
                                          amount: {
                                            amount: expense.amount,
                                            currency: "USD",
                                          },
                                          recurring: expense.recurring,
                                          effectiveMonth: selectedMonth,
                                          endMonth: expense.endMonth,
                                        },
                                      ],
                                      selectedMonth,
                                    ).amount,
                                  )}
                                </p>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              </div>
            </div>
            <ExpenseSheet
              open={isCreateExpenseOpen}
              onOpenChange={setIsCreateExpenseOpen}
              month={selectedMonth}
              sources={workspace.expenses.sources}
            />
            <ExpenseSheet
              open={editingExpenseId !== null}
              onOpenChange={(open) => {
                if (!open) setEditingExpenseId(null);
              }}
              month={selectedMonth}
              sources={workspace.expenses.sources}
              expense={workspace.expenses.expenses.find(
                (expense) => expense.id === editingExpenseId,
              )}
            />
          </div>
        </TabsContent>
        <TabsContent value="savings">
          <SavingsPlacesTab workspace={workspace.savings} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

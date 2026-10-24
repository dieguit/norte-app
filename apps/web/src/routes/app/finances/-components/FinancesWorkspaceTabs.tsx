import { FIXED_INCOME_SOURCES, isIncomeIncludedInMonth } from "../../../../features/financial/incomes";
import { FIXED_EXPENSE_SOURCES, isExpenseIncludedInMonth } from "../../../../features/financial/expenses";
import type { FinancesWorkspace } from "@repo/shared-types";
import { FloatingAdd } from "../../../../components/norte/FloatingAdd";
import type { GroupByValue } from "../../../../components/norte/GroupBy";
import { EntryBreakdown } from "./EntryBreakdown";
import { IncomeSheet } from "./IncomeSheet";
import { ExpenseSheet } from "./ExpenseSheet";

export function IncomeWorkspaceTab({
  month,
  incomes,
  createOpen,
  editingId,
  groupBy,
  onCreateOpenChange,
  onEditingIdChange,
  onGroupByChange,
}: {
  month: string;
  incomes: FinancesWorkspace["incomes"];
  createOpen: boolean;
  editingId: string | null;
  groupBy: GroupByValue;
  onCreateOpenChange: (open: boolean) => void;
  onEditingIdChange: (id: string | null) => void;
  onGroupByChange: (value: GroupByValue) => void;
}) {
  return (
    <>
      <EntryBreakdown
        month={month}
        entries={incomes.incomes.filter((income) => isIncomeIncludedInMonth(income, month))}
        family="income"
        labels={FIXED_INCOME_SOURCES}
        groupNoun={["fuente", "fuentes"]}
        entryNoun={["movimiento", "movimientos"]}
        empty="No tenés ingresos este mes."
        editPrefix="Editar ingreso"
        groupBy={groupBy}
        onGroupByChange={onGroupByChange}
        onEdit={onEditingIdChange}
      />
      <FloatingAdd aria-label="Agregar ingreso" onClick={() => onCreateOpenChange(true)} />
      <IncomeSheet open={createOpen} onOpenChange={onCreateOpenChange} month={month} sources={incomes.sources} />
      <IncomeSheet open={editingId !== null} onOpenChange={(open) => { if (!open) onEditingIdChange(null) }} month={month} sources={incomes.sources} income={incomes.incomes.find((income) => income.id === editingId)} />
    </>
  );
}

export function ExpenseWorkspaceTab({
  month,
  expenses,
  createOpen,
  editingId,
  groupBy,
  onCreateOpenChange,
  onEditingIdChange,
  onGroupByChange,
}: {
  month: string;
  expenses: FinancesWorkspace["expenses"];
  createOpen: boolean;
  editingId: string | null;
  groupBy: GroupByValue;
  onCreateOpenChange: (open: boolean) => void;
  onEditingIdChange: (id: string | null) => void;
  onGroupByChange: (value: GroupByValue) => void;
}) {
  return (
    <>
      <EntryBreakdown
        month={month}
        entries={expenses.expenses.filter((expense) => isExpenseIncludedInMonth(expense, month))}
        family="expense"
        labels={FIXED_EXPENSE_SOURCES}
        groupNoun={["categoría", "categorías"]}
        entryNoun={["movimiento", "movimientos"]}
        empty="No tenés gastos este mes."
        editPrefix="Editar gasto"
        groupBy={groupBy}
        onGroupByChange={onGroupByChange}
        onEdit={onEditingIdChange}
      />
      <FloatingAdd aria-label="Agregar gasto" onClick={() => onCreateOpenChange(true)} />
      <ExpenseSheet open={createOpen} onOpenChange={onCreateOpenChange} month={month} sources={expenses.sources} />
      <ExpenseSheet open={editingId !== null} onOpenChange={(open) => { if (!open) onEditingIdChange(null) }} month={month} sources={expenses.sources} expense={expenses.expenses.find((expense) => expense.id === editingId)} />
    </>
  );
}

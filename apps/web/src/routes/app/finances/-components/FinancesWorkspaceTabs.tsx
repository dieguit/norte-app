import { Button } from "../../../../components/ui/button";
import { formatCalendarMonth } from "../../../../lib/format";
import { isIncomeIncludedInMonth, type IncomesWorkspace } from "../../../../features/financial/incomes";
import { isExpenseIncludedInMonth, type ExpensesWorkspace } from "../../../../features/financial/expenses";
import { IncomeSheet } from "./IncomeSheet";
import { ExpenseSheet } from "./ExpenseSheet";
import { ExpenseItem, IncomeItem } from "./FinanceListItems";

export function IncomeWorkspaceTab({
  month,
  incomes,
  createOpen,
  editingId,
  onCreateOpenChange,
  onEditingIdChange,
}: {
  month: string;
  incomes: IncomesWorkspace;
  createOpen: boolean;
  editingId: string | null;
  onCreateOpenChange: (open: boolean) => void;
  onEditingIdChange: (id: string | null) => void;
}) {
  const displayed = incomes.incomes.filter((income) => isIncomeIncludedInMonth(income, month));
  const oneOff = displayed.filter((income) => !income.recurring);
  const recurring = displayed.filter((income) => income.recurring);
  return (
    <div className="flex flex-col gap-8">
      <TabHeader title={`Ingresos de ${formatCalendarMonth(month)}`} onAdd={() => onCreateOpenChange(true)} />
      <IncomeSection title="Únicos" label="Ingresos únicos" items={oneOff} month={month} onEdit={onEditingIdChange} empty="No tenés ingresos únicos para este mes." />
      <IncomeSection title="Recurrentes" label="Ingresos recurrentes" items={recurring} month={month} onEdit={onEditingIdChange} empty="No tenés ingresos recurrentes para este mes." />
      <IncomeSheet open={createOpen} onOpenChange={onCreateOpenChange} month={month} sources={incomes.sources} />
      <IncomeSheet open={editingId !== null} onOpenChange={(open) => { if (!open) onEditingIdChange(null) }} month={month} sources={incomes.sources} income={incomes.incomes.find((income) => income.id === editingId)} />
    </div>
  );
}

function IncomeSection({ title, label, items, month, onEdit, empty }: { title: string; label: string; items: IncomesWorkspace["incomes"]; month: string; onEdit: (id: string | null) => void; empty: string }) {
  return <EntrySection title={title} label={label}>{items.length ? <ul className="divide-y divide-[var(--line)]">{items.map((income) => <IncomeItem key={income.id} item={income} selectedMonth={month} onEdit={onEdit} />)}</ul> : <EmptyEntry text={empty} />}</EntrySection>;
}

export function ExpenseWorkspaceTab({
  month,
  expenses,
  createOpen,
  editingId,
  onCreateOpenChange,
  onEditingIdChange,
}: {
  month: string;
  expenses: ExpensesWorkspace;
  createOpen: boolean;
  editingId: string | null;
  onCreateOpenChange: (open: boolean) => void;
  onEditingIdChange: (id: string | null) => void;
}) {
  const displayed = expenses.expenses.filter((expense) => isExpenseIncludedInMonth(expense, month));
  const oneOff = displayed.filter((expense) => !expense.recurring);
  const recurring = displayed.filter((expense) => expense.recurring);
  return (
    <div className="flex flex-col gap-8">
      <TabHeader title={`Gastos de ${formatCalendarMonth(month)}`} onAdd={() => onCreateOpenChange(true)} />
      <ExpenseSection title="Únicos" label="Gastos únicos" items={oneOff} month={month} onEdit={onEditingIdChange} empty="No tenés gastos únicos para este mes." />
      <ExpenseSection title="Recurrentes" label="Gastos recurrentes" items={recurring} month={month} onEdit={onEditingIdChange} empty="No tenés gastos recurrentes para este mes." />
      <ExpenseSheet open={createOpen} onOpenChange={onCreateOpenChange} month={month} sources={expenses.sources} />
      <ExpenseSheet open={editingId !== null} onOpenChange={(open) => { if (!open) onEditingIdChange(null) }} month={month} sources={expenses.sources} expense={expenses.expenses.find((expense) => expense.id === editingId)} />
    </div>
  );
}

function ExpenseSection({ title, label, items, month, onEdit, empty }: { title: string; label: string; items: ExpensesWorkspace["expenses"]; month: string; onEdit: (id: string | null) => void; empty: string }) {
  return <EntrySection title={title} label={label}>{items.length ? <ul className="divide-y divide-[var(--line)]">{items.map((expense) => <ExpenseItem key={expense.id} item={expense} selectedMonth={month} onEdit={onEdit} />)}</ul> : <EmptyEntry text={empty} />}</EntrySection>;
}

function TabHeader({ title, onAdd }: { title: string; onAdd: () => void }) {
  return <div className="flex flex-col gap-5 sm:flex-row sm:items-end"><h2 className="font-serif text-xl font-bold tracking-tight text-[var(--sea-ink)] sm:text-4xl">{title}</h2><Button className="sm:ml-auto" type="button" onClick={onAdd}>Agregar nuevo</Button></div>;
}

function EntrySection({ title, label, children }: { title: string; label: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-3"><h3 className="font-serif text-lg font-bold text-[var(--sea-ink)] sm:text-xl">{title}</h3><section aria-label={label} className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)]">{children}</section></div>;
}

function EmptyEntry({ text }: { text: string }) {
  return <div className="p-8 text-center text-sm text-[var(--sea-ink-soft)]">{text}</div>;
}

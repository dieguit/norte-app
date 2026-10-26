import { ArrowDownRight, ArrowUpRight, PiggyBank } from "lucide-react";
import type { FinancesWorkspace } from "@repo/shared-types";
import type { LogDay, LogItem, LogKind } from "../../../../components/norte/MovementLog";
import { FIXED_EXPENSE_SOURCES, isExpenseIncludedInMonth } from "../../../../features/financial/expenses";
import { FIXED_INCOME_SOURCES, isIncomeIncludedInMonth } from "../../../../features/financial/incomes";
import { localDay, movementDay } from "../../../../lib/movement-day";
import { categoryName, entryLabel, groupByDay } from "./entry-groups";

export type LogFilter = "all" | LogKind;

type Dated = LogItem & { day: string };

export function financesLog(workspace: FinancesWorkspace, filter: LogFilter): LogDay[] {
  const { month } = workspace;
  const incomes = workspace.incomes.incomes.filter((income) => isIncomeIncludedInMonth(income, month));
  const expenses = workspace.expenses.expenses.filter((expense) => isExpenseIncludedInMonth(expense, month));
  const items: Dated[] = [
    ...incomes.map((income) => ({
      id: income.id, kind: "income" as const, day: movementDay(income, month),
      label: entryLabel(income, FIXED_INCOME_SOURCES), category: `Ingreso · ${categoryName(income, FIXED_INCOME_SOURCES)}`,
      amount: { amount: income.amount, currency: income.currency }, recurring: income.recurring,
      icon: ArrowUpRight, color: "var(--chart-income-3)", tone: "positive" as const, sign: "always" as const,
    })),
    ...expenses.map((expense) => ({
      id: expense.id, kind: "expense" as const, day: movementDay(expense, month),
      label: entryLabel(expense, FIXED_EXPENSE_SOURCES), category: `Gasto · ${categoryName(expense, FIXED_EXPENSE_SOURCES)}`,
      amount: { amount: `-${expense.amount}`, currency: expense.currency }, recurring: expense.recurring,
      icon: ArrowDownRight, color: "var(--chart-expense-4)",
    })),
    ...workspace.savings.movements.flatMap((movement) => {
      const day = localDay(movement.createdAt);
      if (movement.kind !== "contribution" || !day.startsWith(month)) return [];
      return [{
        id: movement.id, kind: "contribution" as const, day,
        label: "Ahorro registrado", category: `Aporte · ${movement.placeName} · a tus objetivos`,
        amount: { amount: movement.amount, currency: movement.currency }, recurring: false, icon: PiggyBank,
      }];
    }),
  ];
  return groupByDay(items.filter((item) => filter === "all" || item.kind === filter), (item) => item.day)
    .map(({ day, entries }) => ({ day, items: entries.map(({ day: _day, ...item }) => item) }));
}

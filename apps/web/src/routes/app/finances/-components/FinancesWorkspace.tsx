import { useState } from "react";
import type { FinancesWorkspace } from "@repo/shared-types";
import { FloatingAdd } from "../../../../components/norte/FloatingAdd";
import type { GroupByValue } from "../../../../components/norte/GroupBy";
import { MonthStepper } from "../../../../components/norte/MonthStepper";
import {
  HeaderAction,
  PageHeader,
} from "../../../../components/norte/PageHeader";
import { Page, SplitLayout } from "../../../../components/norte/PageLayout";
import { monthTitle } from "../../-components/home-view";
import { ExpenseSheet } from "./ExpenseSheet";
import { FinancesMovements } from "./FinancesMovements";
import { FinancesSummary } from "./FinancesSummary";
import {
  ExpenseWorkspaceTab,
  IncomeWorkspaceTab,
} from "./FinancesWorkspaceTabs";
import { SavingsPlacesTab } from "./SavingsPlacesTab";
import { useFinancesMonth } from "./useFinancesMonth";

export type FinancesWorkspaceData = FinancesWorkspace;

export type FinancesView =
  "summary" | "incomes" | "expenses" | "savings" | "benefits";

const TITLES = {
  incomes: "Ingresos",
  expenses: "Gastos",
  savings: "Ahorros",
  benefits: "Beneficios",
} as const;

function MonthStatus({ loading, error }: { loading: boolean; error: boolean }) {
  if (loading)
    return (
      <p role="status" className="m-0 text-body-sm text-muted-foreground">
        Cargando finanzas del mes…
      </p>
    );
  if (error)
    return (
      <p role="alert" className="m-0 text-body-sm text-negative">
        No pudimos cargar las finanzas de este mes.
      </p>
    );
  return null;
}

function SubPageContent({
  view,
  current,
  month,
  incomeProps,
  expenseProps,
  savingsProps,
}: {
  view: FinancesView;
  current: FinancesWorkspaceData | null;
  month: string;
  incomeProps: {
    createOpen: boolean;
    editingId: string | null;
    groupBy: GroupByValue;
    onCreateOpenChange: (open: boolean) => void;
    onEditingIdChange: (id: string | null) => void;
    onGroupByChange: (v: GroupByValue) => void;
  };
  expenseProps: {
    createOpen: boolean;
    editingId: string | null;
    groupBy: GroupByValue;
    onCreateOpenChange: (open: boolean) => void;
    onEditingIdChange: (id: string | null) => void;
    onGroupByChange: (v: GroupByValue) => void;
  };
  savingsProps: {
    createOpen: boolean;
    onCreateOpenChange: (open: boolean) => void;
  };
}) {
  if (!current) return null;
  switch (view) {
    case "incomes":
      return (
        <IncomeWorkspaceTab
          month={month}
          incomes={current.incomes}
          {...incomeProps}
        />
      );
    case "expenses":
      return (
        <ExpenseWorkspaceTab
          month={month}
          expenses={current.expenses}
          {...expenseProps}
        />
      );
    case "savings":
      return <SavingsPlacesTab workspace={current.savings} {...savingsProps} />;
    default:
      return null;
  }
}

function SummaryView({
  selectedMonth,
  selectMonth,
  current,
  status,
  isAddOpen,
  setIsAddOpen,
}: {
  selectedMonth: string;
  selectMonth: (month: string) => void;
  current: FinancesWorkspaceData | null;
  status: React.ReactNode;
  isAddOpen: boolean;
  setIsAddOpen: (open: boolean) => void;
}) {
  return (
    <Page className="pb-24 xl:pb-12">
      <PageHeader
        eyebrow="Finanzas"
        title={monthTitle(selectedMonth)}
        trailing={
          <MonthStepper
            value={selectedMonth}
            onValueChange={selectMonth}
            aria-label="Mes de finanzas"
          />
        }
        action={
          <HeaderAction
            label="Agregar"
            onClick={() => setIsAddOpen(true)}
            disabled={!current}
          />
        }
      />
      {status}
      {current && (
        <>
          <SplitLayout aside={<FinancesSummary workspace={current} />}>
            <FinancesMovements workspace={current} />
          </SplitLayout>
          <FloatingAdd
            aria-label="Agregar gasto"
            onClick={() => setIsAddOpen(true)}
          />
          <ExpenseSheet
            open={isAddOpen}
            onOpenChange={setIsAddOpen}
            month={current.month}
            sources={current.expenses.sources}
          />
        </>
      )}
    </Page>
  );
}

export function FinancesWorkspace({
  workspace,
  initialMonth = new Date().toISOString().slice(0, 7),
  view,
  children,
}: {
  workspace: FinancesWorkspaceData;
  initialMonth?: string;
  view: FinancesView;
  children?: React.ReactNode;
}) {
  const { selectedMonth, selectMonth, current, loadingMonth, loadError } =
    useFinancesMonth(workspace, initialMonth);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [isCreateExpenseOpen, setIsCreateExpenseOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [isCreatePlaceOpen, setIsCreatePlaceOpen] = useState(false);
  const [expenseGroupBy, setExpenseGroupBy] =
    useState<GroupByValue>("category");
  const [incomeGroupBy, setIncomeGroupBy] = useState<GroupByValue>("category");

  const CTA: Partial<Record<FinancesView, [string, () => void]>> = {
    incomes: ["Agregar ingreso", () => setIsCreateOpen(true)],
    expenses: ["Agregar gasto", () => setIsCreateExpenseOpen(true)],
    savings: ["Agregar lugar", () => setIsCreatePlaceOpen(true)],
  };
  const cta = CTA[view];

  const status = <MonthStatus loading={loadingMonth} error={loadError} />;

  if (view === "summary") {
    return (
      <SummaryView
        selectedMonth={selectedMonth}
        selectMonth={selectMonth}
        current={current}
        status={status}
        isAddOpen={isAddOpen}
        setIsAddOpen={setIsAddOpen}
      />
    );
  }

  const hasMonthStepper = view === "incomes" || view === "expenses";

  return (
    <Page wide className="pb-24 xl:pb-12">
      <PageHeader
        title={TITLES[view]}
        stickyMobile
        backTo="/app/finances"
        breadcrumb={[
          { label: "Finanzas", to: "/app/finances" },
          { label: TITLES[view] },
        ]}
        trailing={
          hasMonthStepper ? (
            <MonthStepper
              value={selectedMonth}
              onValueChange={selectMonth}
              aria-label="Mes de finanzas"
            />
          ) : undefined
        }
        action={
          cta && (
            <HeaderAction label={cta[0]} onClick={cta[1]} disabled={!current} />
          )
        }
      />
      {view === "benefits" ? (
        children
      ) : (
        <>
          {status}
          <SubPageContent
            view={view}
            current={current}
            month={selectedMonth}
            incomeProps={{
              createOpen: isCreateOpen,
              editingId: editingIncomeId,
              groupBy: incomeGroupBy,
              onCreateOpenChange: setIsCreateOpen,
              onEditingIdChange: setEditingIncomeId,
              onGroupByChange: setIncomeGroupBy,
            }}
            expenseProps={{
              createOpen: isCreateExpenseOpen,
              editingId: editingExpenseId,
              groupBy: expenseGroupBy,
              onCreateOpenChange: setIsCreateExpenseOpen,
              onEditingIdChange: setEditingExpenseId,
              onGroupByChange: setExpenseGroupBy,
            }}
            savingsProps={{
              createOpen: isCreatePlaceOpen,
              onCreateOpenChange: setIsCreatePlaceOpen,
            }}
          />
        </>
      )}
    </Page>
  );
}

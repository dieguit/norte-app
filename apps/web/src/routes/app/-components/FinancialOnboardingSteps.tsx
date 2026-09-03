import { useEffect, useRef } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { formatMoney } from "../../../lib/format";
import { createMoney } from "../../../lib/money";
import { FIXED_EXPENSE_SOURCES } from "../../../features/financial/expenses";
import type { ExpenseDraft } from "../../../features/financial/expenses.schema";
import { FIXED_INCOME_SOURCES } from "../../../features/financial/incomes";
import type { IncomeDraft } from "../../../features/financial/incomes.schema";
import type { GoalCreationContext } from "../../../features/goals/goal-creation";
import { GoalObjectiveFields } from "../goals/-components/GoalObjectiveFields";
import { ExpenseSheet } from "../finances/-components/ExpenseSheet";
import { IncomeSheet } from "../finances/-components/IncomeSheet";
import type {
  OnboardingExpense,
  OnboardingIncome,
  OnboardingStep,
} from "./financial-onboarding.types";

const STEP_LABELS = ["Bienvenida", "Objetivo", "Ingresos", "Gastos"] as const;

function incomeSourceLabel(draft: IncomeDraft) {
  if (draft.source.kind === "custom") {
    return "name" in draft.source ? draft.source.name : "Fuente personalizada";
  }
  return FIXED_INCOME_SOURCES[draft.source.kind];
}

function expenseSourceLabel(draft: ExpenseDraft) {
  if (draft.source.kind === "custom") {
    return "name" in draft.source
      ? draft.source.name
      : "Concepto personalizado";
  }
  return FIXED_EXPENSE_SOURCES[draft.source.kind];
}

export function OnboardingProgress({ step }: { step: OnboardingStep }) {
  return (
    <nav aria-label="Progreso del onboarding" className="mb-4">
      <div className="text-center text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)]">
        Paso {step} de 4
        <span className="sr-only">: {STEP_LABELS[step - 1]}</span>
      </div>
      <div
        role="progressbar"
        aria-label="Progreso del onboarding"
        aria-valuemin={1}
        aria-valuemax={STEP_LABELS.length}
        aria-valuenow={step}
        aria-valuetext={`Paso ${step} de ${STEP_LABELS.length}: ${STEP_LABELS[step - 1]}`}
        className="mx-auto mt-2 flex h-1.5 w-36 gap-2 overflow-hidden rounded-full"
      >
        {STEP_LABELS.map((label, index) => {
          const number = (index + 1) as OnboardingStep;
          return (
            <div
              key={label}
              className={`h-full flex-1 rounded-full ${number <= step ? "bg-[var(--palm)]" : "bg-[var(--line)]"}`}
            />
          );
        })}
      </div>
    </nav>
  );
}

export function WelcomeStep({ onContinue }: { onContinue: () => void }) {
  return (
    <section className="flex flex-col gap-6" aria-labelledby="welcome-title">
      <div>
        <h1
          id="welcome-title"
          className="font-serif text-3xl font-bold tracking-tight text-[var(--sea-ink)]"
        >
          Hola, te damos la bienvenida a Norte!
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--sea-ink-soft)] sm:text-base">
          Norte conecta lo que querés lograr con tus ingresos y gastos para
          mostrarte un camino posible.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <article>
          <h2 className="font-semibold text-[var(--sea-ink)]">Objetivos</h2>
          <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
            Definí qué querés alcanzar.
          </p>
        </article>
        <article>
          <h2 className="font-semibold text-[var(--sea-ink)]">Finanzas</h2>
          <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
            Sumá ingresos y gastos para entender tu punto de partida.
          </p>
        </article>
        <article>
          <h2 className="font-semibold text-[var(--sea-ink)]">Hoja de ruta</h2>
          <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
            Seguí cómo cada decisión cambia tu camino.
          </p>
        </article>
      </div>
      <div className="flex justify-end">
        <Button type="button" onClick={onContinue}>
          Empezar
        </Button>
      </div>
    </section>
  );
}

export function ObjectiveStep({
  form,
  context,
  validationErrors,
  onBack,
  onContinue,
}: {
  form: Parameters<typeof GoalObjectiveFields>[0]["form"];
  context: GoalCreationContext;
  validationErrors: Record<string, string>;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <section className="flex flex-col gap-6" aria-labelledby="objective-title">
      <div>
        <h1
          id="objective-title"
          className="font-serif text-3xl font-bold tracking-tight text-[var(--sea-ink)]"
        >
          Elegí tu primer objetivo
        </h1>
        <p className="mt-2 text-sm text-[var(--sea-ink-soft)]">
          Empezamos por uno. Más adelante vas a poder sumar o cambiar
          objetivos.
        </p>
      </div>
      <GoalObjectiveFields
        form={form}
        context={context}
        validationErrors={validationErrors}
        showStrategyFields={false}
      />
      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          Volver
        </Button>
        <Button type="button" onClick={onContinue}>
          Continuar
        </Button>
      </div>
    </section>
  );
}

function IncomeRow({
  income,
  onEdit,
  onRemove,
}: {
  income: OnboardingIncome;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const label = incomeSourceLabel(income.draft);
  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-[var(--sea-ink)]">{label}</p>
        <p className="mt-1 text-sm tabular-nums text-[var(--sea-ink-soft)]">
          {formatMoney(createMoney(income.draft.amount, income.draft.currency))}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Editar ingreso ${label}`}
          onClick={() => onEdit(income.id)}
        >
          <Pencil aria-hidden="true" />
          Editar
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Eliminar ingreso ${label}`}
          onClick={() => onRemove(income.id)}
        >
          <Trash2 aria-hidden="true" />
          Eliminar
        </Button>
      </div>
    </li>
  );
}

function IncomeList({
  drafts,
  total,
  onEdit,
  onRemove,
}: {
  drafts: OnboardingIncome[];
  total: string;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <section
      aria-labelledby="recurring-incomes-title"
      className="flex flex-col gap-3"
    >
      <h2
        id="recurring-incomes-title"
        className="font-serif text-xl font-bold text-[var(--sea-ink)]"
      >
        Ingresos recurrentes
      </h2>
      <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)]">
        <ul className="divide-y divide-[var(--line)]">
          {drafts.map((income) => (
            <IncomeRow
              key={income.id}
              income={income}
              onEdit={onEdit}
              onRemove={onRemove}
            />
          ))}
        </ul>
        <div className="flex items-center justify-between gap-4 border-t border-[var(--line)] bg-[var(--foam)] px-4 py-3">
          <span className="text-sm font-semibold text-[var(--sea-ink)]">
            Total mensual estimado
          </span>
          <span className="font-semibold tabular-nums text-[var(--sea-ink)]">
            {formatMoney(createMoney(total, "ARS"))}
          </span>
        </div>
      </div>
    </section>
  );
}

export function IncomeStep({
  currentMonth,
  drafts,
  editingDraft,
  sheetOpen,
  total,
  onNew,
  onEdit,
  onRemove,
  onSheetChange,
  onSave,
  onBack,
  onContinue,
}: {
  currentMonth: string;
  drafts: OnboardingIncome[];
  editingDraft?: IncomeDraft;
  sheetOpen: boolean;
  total: string;
  onNew: () => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  onSheetChange: (open: boolean) => void;
  onSave: (draft: IncomeDraft) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <section className="flex flex-col gap-6" aria-labelledby="income-title">
      <IncomeHeader onNew={onNew} />
      {drafts.length === 0 ? (
        <p className="rounded-xl border border-[var(--line)] bg-[var(--foam)] p-4 text-sm text-[var(--sea-ink-soft)]">
          Agregá tus ingresos mensuales para entender tu punto de partida.
        </p>
      ) : (
        <IncomeList
          drafts={drafts}
          total={total}
          onEdit={onEdit}
          onRemove={onRemove}
        />
      )}
      <IncomeActions
        hasIncome={drafts.length > 0}
        onBack={onBack}
        onContinue={onContinue}
      />
      <IncomeSheet
        open={sheetOpen}
        onOpenChange={onSheetChange}
        month={currentMonth}
        sources={[]}
        draft={editingDraft}
        onSaveDraft={onSave}
        recurringOnly
      />
    </section>
  );
}

function IncomeHeader({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1
          id="income-title"
          className="font-serif text-3xl font-bold tracking-tight text-[var(--sea-ink)]"
        >
          Ingresos
        </h1>
        <p className="mt-2 text-sm text-[var(--sea-ink-soft)]">
          Sumá el dinero que recibís normalmente cada mes.
        </p>
      </div>
      <Button type="button" onClick={onNew}>
        Agregar ingreso
      </Button>
    </div>
  );
}

function IncomeActions({
  hasIncome,
  onBack,
  onContinue,
}: {
  hasIncome: boolean;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {!hasIncome && (
        <p
          id="income-requirement"
          className="text-right text-sm text-[var(--sea-ink-soft)]"
        >
          Agregá al menos un ingreso recurrente para continuar.
        </p>
      )}
      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          Volver
        </Button>
        <Button
          type="button"
          disabled={!hasIncome}
          aria-describedby={!hasIncome ? "income-requirement" : undefined}
          onClick={onContinue}
        >
          Continuar
        </Button>
      </div>
    </div>
  );
}

function ExpenseRow({
  expense,
  onEdit,
  onRemove,
}: {
  expense: OnboardingExpense;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const label = expenseSourceLabel(expense.draft);
  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-[var(--sea-ink)]">{label}</p>
        <p className="mt-1 text-sm tabular-nums text-[var(--sea-ink-soft)]">
          {formatMoney(createMoney(expense.draft.amount, expense.draft.currency))}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Editar gasto ${label}`}
          onClick={() => onEdit(expense.id)}
        >
          <Pencil aria-hidden="true" />
          Editar
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Eliminar gasto ${label}`}
          onClick={() => onRemove(expense.id)}
        >
          <Trash2 aria-hidden="true" />
          Eliminar
        </Button>
      </div>
    </li>
  );
}

function ExpenseList({
  drafts,
  total,
  onEdit,
  onRemove,
}: {
  drafts: OnboardingExpense[];
  total: string;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <section
      aria-labelledby="recurring-expenses-title"
      className="flex flex-col gap-3"
    >
      <h2
        id="recurring-expenses-title"
        className="font-serif text-xl font-bold text-[var(--sea-ink)]"
      >
        Gastos recurrentes
      </h2>
      <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)]">
        <ul className="divide-y divide-[var(--line)]">
          {drafts.map((expense) => (
            <ExpenseRow
              key={expense.id}
              expense={expense}
              onEdit={onEdit}
              onRemove={onRemove}
            />
          ))}
        </ul>
        <div className="flex items-center justify-between gap-4 border-t border-[var(--line)] bg-[var(--foam)] px-4 py-3">
          <span className="text-sm font-semibold text-[var(--sea-ink)]">
            Total mensual estimado
          </span>
          <span className="font-semibold tabular-nums text-[var(--sea-ink)]">
            {formatMoney(createMoney(total, "ARS"))}
          </span>
        </div>
      </div>
    </section>
  );
}

export function ExpenseStep({
  currentMonth,
  drafts,
  editingDraft,
  sheetOpen,
  total,
  submissionError,
  isSubmitting,
  onNew,
  onEdit,
  onRemove,
  onSheetChange,
  onSave,
  onBack,
  onSubmit,
}: {
  currentMonth: string;
  drafts: OnboardingExpense[];
  editingDraft?: ExpenseDraft;
  sheetOpen: boolean;
  total: string;
  submissionError: string | null;
  isSubmitting: boolean;
  onNew: () => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  onSheetChange: (open: boolean) => void;
  onSave: (draft: ExpenseDraft) => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const hasExpenses = drafts.length > 0;
  return (
    <section className="flex flex-col gap-6" aria-labelledby="expenses-title">
      <ExpenseHeader onNew={onNew} />
      <ExpenseRecords
        hasExpenses={hasExpenses}
        drafts={drafts}
        total={total}
        onEdit={onEdit}
        onRemove={onRemove}
      />
      <ExpenseActions
        hasExpenses={hasExpenses}
        submissionError={submissionError}
        isSubmitting={isSubmitting}
        onBack={onBack}
        onSubmit={onSubmit}
      />
      <ExpenseSheetView
        open={sheetOpen}
        onOpenChange={onSheetChange}
        month={currentMonth}
        draft={editingDraft}
        onSave={onSave}
      />
    </section>
  );
}

function ExpenseHeader({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1
          id="expenses-title"
          className="font-serif text-3xl font-bold tracking-tight text-[var(--sea-ink)]"
        >
          Gastos
        </h1>
        <p className="mt-2 text-sm text-[var(--sea-ink-soft)]">
          Sumá el dinero que gastás normalmente cada mes.
        </p>
      </div>
      <Button type="button" onClick={onNew}>
        Agregar gasto
      </Button>
    </div>
  );
}

function ExpenseRecords({
  hasExpenses,
  drafts,
  total,
  onEdit,
  onRemove,
}: {
  hasExpenses: boolean;
  drafts: OnboardingExpense[];
  total: string;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return !hasExpenses ? (
    <p className="rounded-xl border border-[var(--line)] bg-[var(--foam)] p-4 text-sm text-[var(--sea-ink-soft)]">
      Agregá tus gastos mensuales para entender cuánto dinero queda disponible.
    </p>
  ) : (
    <ExpenseList
      drafts={drafts}
      total={total}
      onEdit={onEdit}
      onRemove={onRemove}
    />
  );
}

function ExpenseActions({
  hasExpenses,
  submissionError,
  isSubmitting,
  onBack,
  onSubmit,
}: {
  hasExpenses: boolean;
  submissionError: string | null;
  isSubmitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (submissionError) errorRef.current?.focus();
  }, [submissionError]);

  return (
    <div className="flex flex-col gap-3">
      {submissionError && (
        <p
          ref={errorRef}
          id="expense-submission-error"
          role="alert"
          tabIndex={-1}
          className="text-right text-sm text-destructive"
        >
          {submissionError}
        </p>
      )}
      {!hasExpenses && (
        <p id="expense-requirement" className="text-right text-sm text-[var(--sea-ink-soft)]">
          Agregá al menos un gasto recurrente para completar este paso.
        </p>
      )}
      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
          Volver
        </Button>
        <Button
          type="button"
          disabled={!hasExpenses || isSubmitting}
          aria-describedby={
            submissionError
              ? "expense-submission-error"
              : !hasExpenses
                ? "expense-requirement"
                : undefined
          }
          onClick={onSubmit}
        >
          {isSubmitting ? "Guardando..." : "Listo, continuar al plan"}
        </Button>
      </div>
    </div>
  );
}

function ExpenseSheetView({
  open,
  onOpenChange,
  month,
  draft,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string;
  draft?: ExpenseDraft;
  onSave: (draft: ExpenseDraft) => void;
}) {
  return (
    <ExpenseSheet
      open={open}
      onOpenChange={onOpenChange}
      month={month}
      sources={[]}
      draft={draft}
      onSaveDraft={onSave}
      recurringOnly
    />
  );
}

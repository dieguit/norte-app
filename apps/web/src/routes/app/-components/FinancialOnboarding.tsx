import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { formatMoney } from "../../../lib/format";
import { createMoney } from "../../../lib/money";
import {
  FIXED_EXPENSE_SOURCES,
  getExpenseTotalArs,
} from "../../../features/financial/expenses";
import type { ExpenseDraft } from "../../../features/financial/expenses.schema";
import {
  completeFinancialOnboarding,
} from "../../../features/financial/financial.functions";
import {
  FIXED_INCOME_SOURCES,
  getIncomeTotalArs,
} from "../../../features/financial/incomes";
import type { IncomeDraft } from "../../../features/financial/incomes.schema";
import type { GoalCreationContext } from "../../../features/goals/goal-creation";
import { createObjectiveSchema } from "../../../features/goals/goal-creation.schema";
import { ExpenseSheet } from "../finances/-components/ExpenseSheet";
import { IncomeSheet } from "../finances/-components/IncomeSheet";
import { GoalObjectiveFields } from "../goals/-components/GoalObjectiveFields";
import { useGoalCreationForm } from "../goals/-components/useGoalCreationForm";

type OnboardingStep = 1 | 2 | 3 | 4;

type OnboardingIncome = {
  id: string;
  draft: IncomeDraft;
};

type OnboardingExpense = {
  id: string;
  draft: ExpenseDraft;
};

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

const STEP_LABELS = ["Bienvenida", "Objetivo", "Ingresos", "Gastos"] as const;

export function FinancialOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>(1);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [incomeDrafts, setIncomeDrafts] = useState<OnboardingIncome[]>([]);
  const [incomeSheetOpen, setIncomeSheetOpen] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [expenseDrafts, setExpenseDrafts] = useState<OnboardingExpense[]>([]);
  const [expenseSheetOpen, setExpenseSheetOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const objectiveForm = useGoalCreationForm({
    type: "emergency_fund",
    name: "Colchón financiero",
    currency: "USD",
    strategy: "save",
  });
  const objectiveContext: GoalCreationContext = {
    currentMonth,
    expensesKnowledge: "known",
    hasEmergencyFund: false,
  };

  const editingIncome = incomeDrafts.find(({ id }) => id === editingIncomeId);
  const incomeTotal = getIncomeTotalArs(
    incomeDrafts.map(({ draft }) => ({
      amount: { amount: draft.amount, currency: draft.currency },
      recurring: draft.recurring,
      effectiveMonth: draft.effectiveMonth,
    })),
    currentMonth,
  );

  const editingExpense = expenseDrafts.find(
    ({ id }) => id === editingExpenseId,
  );
  const expenseTotal = getExpenseTotalArs(
    expenseDrafts.map(({ draft }) => ({
      amount: { amount: draft.amount, currency: draft.currency },
      recurring: true,
      effectiveMonth: currentMonth,
      endMonth: null,
    })),
    currentMonth,
  );

  const continueFromObjective = () => {
    const result = createObjectiveSchema(currentMonth).safeParse(
      objectiveForm.state.values,
    );
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join(".");
        if (!errors[path]) errors[path] = issue.message;
      }
      setValidationErrors(errors);
      setTimeout(() => {
        document
          .querySelector<HTMLElement>(
            '[data-invalid="true"] input, [data-invalid="true"] button',
          )
          ?.focus();
      }, 0);
      return;
    }

    setValidationErrors({});
    setStep(3);
  };

  function openNewIncome() {
    setEditingIncomeId(null);
    setIncomeSheetOpen(true);
  }

  function saveIncomeDraft(draft: IncomeDraft) {
    setIncomeDrafts((current) =>
      editingIncomeId
        ? current.map((income) =>
            income.id === editingIncomeId ? { ...income, draft } : income,
          )
        : [...current, { id: crypto.randomUUID(), draft }],
    );
  }

  function removeIncome(id: string) {
    if (!window.confirm("¿Eliminar este ingreso?")) return;
    setIncomeDrafts((current) => current.filter((income) => income.id !== id));
  }

  function openNewExpense() {
    setEditingExpenseId(null);
    setExpenseSheetOpen(true);
  }

  function saveExpenseDraft(draft: ExpenseDraft) {
    setExpenseDrafts((current) =>
      editingExpenseId
        ? current.map((expense) =>
            expense.id === editingExpenseId ? { ...expense, draft } : expense,
          )
        : [...current, { id: crypto.randomUUID(), draft }],
    );
  }

  function removeExpense(id: string) {
    if (!window.confirm("¿Eliminar este gasto?")) return;
    setExpenseDrafts((current) =>
      current.filter((expense) => expense.id !== id),
    );
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setSubmissionError(null);
    try {
      const result = await completeFinancialOnboarding({
        data: {
          goal: objectiveForm.state.values,
          incomes: incomeDrafts.map(({ draft }) => draft),
          expenses: expenseDrafts.map(({ draft }) => draft),
        },
      })
      if (!result.created) {
        setSubmissionError(
          "Ya existe un plan para tu cuenta. Recargá la página para continuarlo.",
        );
        setIsSubmitting(false);
        return;
      }
      await router.invalidate();
      await router.navigate({ to: "/app" });
    } catch {
      setSubmissionError(
        "No pudimos guardar tu plan. Revisá tu conexión e intentá de nuevo.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col px-4 py-4 pb-28 sm:px-6 sm:py-12 sm:pb-24">
      <nav aria-label="Progreso del onboarding" className="mb-4">
        <div className="text-center text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)]">
          Paso {step} de 4
          <span className="sr-only">: {STEP_LABELS[step - 1]}</span>
        </div>
        <div className="mx-auto mt-2 flex h-1.5 w-36 gap-2 overflow-hidden rounded-full">
          {STEP_LABELS.map((label, index) => {
            const number = (index + 1) as OnboardingStep;
            return (
              <div
                key={label}
                aria-current={number === step ? "step" : undefined}
                className={`h-full flex-1 rounded-full ${number <= step ? "bg-[var(--palm)]" : "bg-[var(--line)]"}`}
              />
            );
          })}
        </div>
      </nav>

      <main className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow-card)] sm:p-8">
        {step === 1 && (
          <section
            className="flex flex-col gap-6"
            aria-labelledby="welcome-title"
          >
            <div>
              <h1
                id="welcome-title"
                className="font-serif text-3xl font-bold tracking-tight text-[var(--sea-ink)]"
              >
                Hola, te damos la bienvenida a Norte!
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-[var(--sea-ink-soft)] sm:text-base">
                Norte conecta lo que querés lograr con tus ingresos y gastos
                para mostrarte un camino posible.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <article>
                <h2 className="font-semibold text-[var(--sea-ink)]">
                  Objetivos
                </h2>
                <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
                  Definí qué querés alcanzar.
                </p>
              </article>
              <article>
                <h2 className="font-semibold text-[var(--sea-ink)]">
                  Finanzas
                </h2>
                <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
                  Sumá ingresos y gastos para entender tu punto de partida.
                </p>
              </article>
              <article>
                <h2 className="font-semibold text-[var(--sea-ink)]">
                  Hoja de ruta
                </h2>
                <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
                  Seguí cómo cada decisión cambia tu camino.
                </p>
              </article>
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={() => setStep(2)}>
                Empezar
              </Button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section
            className="flex flex-col gap-6"
            aria-labelledby="objective-title"
          >
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
              form={objectiveForm}
              context={objectiveContext}
              validationErrors={validationErrors}
              showStrategyFields={false}
            />
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
              >
                Volver
              </Button>
              <Button type="button" onClick={continueFromObjective}>
                Continuar
              </Button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section
            className="flex flex-col gap-6"
            aria-labelledby="income-title"
          >
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
              <Button type="button" onClick={openNewIncome}>
                Agregar ingreso
              </Button>
            </div>

            {incomeDrafts.length === 0 ? (
              <p className="rounded-xl border border-[var(--line)] bg-[var(--foam)] p-4 text-sm text-[var(--sea-ink-soft)]">
                Agregá tus ingresos mensuales para entender tu punto de partida.
              </p>
            ) : (
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
                    {incomeDrafts.map((income) => {
                      const label = incomeSourceLabel(income.draft);
                      return (
                        <li
                          key={income.id}
                          className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="font-semibold text-[var(--sea-ink)]">
                              {label}
                            </p>
                            <p className="mt-1 text-sm tabular-nums text-[var(--sea-ink-soft)]">
                              {formatMoney(
                                createMoney(
                                  income.draft.amount,
                                  income.draft.currency,
                                ),
                              )}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              aria-label={`Editar ingreso ${label}`}
                              onClick={() => {
                                setEditingIncomeId(income.id);
                                setIncomeSheetOpen(true);
                              }}
                            >
                              <Pencil aria-hidden="true" />
                              Editar
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              aria-label={`Eliminar ingreso ${label}`}
                              onClick={() => removeIncome(income.id)}
                            >
                              <Trash2 aria-hidden="true" />
                              Eliminar
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="flex items-center justify-between gap-4 border-t border-[var(--line)] bg-[var(--foam)] px-4 py-3">
                    <span className="text-sm font-semibold text-[var(--sea-ink)]">
                      Total mensual estimado
                    </span>
                    <span className="font-semibold tabular-nums text-[var(--sea-ink)]">
                      {formatMoney(createMoney(incomeTotal.amount, "ARS"))}
                    </span>
                  </div>
                </div>
              </section>
            )}

            <div className="flex flex-col gap-3">
              {incomeDrafts.length === 0 && (
                <p
                  id="income-requirement"
                  className="text-sm text-[var(--sea-ink-soft)] text-right"
                >
                  Agregá al menos un ingreso recurrente para continuar.
                </p>
              )}
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                >
                  Volver
                </Button>
                <Button
                  type="button"
                  disabled={incomeDrafts.length === 0}
                  aria-describedby={
                    incomeDrafts.length === 0 ? "income-requirement" : undefined
                  }
                  onClick={() => setStep(4)}
                >
                  Continuar
                </Button>
              </div>
            </div>

            <IncomeSheet
              open={incomeSheetOpen}
              onOpenChange={(open) => {
                setIncomeSheetOpen(open);
                if (!open) setEditingIncomeId(null);
              }}
              month={currentMonth}
              sources={[]}
              draft={editingIncome?.draft}
              onSaveDraft={saveIncomeDraft}
              recurringOnly
            />
          </section>
        )}

        {step === 4 && (
          <section
            className="flex flex-col gap-6"
            aria-labelledby="expenses-title"
          >
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
              <Button type="button" onClick={openNewExpense}>
                Agregar gasto
              </Button>
            </div>

            {expenseDrafts.length === 0 ? (
              <p className="rounded-xl border border-[var(--line)] bg-[var(--foam)] p-4 text-sm text-[var(--sea-ink-soft)]">
                Agregá tus gastos mensuales para entender cuánto dinero queda
                disponible.
              </p>
            ) : (
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
                    {expenseDrafts.map((expense) => {
                      const label = expenseSourceLabel(expense.draft);
                      return (
                        <li
                          key={expense.id}
                          className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="font-semibold text-[var(--sea-ink)]">
                              {label}
                            </p>
                            <p className="mt-1 text-sm tabular-nums text-[var(--sea-ink-soft)]">
                              {formatMoney(
                                createMoney(
                                  expense.draft.amount,
                                  expense.draft.currency,
                                ),
                              )}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              aria-label={`Editar gasto ${label}`}
                              onClick={() => {
                                setEditingExpenseId(expense.id);
                                setExpenseSheetOpen(true);
                              }}
                            >
                              <Pencil aria-hidden="true" />
                              Editar
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              aria-label={`Eliminar gasto ${label}`}
                              onClick={() => removeExpense(expense.id)}
                            >
                              <Trash2 aria-hidden="true" />
                              Eliminar
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="flex items-center justify-between gap-4 border-t border-[var(--line)] bg-[var(--foam)] px-4 py-3">
                    <span className="text-sm font-semibold text-[var(--sea-ink)]">
                      Total mensual estimado
                    </span>
                    <span className="font-semibold tabular-nums text-[var(--sea-ink)]">
                      {formatMoney(createMoney(expenseTotal.amount, "ARS"))}
                    </span>
                  </div>
                </div>
              </section>
            )}

            <div className="flex flex-col gap-3">
              {submissionError && (
                <p
                  id="expense-submission-error"
                  className="text-sm text-right text-destructive"
                >
                  {submissionError}
                </p>
              )}
              {expenseDrafts.length === 0 && (
                <p
                  id="expense-requirement"
                  className="text-sm text-right text-[var(--sea-ink-soft)]"
                >
                  Agregá al menos un gasto recurrente para completar este paso.
                </p>
              )}
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(3)}
                  disabled={isSubmitting}
                >
                  Volver
                </Button>
                <Button
                  type="button"
                  disabled={expenseDrafts.length === 0 || isSubmitting}
                  aria-describedby={
                    submissionError
                      ? "expense-submission-error"
                      : expenseDrafts.length === 0
                        ? "expense-requirement"
                        : undefined
                  }
                  onClick={handleSubmit}
                >
                  {isSubmitting ? "Guardando..." : "Listo, continuar al plan"}
                </Button>
              </div>
            </div>

            <ExpenseSheet
              open={expenseSheetOpen}
              onOpenChange={(open) => {
                setExpenseSheetOpen(open);
                if (!open) setEditingExpenseId(null);
              }}
              month={currentMonth}
              sources={[]}
              draft={editingExpense?.draft}
              onSaveDraft={saveExpenseDraft}
              recurringOnly
            />
          </section>
        )}
      </main>
    </div>
  );
}

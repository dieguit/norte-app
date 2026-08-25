import { useState } from "react";
import { Button } from "../../../components/ui/button";
import { createObjectiveSchema } from "../../../features/goals/goal-creation.schema";
import type { GoalCreationContext } from "../../../features/goals/goal-creation";
import { GoalObjectiveFields } from "../goals/-components/GoalObjectiveFields";
import { useGoalCreationForm } from "../goals/-components/useGoalCreationForm";

type OnboardingStep = 1 | 2 | 3 | 4;

const STEP_LABELS = ["Bienvenida", "Objetivo", "Ingresos", "Gastos"] as const;

export function FinancialOnboarding() {
  const [step, setStep] = useState<OnboardingStep>(1);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
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

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col px-4 py-8 pb-28 sm:px-6 sm:py-12 sm:pb-24">
      <nav aria-label="Progreso del onboarding" className="mb-8">
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
                Tu plan empieza con una dirección clara
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
            <div>
              <h1
                id="income-title"
                className="font-serif text-3xl font-bold tracking-tight text-[var(--sea-ink)]"
              >
                Ingresos
              </h1>
              <p className="mt-2 text-sm text-[var(--sea-ink-soft)]">
                Acá vas a registrar de dónde viene tu dinero y cuándo lo
                recibís.
              </p>
            </div>
            <p className="rounded-xl border border-[var(--line)] bg-[var(--foam)] p-4 text-sm text-[var(--sea-ink-soft)]">
              Este paso se completa en la próxima etapa.
            </p>
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(2)}
              >
                Volver
              </Button>
              <Button type="button" onClick={() => setStep(4)}>
                Continuar
              </Button>
            </div>
          </section>
        )}

        {step === 4 && (
          <section
            className="flex flex-col gap-6"
            aria-labelledby="expenses-title"
          >
            <div>
              <h1
                id="expenses-title"
                className="font-serif text-3xl font-bold tracking-tight text-[var(--sea-ink)]"
              >
                Gastos
              </h1>
              <p className="mt-2 text-sm text-[var(--sea-ink-soft)]">
                Acá vas a registrar tus gastos para entender cuánto dinero queda
                disponible cada mes.
              </p>
            </div>
            <p className="rounded-xl border border-[var(--line)] bg-[var(--foam)] p-4 text-sm text-[var(--sea-ink-soft)]">
              Este paso se completa en la próxima etapa.
            </p>
            <div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(3)}
              >
                Volver
              </Button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

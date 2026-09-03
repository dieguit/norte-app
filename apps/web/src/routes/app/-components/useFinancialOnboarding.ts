import { useState } from "react";
import { usePostHog } from "@posthog/react";
import { useRouter } from "@tanstack/react-router";
import type { GoalCreationContext } from "../../../features/goals/goal-creation";
import { createObjectiveSchema } from "../../../features/goals/goal-creation.schema";
import { getExpenseTotalArs } from "../../../features/financial/expenses";
import { completeFinancialOnboarding } from "../../../features/financial/financial.functions";
import { getIncomeTotalArs } from "../../../features/financial/incomes";
import { createMoney } from "../../../lib/money";
import type { GoalCreationFormApi } from "../goals/-components/useGoalCreationForm";
import { useGoalCreationForm } from "../goals/-components/useGoalCreationForm";
import type {
  OnboardingExpense,
  OnboardingIncome,
  OnboardingStep,
} from "./financial-onboarding.types";

function useIncomeDrafts() {
  const [drafts, setDrafts] = useState<OnboardingIncome[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return {
    drafts,
    sheetOpen,
    editingDraft: drafts.find(({ id }) => id === editingId),
    openNew: () => {
      setEditingId(null);
      setSheetOpen(true);
    },
    openEdit: (id: string) => {
      setEditingId(id);
      setSheetOpen(true);
    },
    save: (draft: OnboardingIncome["draft"]) => {
      setDrafts((current) =>
        editingId
          ? current.map((income) =>
              income.id === editingId ? { ...income, draft } : income,
            )
          : [...current, { id: crypto.randomUUID(), draft }],
      );
    },
    remove: (id: string) => {
      if (!window.confirm("¿Eliminar este ingreso?")) return;
      setDrafts((current) => current.filter((income) => income.id !== id));
    },
    onOpenChange: (open: boolean) => {
      setSheetOpen(open);
      if (!open) setEditingId(null);
    },
  };
}

function useExpenseDrafts() {
  const [drafts, setDrafts] = useState<OnboardingExpense[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return {
    drafts,
    sheetOpen,
    editingDraft: drafts.find(({ id }) => id === editingId),
    openNew: () => {
      setEditingId(null);
      setSheetOpen(true);
    },
    openEdit: (id: string) => {
      setEditingId(id);
      setSheetOpen(true);
    },
    save: (draft: OnboardingExpense["draft"]) => {
      setDrafts((current) =>
        editingId
          ? current.map((expense) =>
              expense.id === editingId ? { ...expense, draft } : expense,
            )
          : [...current, { id: crypto.randomUUID(), draft }],
      );
    },
    remove: (id: string) => {
      if (!window.confirm("¿Eliminar este gasto?")) return;
      setDrafts((current) => current.filter((expense) => expense.id !== id));
    },
    onOpenChange: (open: boolean) => {
      setSheetOpen(open);
      if (!open) setEditingId(null);
    },
  };
}

function getObjectiveValidationErrors(
  issues: readonly { path: readonly PropertyKey[]; message: string }[],
) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const path = issue.path.join(".");
    if (!errors[path]) errors[path] = issue.message;
  }
  return errors;
}

function getOnboardingTotals(
  incomes: OnboardingIncome[],
  expenses: OnboardingExpense[],
  currentMonth: string,
) {
  return {
    incomeTotal: getIncomeTotalArs(
      incomes.map(({ draft }) => ({
        amount: createMoney(draft.amount, draft.currency),
        recurring: draft.recurring,
        effectiveMonth: draft.effectiveMonth,
      })),
      currentMonth,
    ),
    expenseTotal: getExpenseTotalArs(
      expenses.map(({ draft }) => ({
        amount: createMoney(draft.amount, draft.currency),
        recurring: true,
        effectiveMonth: currentMonth,
        endMonth: null,
      })),
      currentMonth,
    ),
  };
}

function useObjectiveStepNavigation({
  currentMonth,
  objectiveForm,
  setStep,
}: {
  currentMonth: string;
  objectiveForm: GoalCreationFormApi;
  setStep: (step: OnboardingStep) => void;
}) {
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  function continueFromObjective() {
    const result = createObjectiveSchema(currentMonth).safeParse(
      objectiveForm.state.values,
    );
    if (!result.success) {
      setValidationErrors(getObjectiveValidationErrors(result.error.issues));
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
  }

  return { validationErrors, continueFromObjective };
}

function useOnboardingSubmission({
  objectiveForm,
  incomes,
  expenses,
}: {
  objectiveForm: GoalCreationFormApi;
  incomes: OnboardingIncome[];
  expenses: OnboardingExpense[];
}) {
  const router = useRouter();
  const posthog = usePostHog();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  async function submit() {
    setIsSubmitting(true);
    setSubmissionError(null);
    let result: Awaited<ReturnType<typeof completeFinancialOnboarding>>;
    try {
      result = await completeFinancialOnboarding({
        data: {
          goal: objectiveForm.state.values,
          incomes: incomes.map(({ draft }) => draft),
          expenses: expenses.map(({ draft }) => draft),
        },
      });
      if (!result.created) {
        setSubmissionError(
          "Ya existe un plan para tu cuenta. Recargá la página para continuarlo.",
        );
        setIsSubmitting(false);
        return;
      }
    } catch {
      setSubmissionError(
        "No pudimos guardar tu plan. Revisá tu conexión e intentá de nuevo.",
      );
      setIsSubmitting(false);
      return;
    }

    try {
      posthog?.capture("financial_onboarding_completed");
    } catch {
      // Analytics must not affect a completed onboarding.
    }
    try {
      await router.invalidate();
      await router.navigate({ to: "/app" });
    } catch {
      // Route transitions are best-effort after persistence succeeds.
    } finally {
      setIsSubmitting(false);
    }
  }

  return { isSubmitting, submissionError, submit };
}

export function useFinancialOnboarding() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [step, setStep] = useState<OnboardingStep>(1);
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
  const incomes = useIncomeDrafts();
  const expenses = useExpenseDrafts();
  const submission = useOnboardingSubmission({
    objectiveForm,
    incomes: incomes.drafts,
    expenses: expenses.drafts,
  });
  const totals = getOnboardingTotals(
    incomes.drafts,
    expenses.drafts,
    currentMonth,
  );
  const objectiveNavigation = useObjectiveStepNavigation({
    currentMonth,
    objectiveForm,
    setStep,
  });

  return {
    currentMonth,
    step,
    setStep,
    objectiveForm,
    objectiveContext,
    ...objectiveNavigation,
    incomes,
    expenses,
    ...totals,
    ...submission,
  };
}

import { usePostHog } from "@posthog/react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  createIncome,
  deleteIncome,
  updateIncome,
} from "../../../../features/financial/financial.functions";
import { FIXED_INCOME_SOURCES } from "../../../../features/financial/incomes";
import {
  createIncomeSchema,
  type IncomeDraft,
  type IncomeDraftInput,
} from "../../../../features/financial/incomes.schema";
import { formatMoneyInput, parseMoneyInput } from "../../../../lib/money";
import {
  FinancialSheetFrame,
  type FinancialDraftState,
  useFinancialDraftState,
} from "./FinancialFormPrimitives";
import { IncomeSheetForm } from "./IncomeSheetForm";

type IncomeRow = {
  id: string;
  sourceKind: string;
  sourceId: string | null;
  sourceName: string;
  amount: string;
  concept: string | null;
  currency: "ARS" | "USD";
  recurring: boolean;
  effectiveMonth: string;
};

type IncomeSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string;
  sources: Array<{ id: string; name: string }>;
  income?: IncomeRow;
  draft?: IncomeDraft;
  onSaveDraft?: (draft: IncomeDraft) => void;
  recurringOnly?: boolean;
};

type ValidationIssue = { path: PropertyKey[]; message: string };

function defaultDraft(month: string): IncomeDraftInput {
  return {
    source: undefined,
    amount: "",
    concept: "",
    currency: "ARS",
    recurring: true,
    effectiveMonth: month,
  };
}

function getIncomeDraft(
  income: IncomeRow | undefined,
  initialDraft: IncomeDraft | undefined,
  month: string,
  recurringOnly: boolean,
): IncomeDraftInput {
  if (income) {
    return {
      source:
        income.sourceKind === "custom"
          ? { kind: "custom", sourceId: income.sourceId! }
          : income.sourceKind === "uncategorized"
            ? { kind: "uncategorized" }
            : { kind: income.sourceKind as keyof typeof FIXED_INCOME_SOURCES },
      amount: formatMoneyInput(income.amount.replace(".", ",")),
      concept: income.concept ?? "",
      currency: income.currency,
      recurring: income.recurring,
      effectiveMonth: income.effectiveMonth.slice(0, 7),
    };
  }
  if (!initialDraft) return defaultDraft(month);
  return {
    ...initialDraft,
    concept: initialDraft.concept ?? "",
    amount: formatMoneyInput(initialDraft.amount.replace(".", ",")),
    recurring: recurringOnly ? true : initialDraft.recurring,
    effectiveMonth: recurringOnly ? month : initialDraft.effectiveMonth,
  };
}

function getValidationErrors(issues: readonly ValidationIssue[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const field = issue.path[1];
    if (typeof field === "string" && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}

function normalizeIncomeDraft(draft: IncomeDraft): IncomeDraft {
  return {
    ...draft,
    amount: parseMoneyInput(draft.amount, draft.currency)!.amount,
  };
}

async function persistIncome(income: IncomeRow | undefined, draft: IncomeDraft) {
  if (income) {
    await updateIncome({ data: { incomeId: income.id, draft } });
    return;
  }
  await createIncome({ data: { draft } });
}

function useIncomeDraftState({
  open,
  month,
  income,
  draft: initialDraft,
  recurringOnly = false,
}: Pick<IncomeSheetProps, "open" | "month" | "income" | "draft" | "recurringOnly">): FinancialDraftState<IncomeDraftInput> {
  const initialDraftValue = getIncomeDraft(income, initialDraft, month, recurringOnly);
  return useFinancialDraftState({
    open,
    initialDraft: initialDraftValue,
    resetKey: JSON.stringify(initialDraftValue),
  });
}

async function persistIncomeForm(
  income: IncomeRow | undefined,
  draft: IncomeDraft,
  onSaveDraft: ((draft: IncomeDraft) => void) | undefined,
  posthog: ReturnType<typeof usePostHog>,
) {
  if (onSaveDraft) {
    onSaveDraft(draft);
    return;
  }
  await persistIncome(income, draft);
  posthog?.capture(income ? "income_updated" : "income_created", {
    recurring: draft.recurring,
    currency: draft.currency,
    source_kind: draft.source.kind,
  });
}

function focusFirstInvalidIncomeField(draft: IncomeDraftInput, errors: Record<string, string>) {
  const fields = [
    ["amount", "income-amount"],
    ["source", draft.source?.kind === "custom" && "name" in draft.source ? "new-income-name" : "income-source-trigger"],
    ["concept", "income-concept"],
    ["effectiveMonth", "income-month-picker"],
  ] as const;
  const [, id] = fields.find(([field]) => errors[field]) ?? [];
  if (id) document.getElementById(id)?.focus();
}

type IncomeSheetActionProps = Omit<IncomeSheetProps, "draft"> &
  FinancialDraftState<IncomeDraftInput> & {
    router: ReturnType<typeof useRouter>;
    posthog: ReturnType<typeof usePostHog>;
  };

function useIncomeSheetActions({
  income,
  onOpenChange,
  onSaveDraft,
  router,
  posthog,
  draft,
  saving,
  setError,
  setValidationErrors,
  setSaving,
}: IncomeSheetActionProps) {

  async function save() {
    if (saving) return;
    const parsed = createIncomeSchema.safeParse({ draft });
    if (!parsed.success) {
      const errors = getValidationErrors(parsed.error.issues);
      setValidationErrors(errors);
      focusFirstInvalidIncomeField(draft, errors);
      return;
    }
    setValidationErrors({});
    setSaving(true);
    setError(null);
    try {
      const normalizedDraft = normalizeIncomeDraft(parsed.data.draft);
      await persistIncomeForm(income, normalizedDraft, onSaveDraft, posthog);
      if (!onSaveDraft) {
        toast.success(income ? "Ingreso actualizado." : "Ingreso agregado.");
        onOpenChange(false);
        try {
          await router.invalidate();
        } catch {
          toast.error("El ingreso se guardó, pero no pudimos actualizar la vista.");
        }
      } else {
        onOpenChange(false);
      }
    } catch {
      setError("No pudimos guardar el ingreso.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (saving) return;
    if (!income || !window.confirm("¿Eliminar este ingreso?")) return;
    setSaving(true);
    try {
      await deleteIncome({ data: { incomeId: income.id } });
      posthog?.capture("income_deleted", {
        recurring: income.recurring,
        currency: income.currency,
        source_kind: income.sourceKind,
      });
      toast.success("Ingreso eliminado.");
      onOpenChange(false);
      try {
        await router.invalidate();
      } catch {
        toast.error("El ingreso se eliminó, pero no pudimos actualizar la vista.");
      }
    } catch {
      setError("No pudimos eliminar el ingreso.");
    } finally {
      setSaving(false);
    }
  }

  return { onSave: () => void save(), onRemove: income ? () => void remove() : undefined };
}

function useIncomeSheet(props: IncomeSheetProps) {
  const state = useIncomeDraftState(props);
  const router = useRouter();
  const posthog = usePostHog();
  const actions = useIncomeSheetActions({ ...props, ...state, router, posthog });

  return {
    ...state,
    showPersistenceHint: !props.onSaveDraft,
    onDraftChange: state.setDraft,
    ...actions,
  };
}

function getTitle(recurringOnly: boolean, hasDraft: boolean, hasIncome: boolean) {
  if (recurringOnly) return hasDraft ? "Editar ingreso recurrente" : "Nuevo ingreso recurrente";
  return hasIncome ? "Editar ingreso" : "Nuevo ingreso";
}

export function IncomeSheet(props: IncomeSheetProps) {
  const state = useIncomeSheet(props);
  const { open, onOpenChange, sources, income, draft, recurringOnly = false } = props;
  return (
    <FinancialSheetFrame
      open={open}
      onOpenChange={onOpenChange}
      saving={state.saving}
      title={getTitle(recurringOnly, Boolean(draft), Boolean(income))}
      description={
        recurringOnly
          ? "Indicá cuánto recibís por mes y de dónde viene."
          : "Indicá el origen y desde cuándo contás con este ingreso."
      }
    >
        <IncomeSheetForm
          draft={state.draft}
          error={state.error}
          validationErrors={state.validationErrors}
          saving={state.saving}
          arsEquivalent={state.arsEquivalent}
          showPersistenceHint={state.showPersistenceHint}
          onDraftChange={state.onDraftChange}
          onSave={state.onSave}
          onRemove={state.onRemove}
          sources={sources}
          recurringOnly={recurringOnly}
        />
    </FinancialSheetFrame>
  );
}

import { useEffect, useState } from "react";
import { usePostHog } from "@posthog/react";
import { useRouter } from "@tanstack/react-router";
import BigNumber from "bignumber.js";
import { toast } from "sonner";
import { Button } from "../../../../components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "../../../../components/ui/field";
import { Input } from "../../../../components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../../../../components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select";
import { Switch } from "../../../../components/ui/switch";
import { MonthPickerInput } from "../../../../components/MonthPicker";
import {
  createIncome,
  deleteIncome,
  updateIncome,
} from "../../../../features/financial/financial.functions";
import { FIXED_INCOME_SOURCES } from "../../../../features/financial/incomes";
import {
  createIncomeSchema,
  type IncomeDraft,
} from "../../../../features/financial/incomes.schema";
import { PLANNING_ARS_PER_USD } from "../../../../features/financial/financial";
import { formatMoneyInput, parseMoneyInput } from "../../../../lib/money";
import { IncomeSourcePicker } from "./IncomeSourcePicker";

type IncomeRow = {
  id: string;
  sourceKind: string;
  sourceId: string | null;
  sourceName: string;
  amount: string;
  currency: "ARS" | "USD";
  recurring: boolean;
  effectiveMonth: string;
};

function defaultDraft(month: string): IncomeDraft {
  return {
    source: { kind: "salary" },
    amount: "",
    currency: "ARS",
    recurring: true,
    effectiveMonth: month,
  };
}

export function IncomeSheet({
  open,
  onOpenChange,
  month,
  sources,
  income,
  draft: initialDraft,
  onSaveDraft,
  recurringOnly = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string;
  sources: Array<{ id: string; name: string }>;
  income?: IncomeRow;
  draft?: IncomeDraft;
  onSaveDraft?: (draft: IncomeDraft) => void;
  recurringOnly?: boolean;
}) {
  const router = useRouter();
  const posthog = usePostHog();
  const [draft, setDraft] = useState<IncomeDraft>(() => defaultDraft(month));
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setValidationErrors({});
    setDraft(
      income
        ? {
            source:
              income.sourceKind === "custom"
                ? { kind: "custom", sourceId: income.sourceId! }
                : {
                    kind: income.sourceKind as keyof typeof FIXED_INCOME_SOURCES,
                  },
            amount: formatMoneyInput(income.amount.replace(".", ",")),
            currency: income.currency,
            recurring: income.recurring,
            effectiveMonth: income.effectiveMonth.slice(0, 7),
          }
        : initialDraft
          ? {
              ...initialDraft,
              amount: formatMoneyInput(initialDraft.amount.replace(".", ",")),
              recurring: recurringOnly ? true : initialDraft.recurring,
              effectiveMonth: recurringOnly ? month : initialDraft.effectiveMonth,
            }
          : defaultDraft(month),
    );
  }, [income, initialDraft, month, open, recurringOnly]);

  async function save() {
    const parsed = createIncomeSchema.safeParse({ draft });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[1];
        if (typeof field === "string" && !errors[field])
          errors[field] = issue.message;
      }
      setValidationErrors(errors);
      return;
    }
    setValidationErrors({});
    setSaving(true);
    setError(null);
    try {
      const normalizedDraft = {
        ...parsed.data.draft,
        amount: parseMoneyInput(
          parsed.data.draft.amount,
          parsed.data.draft.currency,
        )!.amount,
      };
      if (onSaveDraft) {
        onSaveDraft(normalizedDraft);
      } else {
        if (income)
          await updateIncome({
            data: { incomeId: income.id, draft: normalizedDraft },
          });
        else await createIncome({ data: { draft: normalizedDraft } });
        posthog?.capture(income ? "income_updated" : "income_created", {
          recurring: normalizedDraft.recurring,
          currency: normalizedDraft.currency,
          source_kind: normalizedDraft.source.kind,
        });
        await router.invalidate();
        toast.success(income ? "Ingreso actualizado." : "Ingreso agregado.");
      }
      onOpenChange(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No pudimos guardar el ingreso.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!income || !window.confirm("¿Eliminar este ingreso?")) return;
    setSaving(true);
    try {
      await deleteIncome({ data: { incomeId: income.id } });
      posthog?.capture("income_deleted", {
        recurring: income.recurring,
        currency: income.currency,
        source_kind: income.sourceKind,
      });
      await router.invalidate();
      toast.success("Ingreso eliminado.");
      onOpenChange(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No pudimos eliminar el ingreso.",
      );
    } finally {
      setSaving(false);
    }
  }

  const parsedUsdAmount =
    draft.currency === "USD" ? parseMoneyInput(draft.amount, "USD") : null;
  const arsEquivalent =
    parsedUsdAmount && new BigNumber(parsedUsdAmount.amount).isGreaterThan(0)
      ? new BigNumber(parsedUsdAmount.amount).times(PLANNING_ARS_PER_USD)
      : null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 p-0 data-[side=right]:w-full data-[side=right]:max-w-none data-[side=right]:sm:w-[450px] data-[side=right]:sm:max-w-[450px]"
      >
        <SheetHeader className="border-b border-[var(--line)] px-6 py-5">
          <SheetTitle className="font-serif text-2xl font-bold text-[var(--sea-ink)]">
            {recurringOnly
              ? initialDraft
                ? 'Editar ingreso recurrente'
                : 'Nuevo ingreso recurrente'
              : income
                ? 'Editar ingreso'
                : 'Nuevo ingreso'}
          </SheetTitle>
          <SheetDescription>
            {recurringOnly
              ? 'Indicá cuánto recibís por mes y de dónde viene.'
              : 'Indicá el origen y desde cuándo contás con este ingreso.'}
          </SheetDescription>
        </SheetHeader>
        <form
          className="flex flex-1 flex-col gap-5 overflow-y-auto p-6"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <FieldGroup>
            <FieldSet>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field data-invalid={!!validationErrors.amount}>
                  <FieldLabel htmlFor="income-amount">Monto</FieldLabel>
                  <Input
                    id="income-amount"
                    aria-label="Monto"
                    inputMode="decimal"
                    placeholder="0"
                    value={draft.amount}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        amount: formatMoneyInput(event.target.value),
                      })
                    }
                  />
                  {validationErrors.amount && (
                    <FieldError>{validationErrors.amount}</FieldError>
                  )}
                </Field>
                <Field>
                  <FieldLabel htmlFor="income-currency-trigger">
                    Moneda
                  </FieldLabel>
                  <Select
                    items={{ ARS: "Pesos (ARS)", USD: "Dólares (USD)" }}
                    value={draft.currency}
                    onValueChange={(currency) =>
                      currency &&
                      setDraft({
                        ...draft,
                        currency: currency as "ARS" | "USD",
                      })
                    }
                  >
                    <SelectTrigger
                      id="income-currency-trigger"
                      aria-label="Moneda"
                      className="w-full"
                    >
                      <SelectValue placeholder="Seleccionar moneda" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ARS">Pesos (ARS)</SelectItem>
                      <SelectItem value="USD">Dólares (USD)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              {arsEquivalent !== null && (
                <p className="text-sm text-[var(--sea-ink-soft)]">
                  Equivale a ARS {formatMoneyInput(arsEquivalent.toFixed(0))}
                </p>
              )}
              {!recurringOnly && (
                <Field orientation="horizontal">
                  <Switch
                    id="income-recurring"
                    checked={draft.recurring}
                    onCheckedChange={(recurring) =>
                      setDraft({
                        ...draft,
                        recurring,
                        source:
                          draft.source.kind === "custom"
                            ? draft.source
                            : { kind: recurring ? "salary" : "asset_sale" },
                      })
                    }
                  />
                  <FieldLabel htmlFor="income-recurring">
                    Es ingreso recurrente
                  </FieldLabel>
                </Field>
              )}
              <IncomeSourcePicker
                recurring={draft.recurring}
                sources={sources}
                value={draft.source}
                error={validationErrors.source}
                onChange={(source) => setDraft({ ...draft, source })}
                showPersistenceHint={!onSaveDraft}
              />
              {!recurringOnly && (
                <Field data-invalid={!!validationErrors.effectiveMonth}>
                  <FieldLabel htmlFor="income-month-picker">
                    {draft.recurring ? "Desde el mes" : "Mes del ingreso"}
                  </FieldLabel>
                  <MonthPickerInput
                    id="income-month-picker"
                    aria-label={
                      draft.recurring ? "Desde el mes" : "Mes del ingreso"
                    }
                    value={draft.effectiveMonth}
                    onValueChange={(effectiveMonth) =>
                      setDraft({ ...draft, effectiveMonth })
                    }
                  />
                  {validationErrors.effectiveMonth && (
                    <FieldError>{validationErrors.effectiveMonth}</FieldError>
                  )}
                </Field>
              )}
              {error && <FieldError>{error}</FieldError>}
            </FieldSet>
          </FieldGroup>
          <div className="mt-auto flex gap-3 pt-4">
            {income && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => void remove()}
                disabled={saving}
              >
                Eliminar
              </Button>
            )}
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

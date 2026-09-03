import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "../../../../components/ui/field";
import { Input } from "../../../../components/ui/input";
import { MonthPickerInput } from "../../../../components/MonthPicker";
import type { IncomeDraft } from "../../../../features/financial/incomes.schema";
import { FinancialAmountFields, FinancialRecurrenceField } from "./FinancialFormPrimitives";
import { IncomeSourcePicker } from "./IncomeSourcePicker";
import { FinancialSheetFooter } from "./FinancialSheetFooter";

type IncomeSheetFormProps = {
  sources: Array<{ id: string; name: string }>
  recurringOnly: boolean
  draft: IncomeDraft;
  error: string | null;
  validationErrors: Record<string, string>;
  saving: boolean;
  arsEquivalent: { toFixed: (fractionDigits: number) => string } | null;
  showPersistenceHint: boolean;
  onDraftChange: (draft: IncomeDraft) => void;
  onSave: () => void;
  onRemove?: () => void;
}

type IncomeSheetFieldsProps = Pick<
  IncomeSheetFormProps,
  'draft' | 'error' | 'validationErrors' | 'saving' | 'arsEquivalent' | 'showPersistenceHint' | 'onDraftChange'
>;

function IncomeRecurrenceField({
  draft,
  onDraftChange,
  saving,
}: Pick<IncomeSheetFormProps, "draft" | "onDraftChange" | "saving">) {
  return (
    <FinancialRecurrenceField
      id="income-recurring"
      checked={draft.recurring}
      label="Es ingreso recurrente"
      saving={saving}
      onCheckedChange={(recurring) =>
        onDraftChange({
          ...draft,
          recurring,
          source:
            draft.source.kind === "custom"
              ? draft.source
              : { kind: recurring ? "salary" : "asset_sale" },
        })
      }
    />
  );
}

function IncomeConceptField({
  draft,
  error,
  onDraftChange,
  saving,
}: Pick<IncomeSheetFormProps, "draft" | "onDraftChange" | "saving"> & { error?: string }) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor="income-concept">Concepto</FieldLabel>
      <Input
        id="income-concept"
        aria-label="Concepto"
        aria-invalid={!!error}
        aria-describedby={error ? "income-concept-error" : undefined}
        disabled={saving}
        maxLength={120}
        value={draft.concept}
        onChange={(event) => onDraftChange({ ...draft, concept: event.target.value })}
      />
      {error && <FieldError id="income-concept-error">{error}</FieldError>}
    </Field>
  );
}

function IncomeMonthField({
  draft,
  error,
  onDraftChange,
  saving,
}: Pick<IncomeSheetFormProps, "draft" | "onDraftChange" | "saving"> & {
  error?: string;
}) {
  const label = draft.recurring ? "Desde el mes" : "Mes del ingreso";
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor="income-month-picker">{label}</FieldLabel>
      <MonthPickerInput
        id="income-month-picker"
        aria-label={label}
        aria-invalid={!!error}
        aria-describedby={error ? "income-month-error" : undefined}
        disabled={saving}
        value={draft.effectiveMonth}
        onValueChange={(effectiveMonth) => onDraftChange({ ...draft, effectiveMonth })}
      />
      {error && <FieldError id="income-month-error">{error}</FieldError>}
    </Field>
  );
}

function IncomeSheetFields({
  draft,
  error,
  validationErrors,
  saving,
  arsEquivalent,
  showPersistenceHint,
  onDraftChange,
  sources,
  recurringOnly,
}: IncomeSheetFieldsProps & Pick<IncomeSheetFormProps, 'sources' | 'recurringOnly'>) {
  return (
    <FieldGroup>
      <FieldSet>
        <FinancialAmountFields
          kind="income"
          draft={draft}
          amountError={validationErrors.amount}
          arsEquivalent={arsEquivalent}
          saving={saving}
          onDraftChange={onDraftChange}
        />
        {!recurringOnly && (
          <IncomeRecurrenceField draft={draft} onDraftChange={onDraftChange} saving={saving} />
        )}
        <IncomeSourcePicker
          recurring={draft.recurring}
          sources={sources}
          value={draft.source}
          error={validationErrors.source}
          onChange={(source) => onDraftChange({ ...draft, source })}
          showPersistenceHint={showPersistenceHint}
          disabled={saving}
        />
        <IncomeConceptField
          draft={draft}
          error={validationErrors.concept}
          onDraftChange={onDraftChange}
          saving={saving}
        />
        {!recurringOnly && (
          <IncomeMonthField
            draft={draft}
            error={validationErrors.effectiveMonth}
            onDraftChange={onDraftChange}
            saving={saving}
          />
        )}
      </FieldSet>
      {error && <FieldError id="income-form-error">{error}</FieldError>}
    </FieldGroup>
  );
}

export function IncomeSheetForm({
  draft,
  error,
  validationErrors,
  saving,
  arsEquivalent,
  showPersistenceHint,
  onDraftChange,
  onSave,
  onRemove,
  sources,
  recurringOnly,
}: IncomeSheetFormProps) {
  return (
    <form
      className="flex flex-1 flex-col gap-5 overflow-y-auto p-6"
      aria-busy={saving}
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <IncomeSheetFields
        draft={draft}
        error={error}
        validationErrors={validationErrors}
        saving={saving}
        arsEquivalent={arsEquivalent}
        showPersistenceHint={showPersistenceHint}
        onDraftChange={onDraftChange}
        sources={sources}
        recurringOnly={recurringOnly}
      />
      <FinancialSheetFooter saving={saving} onRemove={onRemove} />
    </form>
  );
}

import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from '../../../../components/ui/field'
import { Input } from '../../../../components/ui/input'
import { MonthPickerInput } from '../../../../components/MonthPicker'
import type { ExpenseDraftInput } from '../../../../features/financial/expenses.schema'
import { FinancialAmountFields, FinancialRecurrenceField } from './FinancialFormPrimitives'
import { ExpenseSourcePicker } from './ExpenseSourcePicker'
import { FinancialSheetFooter } from './FinancialSheetFooter'

type ExpenseSheetFormProps = {
  sources: Array<{ id: string; name: string }>
  recurringOnly: boolean
  draft: ExpenseDraftInput & { effectiveMonth: string }
  error: string | null
  validationErrors: Record<string, string>
  saving: boolean
  arsEquivalent: { toFixed: (fractionDigits: number) => string } | null
  showPersistenceHint: boolean
  onDraftChange: (draft: ExpenseDraftInput & { effectiveMonth: string }) => void
  onSave: () => void
  onRemove?: () => void
}

type ExpenseSheetFieldsProps = Pick<ExpenseSheetFormProps, 'draft' | 'error' | 'validationErrors' | 'saving' | 'arsEquivalent' | 'showPersistenceHint' | 'onDraftChange'>

function ExpenseRecurrenceField({
  draft,
  onDraftChange,
  saving,
}: Pick<ExpenseSheetFormProps, 'draft' | 'onDraftChange' | 'saving'>) {
  return (
    <FinancialRecurrenceField
      id="expense-recurring"
      checked={draft.recurring}
      label="Es gasto recurrente"
      saving={saving}
      onCheckedChange={(recurring) => {
        const source =
          !draft.source || draft.source.kind === 'custom' || draft.source.kind === 'uncategorized'
            ? draft.source
            : undefined

        onDraftChange({ ...draft, recurring, source })
      }}
    />
  )
}

function ExpenseConceptField({
  draft,
  error,
  onDraftChange,
  saving,
}: Pick<ExpenseSheetFormProps, 'draft' | 'onDraftChange' | 'saving'> & { error?: string }) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor="expense-concept">Concepto (opcional)</FieldLabel>
      <Input
        id="expense-concept"
        aria-label="Concepto (opcional)"
        aria-invalid={!!error}
        aria-describedby={
          error
            ? 'expense-concept-description expense-concept-error'
            : 'expense-concept-description'
        }
        disabled={saving}
        value={draft.concept ?? ''}
        onChange={(event) => onDraftChange({ ...draft, concept: event.target.value })}
      />
      <FieldDescription id="expense-concept-description">
        Agregá una descripción para diferenciar este gasto.
      </FieldDescription>
      {error && <FieldError id="expense-concept-error">{error}</FieldError>}
    </Field>
  )
}

function ExpenseMonthField({
  draft,
  error,
  onDraftChange,
  saving,
}: Pick<ExpenseSheetFormProps, 'draft' | 'onDraftChange' | 'saving'> & { error?: string }) {
  const label = draft.recurring ? 'Desde el mes' : 'Mes del gasto'
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor="expense-month-picker">{label}</FieldLabel>
      <MonthPickerInput
        id="expense-month-picker"
        aria-label={label}
        aria-invalid={!!error}
        aria-describedby={error ? 'expense-month-error' : undefined}
        disabled={saving}
        value={draft.effectiveMonth}
        onValueChange={(effectiveMonth) => onDraftChange({ ...draft, effectiveMonth })}
      />
      {error && <FieldError id="expense-month-error">{error}</FieldError>}
    </Field>
  )
}

function ExpenseSheetFields({
  draft,
  error,
  validationErrors,
  saving,
  arsEquivalent,
  showPersistenceHint,
  onDraftChange,
  sources,
  recurringOnly,
}: ExpenseSheetFieldsProps & Pick<ExpenseSheetFormProps, 'sources' | 'recurringOnly'>) {
  return (
    <FieldGroup>
      <FieldSet>
        <FinancialAmountFields
          kind="expense"
          draft={draft}
          amountError={validationErrors.amount}
          arsEquivalent={arsEquivalent}
          saving={saving}
          onDraftChange={onDraftChange}
        />
        {!recurringOnly && (
          <ExpenseRecurrenceField draft={draft} onDraftChange={onDraftChange} saving={saving} />
        )}
        <ExpenseSourcePicker
          recurring={draft.recurring}
          sources={sources}
          value={draft.source}
          error={validationErrors.source}
          onChange={(source) => onDraftChange({ ...draft, source })}
          showPersistenceHint={showPersistenceHint}
          disabled={saving}
        />
        <ExpenseConceptField
          draft={draft}
          error={validationErrors.concept}
          onDraftChange={onDraftChange}
          saving={saving}
        />
        {!recurringOnly && (
          <ExpenseMonthField
            draft={draft}
            error={validationErrors.effectiveMonth}
            onDraftChange={onDraftChange}
            saving={saving}
          />
        )}
        {error && <FieldError>{error}</FieldError>}
      </FieldSet>
    </FieldGroup>
  )
}

export function ExpenseSheetForm({
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
}: ExpenseSheetFormProps) {
  return (
    <form
      className="flex flex-1 flex-col gap-5 overflow-y-auto p-6"
      aria-busy={saving}
      onSubmit={(event) => {
        event.preventDefault()
        onSave()
      }}
    >
      <ExpenseSheetFields
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
  )
}

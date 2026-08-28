import { Field, FieldDescription, FieldError, FieldLabel } from '../../../../components/ui/field'
import { Input } from '../../../../components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select'
import {
  FIXED_EXPENSE_SOURCES,
  ONE_TIME_EXPENSE_SOURCES,
  RECURRING_EXPENSE_SOURCES,
} from '../../../../features/financial/expenses'
import type { ExpenseDraft } from '../../../../features/financial/expenses.schema'

const OTHER_SOURCE_VALUE = 'other'

export function ExpenseSourcePicker({
  recurring,
  sources,
  value,
  error,
  onChange,
  showPersistenceHint = true,
}: {
  recurring: boolean
  sources: Array<{ id: string; name: string }>
  value: ExpenseDraft['source']
  error?: string
  onChange: (source: ExpenseDraft['source']) => void
  showPersistenceHint?: boolean
}) {
  const fixedSources = recurring ? RECURRING_EXPENSE_SOURCES : ONE_TIME_EXPENSE_SOURCES
  const options = [
    ...Object.entries(fixedSources).map(([kind, label]) => ({ value: `fixed:${kind}`, label })),
    ...sources.map((source) => ({ value: `custom:${source.id}`, label: source.name })),
  ]
  const selectItems = [...options, { value: OTHER_SOURCE_VALUE, label: 'Otro (agregar nuevo)' }]
  const isOtherSource = value.kind === 'custom' && 'name' in value
  const selectedValue = isOtherSource
    ? OTHER_SOURCE_VALUE
    : value.kind === 'custom'
      ? `custom:${value.sourceId}`
      : `fixed:${value.kind}`

  function handleSourceChange(nextValue: string | null) {
    if (!nextValue) return

    if (nextValue === OTHER_SOURCE_VALUE) {
      onChange({ kind: 'custom', name: '' })
      return
    }

    if (nextValue.startsWith('fixed:')) {
      onChange({ kind: nextValue.slice('fixed:'.length) as keyof typeof FIXED_EXPENSE_SOURCES })
      return
    }

    onChange({ kind: 'custom', sourceId: nextValue.slice('custom:'.length) })
  }

  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor="expense-source-trigger">Categoría del gasto</FieldLabel>
      <Select items={selectItems} value={selectedValue} onValueChange={handleSourceChange}>
        <SelectTrigger
          id="expense-source-trigger"
          aria-label="Categoría del gasto"
          aria-invalid={error && !isOtherSource ? 'true' : undefined}
          aria-describedby={error && !isOtherSource ? 'expense-source-error' : undefined}
          className="w-full"
        >
          <SelectValue placeholder="Seleccionar categoría" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          <SelectItem value={OTHER_SOURCE_VALUE}>Otro (agregar nuevo)</SelectItem>
        </SelectContent>
      </Select>
      {isOtherSource && (
        <Field>
          <FieldLabel htmlFor="new-expense-name">Nombre de la categoría nueva</FieldLabel>
          <Input
            id="new-expense-name"
            aria-label="Nombre de la categoría nueva"
            aria-invalid={!!error}
            aria-describedby={error ? 'expense-source-error' : undefined}
            value={value.kind === 'custom' && 'name' in value ? value.name : ''}
            onChange={(event) => {
              onChange({ kind: 'custom', name: event.target.value })
            }}
          />
          {showPersistenceHint && (
            <FieldDescription>Esta categoría se va a guardar para que puedas volver a usarla</FieldDescription>
          )}
        </Field>
      )}
      {error && <FieldError id="expense-source-error">{error}</FieldError>}
    </Field>
  )
}

import { Field, FieldDescription, FieldError, FieldLabel } from '../../../../components/ui/field'
import { Input } from '../../../../components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select'
import { FIXED_EXPENSE_SOURCES } from '../../../../features/financial/expenses'
import type { ExpenseDraft } from '../../../../features/financial/expenses.schema'

const OTHER_SOURCE_VALUE = 'other'

export function ExpenseSourcePicker({
  sources,
  value,
  error,
  onChange,
}: {
  sources: Array<{ id: string; name: string }>
  value: ExpenseDraft['source']
  error?: string
  onChange: (source: ExpenseDraft['source']) => void
}) {
  const options = [
    ...Object.entries(FIXED_EXPENSE_SOURCES).map(([kind, label]) => ({ value: `fixed:${kind}`, label })),
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
      <FieldLabel htmlFor="expense-source-trigger">Concepto del gasto</FieldLabel>
      <Select items={selectItems} value={selectedValue} onValueChange={handleSourceChange}>
        <SelectTrigger id="expense-source-trigger" aria-label="Concepto del gasto" className="w-full">
          <SelectValue placeholder="Seleccionar concepto" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          <SelectItem value={OTHER_SOURCE_VALUE}>Otro (agregar nuevo)</SelectItem>
        </SelectContent>
      </Select>
      {isOtherSource && (
        <Field>
          <FieldLabel htmlFor="new-expense-name">Nombre del gasto nuevo</FieldLabel>
          <Input
            id="new-expense-name"
            aria-label="Nombre del gasto nuevo"
            value={value.kind === 'custom' && 'name' in value ? value.name : ''}
            onChange={(event) => {
              onChange({ kind: 'custom', name: event.target.value })
            }}
          />
          <FieldDescription>Este gasto se va a guardar para que puedas volver a usarlo</FieldDescription>
        </Field>
      )}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )
}

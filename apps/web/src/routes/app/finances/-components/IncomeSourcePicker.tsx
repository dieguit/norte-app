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
  FIXED_INCOME_SOURCES,
  ONE_TIME_INCOME_SOURCES,
  RECURRING_INCOME_SOURCES,
} from '../../../../features/financial/incomes'
import type { IncomeDraft } from '../../../../features/financial/incomes.schema'

const OTHER_SOURCE_VALUE = 'other'

export function IncomeSourcePicker({
  recurring,
  sources,
  value,
  error,
  onChange,
  showPersistenceHint = true,
}: {
  recurring: boolean
  sources: Array<{ id: string; name: string }>
  value: IncomeDraft['source']
  error?: string
  onChange: (source: IncomeDraft['source']) => void
  showPersistenceHint?: boolean
}) {
  const fixedSources = recurring ? RECURRING_INCOME_SOURCES : ONE_TIME_INCOME_SOURCES
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
      onChange({ kind: nextValue.slice('fixed:'.length) as keyof typeof FIXED_INCOME_SOURCES })
      return
    }

    onChange({ kind: 'custom', sourceId: nextValue.slice('custom:'.length) })
  }

  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor="income-source-trigger">Categoría del ingreso</FieldLabel>
      <Select items={selectItems} value={selectedValue} onValueChange={handleSourceChange}>
        <SelectTrigger
          id="income-source-trigger"
          aria-label="Categoría del ingreso"
          aria-invalid={error && !isOtherSource ? 'true' : undefined}
          aria-describedby={error && !isOtherSource ? 'income-source-error' : undefined}
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
          <FieldLabel htmlFor="new-income-name">Nombre de la categoría nueva</FieldLabel>
          <Input
            id="new-income-name"
            aria-label="Nombre de la categoría nueva"
            aria-invalid={!!error}
            aria-describedby={error ? 'income-source-error' : undefined}
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
      {error && <FieldError id="income-source-error">{error}</FieldError>}
    </Field>
  )
}

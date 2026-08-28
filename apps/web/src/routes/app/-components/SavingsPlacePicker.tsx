import { Field, FieldDescription, FieldError, FieldLabel } from '../../../components/ui/field'
import { Input } from '../../../components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select'

const NEW_PLACE_VALUE = '__new__'

export interface SavingsPlacePickerProps {
  places: Array<{ id: string; name: string }>
  value: { kind: 'existing'; placeId: string } | { kind: 'new'; name: string } | null
  onChange: (
    value: { kind: 'existing'; placeId: string } | { kind: 'new'; name: string } | null,
  ) => void
  className?: string
  disabled?: boolean
  error?: string
}

export function SavingsPlacePicker({
  places,
  value,
  onChange,
  className,
  disabled,
  error,
}: SavingsPlacePickerProps) {
  const options = places.map((place) => ({ value: place.id, label: place.name }))
  const selectItems = [...options, { value: NEW_PLACE_VALUE, label: 'Otro (agregar nuevo)' }]
  const selectedValue = value?.kind === 'new' ? NEW_PLACE_VALUE : value?.placeId ?? ''
  const isNewPlace = value?.kind === 'new'
  const errorId = isNewPlace ? 'new-savings-place-error' : 'savings-place-error'

  function handlePlaceChange(nextValue: string | null) {
    if (!nextValue) return

    if (nextValue === NEW_PLACE_VALUE) {
      onChange({ kind: 'new', name: '' })
      return
    }

    onChange({ kind: 'existing', placeId: nextValue })
  }

  return (
    <Field data-invalid={!!error} data-disabled={disabled} className={className}>
      <FieldLabel htmlFor="savings-place-trigger">¿Dónde está este ahorro?</FieldLabel>
      <Select items={selectItems} value={selectedValue} onValueChange={handlePlaceChange}>
        <SelectTrigger
          id="savings-place-trigger"
          aria-label="¿Dónde está este ahorro?"
          aria-invalid={error && !isNewPlace ? 'true' : undefined}
          aria-describedby={error && !isNewPlace ? errorId : undefined}
          className="w-full"
          disabled={disabled}
        >
          <SelectValue placeholder="Seleccionar lugar" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
          <SelectItem value={NEW_PLACE_VALUE}>Otro (agregar nuevo)</SelectItem>
        </SelectContent>
      </Select>
      {isNewPlace && (
        <Field data-invalid={!!error}>
          <FieldLabel htmlFor="new-savings-place-name">Nombre del lugar nuevo</FieldLabel>
          <Input
            id="new-savings-place-name"
            aria-label="Nombre del lugar nuevo"
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? errorId : undefined}
            value={value.name}
            onChange={(event) => onChange({ kind: 'new', name: event.target.value })}
            disabled={disabled}
          />
          <FieldDescription>Este lugar se va a guardar para que puedas volver a usarlo</FieldDescription>
          {error && <FieldError id={errorId}>{error}</FieldError>}
        </Field>
      )}
      {!isNewPlace && error && <FieldError id={errorId}>{error}</FieldError>}
    </Field>
  )
}

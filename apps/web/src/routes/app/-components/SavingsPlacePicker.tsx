import { Field, FieldError, FieldLabel } from '../../../components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select'
import { SavingsPlaceNameField } from './SavingsPlaceNameField'

const NEW_PLACE_VALUE = '__new__'

export type SavingsPlaceValue =
  | { kind: 'existing'; placeId: string }
  | { kind: 'new'; name: string }
  | null

export function getSavingsPlaceSelection(value: string | null): SavingsPlaceValue | undefined {
  if (!value) return undefined
  return value === NEW_PLACE_VALUE ? { kind: 'new', name: '' } : { kind: 'existing', placeId: value }
}

export interface SavingsPlacePickerProps {
  places: Array<{ id: string; name: string }>
  value: SavingsPlaceValue
  onChange: (value: SavingsPlaceValue) => void
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

  return (
    <Field data-invalid={!!error} data-disabled={disabled} className={className}>
      <FieldLabel htmlFor="savings-place-trigger">¿Dónde está este ahorro?</FieldLabel>
        <Select items={selectItems} value={selectedValue} onValueChange={(nextValue) => {
          const nextSelection = getSavingsPlaceSelection(nextValue)
          if (nextSelection) onChange(nextSelection)
        }}>
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
        <SavingsPlaceNameField
          name={value.name}
          error={error}
          disabled={disabled}
          errorId={errorId}
          onChange={(name) => onChange({ kind: 'new', name })}
        />
      )}
      {!isNewPlace && error && <FieldError id={errorId}>{error}</FieldError>}
    </Field>
  )
}

import { useState } from 'react'
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
  touched?: boolean
  onBlur?: () => void
}

function SavingsPlaceSelectContent({
  options,
}: {
  options: Array<{ value: string; label: string }>
}) {
  return (
    <SelectContent>
      {options.map((option) => (
        <SelectItem key={option.value} value={option.value}>
          {option.label}
        </SelectItem>
      ))}
      <SelectItem value={NEW_PLACE_VALUE}>Otro (agregar nuevo)</SelectItem>
    </SelectContent>
  )
}

function getSelectTriggerAria(error?: string, isNewPlace?: boolean, errorId?: string) {
  if (!error || isNewPlace) {
    return { invalid: undefined, describedBy: undefined }
  }
  return { invalid: 'true' as const, describedBy: errorId }
}

export function SavingsPlacePicker({
  places,
  value,
  onChange,
  className,
  disabled,
  error,
  touched: externalTouched,
  onBlur: externalOnBlur,
}: SavingsPlacePickerProps) {
  const [internalTouched, setInternalTouched] = useState(false)
  const isTouched = externalTouched !== undefined ? (externalTouched || internalTouched) : true
  const options = places.map((place) => ({ value: place.id, label: place.name }))
  const selectItems = [...options, { value: NEW_PLACE_VALUE, label: 'Otro (agregar nuevo)' }]
  const isNewPlace = value?.kind === 'new'
  const selectedValue = isNewPlace ? NEW_PLACE_VALUE : (value?.placeId ?? '')
  const errorId = isNewPlace ? 'new-savings-place-error' : 'savings-place-error'
  const hasVisibleError = Boolean(error && (!isNewPlace || isTouched))
  const triggerAria = getSelectTriggerAria(error, isNewPlace, errorId)

  const handleBlur = () => {
    setInternalTouched(true)
    externalOnBlur?.()
  }

  return (
    <Field data-invalid={hasVisibleError} data-disabled={disabled} className={className}>
      <FieldLabel htmlFor="savings-place-trigger">¿Dónde está este ahorro?</FieldLabel>
      <Select
        items={selectItems}
        value={selectedValue}
        onValueChange={(nextValue) => {
          const nextSelection = getSavingsPlaceSelection(nextValue)
          if (nextSelection) onChange(nextSelection)
        }}
      >
        <SelectTrigger
          id="savings-place-trigger"
          aria-label="¿Dónde está este ahorro?"
          aria-invalid={triggerAria.invalid}
          aria-describedby={triggerAria.describedBy}
          className="w-full"
          disabled={disabled}
        >
          <SelectValue placeholder="Seleccionar lugar" />
        </SelectTrigger>
        <SavingsPlaceSelectContent options={options} />
      </Select>
      {isNewPlace && (
        <SavingsPlaceNameField
          name={value.name}
          error={error}
          touched={isTouched}
          onBlur={handleBlur}
          disabled={disabled}
          errorId={errorId}
          onChange={(name) => onChange({ kind: 'new', name })}
        />
      )}
      {!isNewPlace && error && <FieldError id={errorId}>{error}</FieldError>}
    </Field>
  )
}

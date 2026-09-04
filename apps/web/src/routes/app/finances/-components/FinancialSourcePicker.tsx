import { Field, FieldDescription, FieldError, FieldLabel } from '../../../../components/ui/field'
import { Input } from '../../../../components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select'

type FinancialSourceOption = { value: string; label: string }

function FinancialSourceSelect({
  label,
  triggerId,
  errorId,
  options,
  selectedValue,
  isOtherSource,
  error,
  disabled,
  onValueChange,
}: Pick<FinancialSourcePickerProps, 'label' | 'triggerId' | 'errorId' | 'options' | 'selectedValue' | 'isOtherSource' | 'error' | 'disabled' | 'onValueChange'>) {
  return (
    <Select
      items={[...options, { value: 'other', label: 'Otro (agregar nuevo)' }]}
      value={selectedValue}
      disabled={disabled}
      onValueChange={onValueChange}
    >
      <SelectTrigger
        id={triggerId}
        aria-label={label}
        aria-invalid={error && !isOtherSource ? 'true' : undefined}
        aria-describedby={error && !isOtherSource ? errorId : undefined}
        className="w-full"
      >
        <SelectValue placeholder="Seleccionar categoría" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
        <SelectItem value="other">Otro (agregar nuevo)</SelectItem>
      </SelectContent>
    </Select>
  )
}

function FinancialNewSourceField({
  newSourceId,
  newSourceName,
  error,
  errorId,
  showPersistenceHint,
  disabled,
  onNewSourceNameChange,
}: Pick<FinancialSourcePickerProps, 'newSourceId' | 'newSourceName' | 'error' | 'errorId' | 'showPersistenceHint' | 'disabled' | 'onNewSourceNameChange'>) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={newSourceId}>Nombre de la categoría nueva</FieldLabel>
      <Input
        id={newSourceId}
        aria-label="Nombre de la categoría nueva"
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        disabled={disabled}
        value={newSourceName}
        onChange={(event) => onNewSourceNameChange(event.target.value)}
      />
      {showPersistenceHint && (
        <FieldDescription>Esta categoría se va a guardar para que puedas volver a usarla</FieldDescription>
      )}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </Field>
  )
}

type FinancialSourcePickerProps = {
  label: string
  triggerId: string
  errorId: string
  newSourceId: string
  options: FinancialSourceOption[]
  selectedValue: string | null
  isOtherSource: boolean
  newSourceName: string
  error?: string
  showPersistenceHint: boolean
  disabled: boolean
  onValueChange: (value: string | null) => void
  onNewSourceNameChange: (name: string) => void
}

export function FinancialSourcePicker({
  label,
  triggerId,
  errorId,
  newSourceId,
  options,
  selectedValue,
  isOtherSource,
  newSourceName,
  error,
  showPersistenceHint,
  disabled,
  onValueChange,
  onNewSourceNameChange,
}: FinancialSourcePickerProps) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={triggerId}>{label}</FieldLabel>
      <FinancialSourceSelect
        label={label}
        triggerId={triggerId}
        errorId={errorId}
        options={options}
        selectedValue={selectedValue}
        isOtherSource={isOtherSource}
        error={error}
        disabled={disabled}
        onValueChange={onValueChange}
      />
      {isOtherSource && (
        <FinancialNewSourceField
          newSourceId={newSourceId}
          newSourceName={newSourceName}
          error={error}
          errorId={errorId}
          showPersistenceHint={showPersistenceHint}
          disabled={disabled}
          onNewSourceNameChange={onNewSourceNameChange}
        />
      )}
      {!isOtherSource && error && <FieldError id={errorId}>{error}</FieldError>}
    </Field>
  )
}

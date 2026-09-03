import { Field, FieldDescription, FieldError, FieldLabel } from '../../../components/ui/field'
import { Input } from '../../../components/ui/input'

export function SavingsPlaceNameField({
  name,
  error,
  touched,
  onBlur,
  disabled,
  onChange,
  errorId,
}: {
  name: string
  error?: string
  touched?: boolean
  onBlur?: () => void
  disabled?: boolean
  onChange: (name: string) => void
  errorId: string
}) {
  const showError = Boolean(error && (touched ?? true))
  return (
    <Field data-invalid={showError}>
      <FieldLabel htmlFor="new-savings-place-name">Nombre del lugar nuevo</FieldLabel>
      <Input
        id="new-savings-place-name"
        aria-label="Nombre del lugar nuevo"
        aria-invalid={showError ? 'true' : undefined}
        aria-describedby={showError ? errorId : undefined}
        value={name}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        disabled={disabled}
      />
      <FieldDescription>Este lugar se va a guardar para que puedas volver a usarlo</FieldDescription>
      {showError && <FieldError id={errorId}>{error}</FieldError>}
    </Field>
  )
}

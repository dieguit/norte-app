import { Field, FieldDescription, FieldError, FieldLabel } from '../../../components/ui/field'
import { Input } from '../../../components/ui/input'

export function SavingsPlaceNameField({
  name,
  error,
  disabled,
  onChange,
  errorId,
}: {
  name: string
  error?: string
  disabled?: boolean
  onChange: (name: string) => void
  errorId: string
}) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor="new-savings-place-name">Nombre del lugar nuevo</FieldLabel>
      <Input
        id="new-savings-place-name"
        aria-label="Nombre del lugar nuevo"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
        value={name}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
      <FieldDescription>Este lugar se va a guardar para que puedas volver a usarlo</FieldDescription>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </Field>
  )
}

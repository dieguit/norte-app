import { Field, FieldError, FieldGroup, FieldLabel, FieldSet } from '../../../components/ui/field'
import { Input } from '../../../components/ui/input'

interface SavingContributionInputsProps {
  currency: 'ARS' | 'USD'
  amount: string
  arsSpent: string
  effectiveRate: string
  validationError: string | null
  onAmountChange: (value: string) => void
  onArsSpentChange: (value: string) => void
  onRateChange: (value: string) => void
}

function SavingContributionArsInput({ amount, onChange }: { amount: string; onChange: (value: string) => void }) {
  return (
    <Field>
      <FieldLabel htmlFor="saving-amount-input">Monto en pesos</FieldLabel>
      <Input id="saving-amount-input" aria-label="Monto en pesos" inputMode="decimal" placeholder="0" value={amount} onChange={(event) => onChange(event.target.value)} />
    </Field>
  )
}

function SavingContributionUsdInputs({
  amount,
  arsSpent,
  effectiveRate,
  validationError,
  onAmountChange,
  onArsSpentChange,
  onRateChange,
}: SavingContributionInputsProps) {
  const errorId = 'saving-usd-validation-error'
  const isInvalid = Boolean(validationError)
  const describedBy = isInvalid ? errorId : undefined

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="saving-usd-amount-input">Monto en dólares</FieldLabel>
          <Input
            id="saving-usd-amount-input"
            aria-label="Monto en dólares"
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={(event) => onAmountChange(event.target.value)}
            aria-invalid={isInvalid}
            aria-describedby={describedBy}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="saving-rate-input">Tipo de cambio</FieldLabel>
          <Input
            id="saving-rate-input"
            aria-label="Tipo de cambio"
            inputMode="decimal"
            placeholder="1.500"
            value={effectiveRate}
            onChange={(event) => onRateChange(event.target.value)}
            aria-invalid={isInvalid}
            aria-describedby={describedBy}
          />
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor="saving-ars-spent-input">Pesos gastados</FieldLabel>
        <Input
          id="saving-ars-spent-input"
          aria-label="Pesos gastados"
          inputMode="decimal"
          placeholder="0"
          value={arsSpent}
          onChange={(event) => onArsSpentChange(event.target.value)}
          aria-invalid={isInvalid}
          aria-describedby={describedBy}
        />
      </Field>
      {validationError && <FieldError id={errorId} className="text-sm font-medium text-destructive">{validationError}</FieldError>}
    </div>
  )
}

export function SavingContributionInputs(props: SavingContributionInputsProps) {
  return (
    <FieldGroup className="flex flex-col gap-4">
      <FieldSet className="flex flex-col gap-4">
        {props.currency === 'ARS' ? <SavingContributionArsInput amount={props.amount} onChange={props.onAmountChange} /> : <SavingContributionUsdInputs {...props} />}
      </FieldSet>
    </FieldGroup>
  )
}

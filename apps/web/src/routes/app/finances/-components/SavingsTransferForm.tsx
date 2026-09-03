import type { FormEvent } from 'react'
import { Button } from '../../../../components/ui/button'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from '../../../../components/ui/field'
import { Input } from '../../../../components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select'
import { formatMoney } from '../../../../lib/format'
import type { CurrencyCode, Money } from '../../../../lib/money'
import type { SavingsPlaceSummary } from '../../../../features/savings-places/savings-places'

type SavingsTransferFormProps = {
  fromPlaceId: string
  places: SavingsPlaceSummary[]
  toPlaceId: string
  currency: CurrencyCode
  amount: string
  validationErrors: Record<string, string>
  error: string | null
  isPending: boolean
  availableBalance: Money
  isPositiveAmount: boolean
  hasInsufficientBalance: boolean
  destinationError?: string
  amountError?: string
  onDestinationChange: (value: string | null) => void
  onCurrencyChange: (value: CurrencyCode | null) => void
  onAmountChange: (value: string) => void
  onSubmit: (event: FormEvent) => void
}

function DestinationField({
  toPlaceId,
  destinationError,
  places,
  fromPlaceId,
  onDestinationChange,
  isPending,
}: Pick<SavingsTransferFormProps, 'toPlaceId' | 'destinationError' | 'places' | 'fromPlaceId' | 'onDestinationChange' | 'isPending'>) {
  return (
    <Field data-invalid={!!destinationError}>
      <FieldLabel htmlFor="savings-transfer-destination-trigger">Hacia</FieldLabel>
      <Select
        items={Object.fromEntries(places.map((place) => [place.id, place.name]))}
        value={toPlaceId}
        onValueChange={onDestinationChange}
        disabled={isPending}
      >
        <SelectTrigger
          id="savings-transfer-destination-trigger"
          aria-label="Hacia"
          aria-invalid={!!destinationError}
          aria-describedby={destinationError ? 'savings-transfer-destination-error' : undefined}
          className="w-full"
        >
          <SelectValue placeholder="Seleccionar destino" />
        </SelectTrigger>
        <SelectContent>
          {places.filter((place) => place.id !== fromPlaceId).map((place) => (
            <SelectItem key={place.id} value={place.id}>{place.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {destinationError && (
        <FieldError id="savings-transfer-destination-error">{destinationError}</FieldError>
      )}
    </Field>
  )
}

function CurrencyField({
  currency,
  validationErrors,
  onCurrencyChange,
  isPending,
}: Pick<SavingsTransferFormProps, 'currency' | 'validationErrors' | 'onCurrencyChange' | 'isPending'>) {
  return (
    <Field data-invalid={!!validationErrors.currency}>
      <FieldLabel htmlFor="savings-transfer-currency-trigger">Moneda</FieldLabel>
      <Select
        items={{ ARS: 'Pesos (ARS)', USD: 'Dólares (USD)' }}
        value={currency}
        onValueChange={(value) => onCurrencyChange(value as CurrencyCode | null)}
        disabled={isPending}
      >
        <SelectTrigger
          id="savings-transfer-currency-trigger"
          aria-label="Moneda"
          aria-invalid={!!validationErrors.currency}
          className="w-full"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ARS">Pesos (ARS)</SelectItem>
          <SelectItem value="USD">Dólares (USD)</SelectItem>
        </SelectContent>
      </Select>
    </Field>
  )
}

function AmountField({
  amount,
  amountError,
  availableBalance,
  onAmountChange,
  isPending,
}: Pick<SavingsTransferFormProps, 'amount' | 'amountError' | 'availableBalance' | 'onAmountChange' | 'isPending'>) {
  return (
    <Field data-invalid={!!amountError}>
      <FieldLabel htmlFor="savings-transfer-amount">Monto</FieldLabel>
      <Input
        id="savings-transfer-amount"
        aria-label="Monto"
        aria-invalid={!!amountError}
        aria-describedby={amountError ? 'savings-transfer-amount-error' : undefined}
        inputMode="decimal"
        placeholder="0"
        value={amount}
        onChange={(event) => onAmountChange(event.target.value)}
        disabled={isPending}
      />
      <p className="text-xs text-[var(--sea-ink-soft)]">Disponible: {formatMoney(availableBalance)}</p>
      {amountError && <FieldError id="savings-transfer-amount-error">{amountError}</FieldError>}
    </Field>
  )
}

function TransferSubmitButton({
  isPending,
  toPlaceId,
  isPositiveAmount,
  hasInsufficientBalance,
}: Pick<SavingsTransferFormProps, 'isPending' | 'toPlaceId' | 'isPositiveAmount' | 'hasInsufficientBalance'>) {
  return (
    <Button
      type="submit"
      disabled={isPending || !toPlaceId || !isPositiveAmount || hasInsufficientBalance}
      className="flex-1"
    >
      {isPending ? 'Transfiriendo...' : 'Transferir'}
    </Button>
  )
}

function TransferFormError({ error }: Pick<SavingsTransferFormProps, 'error'>) {
  return error ? <FieldError>{error}</FieldError> : null
}

export function SavingsTransferForm({
  fromPlaceId,
  places,
  toPlaceId,
  currency,
  amount,
  validationErrors,
  error,
  isPending,
  availableBalance,
  destinationError,
  amountError,
  isPositiveAmount,
  hasInsufficientBalance,
  onDestinationChange,
  onCurrencyChange,
  onAmountChange,
  onSubmit,
}: SavingsTransferFormProps) {
  return (
    <form onSubmit={onSubmit} aria-busy={isPending} className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
      <FieldGroup>
        <FieldSet>
          <DestinationField
            toPlaceId={toPlaceId}
            destinationError={destinationError}
            places={places}
            fromPlaceId={fromPlaceId}
            onDestinationChange={onDestinationChange}
            isPending={isPending}
          />
          <CurrencyField
            currency={currency}
            validationErrors={validationErrors}
            onCurrencyChange={onCurrencyChange}
            isPending={isPending}
          />
          <AmountField
            amount={amount}
            amountError={amountError}
            availableBalance={availableBalance}
            onAmountChange={onAmountChange}
            isPending={isPending}
          />
          <TransferFormError error={error} />
        </FieldSet>
      </FieldGroup>
      <div className="mt-auto flex gap-3 pt-4">
        <TransferSubmitButton
          isPending={isPending}
          toPlaceId={toPlaceId}
          isPositiveAmount={isPositiveAmount}
          hasInsufficientBalance={hasInsufficientBalance}
        />
      </div>
    </form>
  )
}

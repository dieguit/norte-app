import { useEffect, useState } from 'react'
import BigNumber from 'bignumber.js'
import { toast } from 'sonner'
import { useRouter } from '@tanstack/react-router'
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../../../../components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select'
import { transferSavings } from '../../../../features/savings-places/savings-places.functions'
import type { SavingsPlaceSummary } from '../../../../features/savings-places/savings-places'
import { formatMoney } from '../../../../lib/format'
import { createMoney, formatMoneyInput, parseMoneyInput } from '../../../../lib/money'

interface SavingsTransferSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fromPlace: SavingsPlaceSummary
  places: SavingsPlaceSummary[]
}

export function SavingsTransferSheet({
  open,
  onOpenChange,
  fromPlace,
  places,
}: SavingsTransferSheetProps) {
  const router = useRouter()
  const [toPlaceId, setToPlaceId] = useState('')
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS')
  const [amount, setAmount] = useState('')
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    if (!open) return
    setToPlaceId('')
    setCurrency('ARS')
    setAmount('')
    setValidationErrors({})
    setError(null)
  }, [fromPlace.id, open])

  const availableBalance = createMoney(fromPlace.balances[currency], currency)
  const parsedAmount = parseMoneyInput(amount, currency)
  const isPositiveAmount = Boolean(
    parsedAmount && new BigNumber(parsedAmount.amount).isGreaterThan(0),
  )
  const hasInsufficientBalance = Boolean(
    parsedAmount &&
      new BigNumber(parsedAmount.amount).isGreaterThan(availableBalance.amount),
  )
  const destinationError =
    validationErrors.toPlaceId ??
    (isPositiveAmount && !toPlaceId ? 'Elegí un destino.' : undefined)
  const amountError =
    validationErrors.amount ??
    (hasInsufficientBalance
      ? 'Saldo insuficiente en el origen.'
      : amount && !isPositiveAmount
        ? 'Ingresá un monto mayor a cero.'
        : undefined)

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isPending) return
    onOpenChange(nextOpen)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (isPending) return

    const nextErrors: Record<string, string> = {}
    if (!toPlaceId) nextErrors.toPlaceId = 'Elegí un destino.'
    if (!isPositiveAmount) nextErrors.amount = 'Ingresá un monto mayor a cero.'
    if (hasInsufficientBalance) nextErrors.amount = 'Saldo insuficiente en el origen.'
    if (Object.keys(nextErrors).length > 0) {
      setValidationErrors(nextErrors)
      return
    }

    setValidationErrors({})
    setError(null)
    setIsPending(true)

    try {
      await transferSavings({
        data: {
          fromPlaceId: fromPlace.id,
          toPlaceId,
          currency,
          amount: parsedAmount!.amount,
        },
      })
      toast.success('Transferencia realizada.')
      setToPlaceId('')
      setCurrency('ARS')
      setAmount('')
      setValidationErrors({})
      setError(null)
      onOpenChange(false)
      try {
        await router.invalidate()
      } catch {
        toast.error('La transferencia se realizó, pero no pudimos actualizar la vista.')
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Error al transferir.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 p-0 data-[side=right]:w-full data-[side=right]:max-w-none data-[side=right]:sm:w-[450px] data-[side=right]:sm:max-w-[450px]"
      >
        <SheetHeader className="border-b border-[var(--line)] px-6 py-5">
          <SheetTitle className="font-serif text-2xl font-bold text-[var(--sea-ink)]">
            Transferir desde {fromPlace.name}
          </SheetTitle>
          <SheetDescription>
            Elegí el destino y el monto que querés mover desde este lugar.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col gap-5 overflow-y-auto p-6"
        >
          <FieldGroup>
            <FieldSet>
              <Field data-invalid={!!destinationError}>
                <FieldLabel htmlFor="savings-transfer-destination-trigger">
                  Hacia
                </FieldLabel>
                <Select
                  items={Object.fromEntries(places.map((place) => [place.id, place.name]))}
                  value={toPlaceId}
                  onValueChange={(value) => {
                    if (value) {
                      setToPlaceId(value)
                      setValidationErrors((current) => {
                        const next = { ...current }
                        delete next.toPlaceId
                        return next
                      })
                    }
                  }}
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
                    {places
                      .filter((place) => place.id !== fromPlace.id)
                      .map((place) => (
                        <SelectItem key={place.id} value={place.id}>
                          {place.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {destinationError && (
                  <FieldError id="savings-transfer-destination-error">
                    {destinationError}
                  </FieldError>
                )}
              </Field>

              <Field data-invalid={!!validationErrors.currency}>
                <FieldLabel htmlFor="savings-transfer-currency-trigger">
                  Moneda
                </FieldLabel>
                <Select
                  items={{ ARS: 'Pesos (ARS)', USD: 'Dólares (USD)' }}
                  value={currency}
                  onValueChange={(value) =>
                    value && setCurrency(value as 'ARS' | 'USD')
                  }
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
                  onChange={(event) => {
                    setAmount(formatMoneyInput(event.target.value))
                    setValidationErrors((current) => {
                      const next = { ...current }
                      delete next.amount
                      return next
                    })
                  }}
                  disabled={isPending}
                />
                <p className="text-xs text-[var(--sea-ink-soft)]">
                  Disponible: {formatMoney(availableBalance)}
                </p>
                {amountError && (
                  <FieldError id="savings-transfer-amount-error">
                    {amountError}
                  </FieldError>
                )}
              </Field>

              {error && <FieldError>{error}</FieldError>}
            </FieldSet>
          </FieldGroup>

          <div className="mt-auto flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={
                isPending || !toPlaceId || !isPositiveAmount || hasInsufficientBalance
              }
              className="flex-1"
            >
              {isPending ? 'Transfiriendo...' : 'Transferir'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

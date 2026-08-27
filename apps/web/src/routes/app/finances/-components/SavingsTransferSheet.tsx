import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from '@tanstack/react-router'
import { Button } from '../../../../components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '../../../../components/ui/field'
import { Input } from '../../../../components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '../../../../components/ui/sheet'
import { transferSavings } from '../../../../features/savings-places/savings-places.functions'
import type { SavingsPlaceSummary } from '../../../../features/savings-places/savings-places'
import { formatMoneyInput } from '../../../../lib/money'

interface SavingsTransferSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  places: SavingsPlaceSummary[]
}

export function SavingsTransferSheet({
  open,
  onOpenChange,
  places,
}: SavingsTransferSheetProps) {
  const router = useRouter()

  const [fromPlaceId, setFromPlaceId] = useState<string>('')
  const [toPlaceId, setToPlaceId] = useState<string>('')
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const fromPlace = places.find((p) => p.id === fromPlaceId)

  const availableBalance = fromPlace?.balances[currency] ?? '0.00'
  const hasInsufficientBalance = Number(amount) > Number(availableBalance)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fromPlaceId || !toPlaceId || !amount || hasInsufficientBalance) return

    setIsPending(true)
    setError(null)

    try {
      await transferSavings({
        data: {
          fromPlaceId,
          toPlaceId,
          currency,
          amount,
        },
      })
      toast.success('Transferencia realizada.')
      await router.invalidate()
      onOpenChange(false)
      setFromPlaceId('')
      setToPlaceId('')
      setAmount('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al transferir.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Transferir entre lugares</SheetTitle>
          <SheetDescription>
            Mové dinero de un lugar de ahorro a otro.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel>Desde</FieldLabel>
              <Select
                value={fromPlaceId}
                onValueChange={(val) => {
                  if (val) {
                    setFromPlaceId(val)
                    if (val === toPlaceId) setToPlaceId('')
                  }
                }}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar origen" />
                </SelectTrigger>
                <SelectContent>
                  {places.map((place) => (
                    <SelectItem key={place.id} value={place.id}>
                      {place.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Hacia</FieldLabel>
              <Select
                value={toPlaceId}
                onValueChange={(val) => {
                  if (val) setToPlaceId(val)
                }}
                disabled={isPending || !fromPlaceId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar destino" />
                </SelectTrigger>
                <SelectContent>
                  {places
                    .filter((p) => p.id !== fromPlaceId)
                    .map((place) => (
                      <SelectItem key={place.id} value={place.id}>
                        {place.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Moneda</FieldLabel>
              <Select
                value={currency}
                onValueChange={(val) => setCurrency(val as 'ARS' | 'USD')}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ARS">ARS</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Monto</FieldLabel>
              <Input
                inputMode="decimal"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(formatMoneyInput(e.target.value))}
                disabled={isPending}
              />
              {fromPlaceId && (
                <p className="text-xs text-[var(--sea-ink-soft)]">
                  Disponible: {currency} {availableBalance}
                </p>
              )}
            </Field>

            {hasInsufficientBalance && (
              <FieldError>Saldo insuficiente en el origen.</FieldError>
            )}
            {error && <FieldError>{error}</FieldError>}
          </FieldGroup>

          <SheetFooter>
            <Button
              type="submit"
              disabled={
                isPending ||
                !fromPlaceId ||
                !toPlaceId ||
                !amount ||
                hasInsufficientBalance
              }
            >
              Transferir
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
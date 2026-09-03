import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import BigNumber from 'bignumber.js'
import { toast } from 'sonner'
import { useRouter } from '@tanstack/react-router'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../../../components/ui/sheet'
import { transferSavings } from '../../../../features/savings-places/savings-places.functions'
import type { SavingsPlaceSummary } from '../../../../features/savings-places/savings-places'
import { createMoney, formatMoneyInput, parseMoneyInput, type CurrencyCode, type Money } from '../../../../lib/money'
import { SavingsTransferForm } from './SavingsTransferForm'

type SavingsTransferSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  fromPlace: SavingsPlaceSummary
  places: SavingsPlaceSummary[]
}

type TransferValues = {
  toPlaceId: string
  currency: CurrencyCode
  amount: string
}

function getValidationErrors(
  values: TransferValues,
  isPositiveAmount: boolean,
  hasInsufficientBalance: boolean,
) {
  const errors: Record<string, string> = {}
  if (!values.toPlaceId) errors.toPlaceId = 'Elegí un destino.'
  if (!isPositiveAmount) errors.amount = 'Ingresá un monto mayor a cero.'
  if (hasInsufficientBalance) errors.amount = 'Saldo insuficiente en el origen.'
  return errors
}

function isPositiveAmount(amount: ReturnType<typeof parseMoneyInput>) {
  return Boolean(amount && new BigNumber(amount.amount).isGreaterThan(0))
}

function isInsufficientBalance(
  amount: ReturnType<typeof parseMoneyInput>,
  balance: Money,
) {
  return Boolean(amount && new BigNumber(amount.amount).isGreaterThan(balance.amount))
}

function getDestinationError(
  values: TransferValues,
  validationErrors: Record<string, string>,
  positive: boolean,
) {
  return validationErrors.toPlaceId ?? (positive && !values.toPlaceId ? 'Elegí un destino.' : undefined)
}

function getAmountError(
  values: TransferValues,
  validationErrors: Record<string, string>,
  insufficient: boolean,
  positive: boolean,
) {
  return validationErrors.amount ?? (
    insufficient
      ? 'Saldo insuficiente en el origen.'
      : values.amount && !positive
        ? 'Ingresá un monto mayor a cero.'
        : undefined
  )
}

function getTransferState(
  values: TransferValues,
  fromPlace: SavingsPlaceSummary,
  validationErrors: Record<string, string>,
) {
  const availableBalance = createMoney(fromPlace.balances[values.currency], values.currency)
  const parsedAmount = parseMoneyInput(values.amount, values.currency)
  const positive = isPositiveAmount(parsedAmount)
  const insufficient = isInsufficientBalance(parsedAmount, availableBalance)
  return {
    availableBalance,
    parsedAmount,
    isPositiveAmount: positive,
    hasInsufficientBalance: insufficient,
    destinationError: getDestinationError(values, validationErrors, positive),
    amountError: getAmountError(values, validationErrors, insufficient, positive),
  }
}

function focusFirstInvalidTransferField(errors: Record<string, string>) {
  const id = errors.toPlaceId ? 'savings-transfer-destination-trigger' : errors.amount ? 'savings-transfer-amount' : undefined
  if (id) document.getElementById(id)?.focus()
}

function resetForm(
  setToPlaceId: (value: string) => void,
  setCurrency: (value: CurrencyCode) => void,
  setAmount: (value: string) => void,
  setValidationErrors: (value: Record<string, string>) => void,
  setError: (value: string | null) => void,
) {
  setToPlaceId('')
  setCurrency('ARS')
  setAmount('')
  setValidationErrors({})
  setError(null)
}

function clearFieldError(
  setValidationErrors: Dispatch<SetStateAction<Record<string, string>>>,
  field: string,
) {
  setValidationErrors((current) => {
    const next = { ...current }
    delete next[field]
    return next
  })
}

async function completeTransfer({
  fromPlaceId,
  toPlaceId,
  currency,
  amount,
  router,
  onOpenChange,
  reset,
}: {
  fromPlaceId: string
  toPlaceId: string
  currency: CurrencyCode
  amount: string
  router: ReturnType<typeof useRouter>
  onOpenChange: (open: boolean) => void
  reset: () => void
}) {
  await transferSavings({ data: { fromPlaceId, toPlaceId, currency, amount } })
  toast.success('Transferencia realizada.')
  reset()
  onOpenChange(false)
  try {
    await router.invalidate()
  } catch {
    toast.error('La transferencia se realizó, pero no pudimos actualizar la vista.')
  }
}

type TransferDraftState = {
  values: TransferValues
  validationErrors: Record<string, string>
  error: string | null
  isPending: boolean
  setToPlaceId: (value: string) => void
  setCurrency: (value: CurrencyCode) => void
  setAmount: (value: string) => void
  setValidationErrors: Dispatch<SetStateAction<Record<string, string>>>
  setError: (value: string | null) => void
  setIsPending: (value: boolean) => void
  reset: () => void
}

function useTransferDraftState({
  open,
  fromPlace,
}: Pick<SavingsTransferSheetProps, 'open' | 'fromPlace'>): TransferDraftState {
  const [toPlaceId, setToPlaceId] = useState('')
  const [currency, setCurrency] = useState<CurrencyCode>('ARS')
  const [amount, setAmount] = useState('')
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    if (!open) return
    resetForm(setToPlaceId, setCurrency, setAmount, setValidationErrors, setError)
  }, [fromPlace.id, open])

  return {
    values: { toPlaceId, currency, amount },
    validationErrors,
    error,
    isPending,
    setToPlaceId,
    setCurrency,
    setAmount,
    setValidationErrors,
    setError,
    setIsPending,
    reset: () => resetForm(setToPlaceId, setCurrency, setAmount, setValidationErrors, setError),
  }
}

type TransferActionsProps = {
  state: TransferDraftState
  transferState: ReturnType<typeof getTransferState>
  fromPlace: SavingsPlaceSummary
  onOpenChange: (open: boolean) => void
  router: ReturnType<typeof useRouter>
}

function useTransferActions({
  state,
  transferState,
  fromPlace,
  onOpenChange,
  router,
}: TransferActionsProps) {
  const { values, isPending, setToPlaceId, setCurrency, setAmount, setValidationErrors, setError, setIsPending } = state

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (isPending) return
    const nextErrors = getValidationErrors(
      values,
      transferState.isPositiveAmount,
      transferState.hasInsufficientBalance,
    )
    if (Object.keys(nextErrors).length > 0) {
      setValidationErrors(nextErrors)
      focusFirstInvalidTransferField(nextErrors)
      return
    }
    setValidationErrors({})
    setError(null)
    setIsPending(true)
    try {
      await completeTransfer({
        fromPlaceId: fromPlace.id,
        toPlaceId: values.toPlaceId,
        currency: values.currency,
        amount: transferState.parsedAmount!.amount,
        router,
        onOpenChange,
        reset: state.reset,
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Error al transferir.')
    } finally {
      setIsPending(false)
    }
  }

  return {
    ...values,
    onDestinationChange: (value: string | null) => {
      if (!value) return
      setToPlaceId(value)
      clearFieldError(setValidationErrors, 'toPlaceId')
    },
    onCurrencyChange: (value: CurrencyCode | null) => value && setCurrency(value),
    onAmountChange: (value: string) => {
      setAmount(formatMoneyInput(value))
      clearFieldError(setValidationErrors, 'amount')
    },
    onSubmit: handleSubmit,
  }
}

function useSavingsTransferSheet(props: SavingsTransferSheetProps) {
  const state = useTransferDraftState(props)
  const transferState = getTransferState(state.values, props.fromPlace, state.validationErrors)
  const actions = useTransferActions({
    state,
    transferState,
    fromPlace: props.fromPlace,
    onOpenChange: props.onOpenChange,
    router: useRouter(),
  })
  return { ...state.values, ...transferState, ...state, ...actions }
}

export function SavingsTransferSheet(props: SavingsTransferSheetProps) {
  const state = useSavingsTransferSheet(props)
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && state.isPending) return
    props.onOpenChange(nextOpen)
  }
  return (
    <Sheet open={props.open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 p-0 data-[side=right]:w-full data-[side=right]:max-w-none data-[side=right]:sm:w-[450px] data-[side=right]:sm:max-w-[450px]"
      >
        <SheetHeader className="border-b border-[var(--line)] px-6 py-5">
          <SheetTitle className="font-serif text-2xl font-bold text-[var(--sea-ink)]">
            Transferir desde {props.fromPlace.name}
          </SheetTitle>
          <SheetDescription>
            Elegí el destino y el monto que querés mover desde este lugar.
          </SheetDescription>
        </SheetHeader>
        <SavingsTransferForm {...state} fromPlaceId={props.fromPlace.id} places={props.places} />
      </SheetContent>
    </Sheet>
  )
}

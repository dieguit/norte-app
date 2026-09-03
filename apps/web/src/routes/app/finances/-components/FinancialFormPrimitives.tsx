import { useEffect, useState, type ReactNode } from 'react'
import {
  Field,
  FieldError,
  FieldLabel,
} from '../../../../components/ui/field'
import { Input } from '../../../../components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../../../components/ui/sheet'
import { Switch } from '../../../../components/ui/switch'
import { getArsEquivalent } from '../../../../features/financial/financial'
import { formatMoneyInput, type CurrencyCode } from '../../../../lib/money'

type ArsEquivalent = { toFixed: (fractionDigits: number) => string } | null

export type FinancialDraftState<TDraft> = {
  draft: TDraft
  error: string | null
  validationErrors: Record<string, string>
  saving: boolean
  setDraft: (draft: TDraft) => void
  setError: (error: string | null) => void
  setValidationErrors: (errors: Record<string, string>) => void
  setSaving: (saving: boolean) => void
  arsEquivalent: ArsEquivalent
}

export type FinancialSourceValue = {
  kind: string
  sourceId?: string | null
  name?: string
}

function getFinancialSourceOptions(
  fixedSources: Record<string, string>,
  sources: Array<{ id: string; name: string }>,
) {
  return [
    ...Object.entries(fixedSources).map(([kind, label]) => ({ value: `fixed:${kind}`, label })),
    ...sources.map((source) => ({ value: `custom:${source.id}`, label: source.name })),
  ]
}

function getFinancialSourcePickerState<TSource extends FinancialSourceValue>(
  fixedSources: Record<string, string>,
  sources: Array<{ id: string; name: string }>,
  value: TSource,
) {
  return {
    options: getFinancialSourceOptions(fixedSources, sources),
    isOtherSource: value.kind === 'custom' && value.name !== undefined,
    selectedValue: getFinancialSourceValue(value),
  }
}

export function buildFinancialSourcePickerProps<TSource extends FinancialSourceValue>({
  fixedSources,
  sources,
  value,
  label,
  triggerId,
  errorId,
  newSourceId,
  error,
  showPersistenceHint,
  disabled,
  getSource,
  onChange,
  onNewSourceNameChange,
}: {
  fixedSources: Record<string, string>
  sources: Array<{ id: string; name: string }>
  value: TSource
  label: string
  triggerId: string
  errorId: string
  newSourceId: string
  error?: string
  showPersistenceHint: boolean
  disabled: boolean
  getSource: (value: string | null) => TSource | undefined
  onChange: (source: TSource) => void
  onNewSourceNameChange: (name: string) => void
}) {
  const { options, isOtherSource, selectedValue } = getFinancialSourcePickerState(
    fixedSources,
    sources,
    value,
  )
  return {
    label,
    triggerId,
    errorId,
    newSourceId,
    options,
    selectedValue,
    isOtherSource,
    newSourceName: value.name ?? '',
    error,
    showPersistenceHint,
    disabled,
    onValueChange: (nextValue: string | null) => {
      const source = getSource(nextValue)
      if (source) onChange(source)
    },
    onNewSourceNameChange,
  }
}

function getFinancialSourceValue(value: FinancialSourceValue) {
  if (value.kind === 'custom' && value.name !== undefined) return 'other'
  if (value.kind === 'custom') return `custom:${value.sourceId}`
  return `fixed:${value.kind}`
}

export function useFinancialDraftState<TDraft extends { amount: string; currency: CurrencyCode }>({
  open,
  initialDraft,
  resetKey,
}: {
  open: boolean
  initialDraft: TDraft
  resetKey: string
}): FinancialDraftState<TDraft> {
  const [draft, setDraft] = useState(initialDraft)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(null)
    setValidationErrors({})
    setDraft(initialDraft)
  }, [open, resetKey])

  return {
    draft,
    error,
    validationErrors,
    saving,
    setDraft,
    setError,
    setValidationErrors,
    setSaving,
    arsEquivalent: getArsEquivalent(draft.amount, draft.currency),
  }
}

export function FinancialAmountFields<TDraft extends { amount: string; currency: CurrencyCode }>({
  kind,
  draft,
  amountError,
  arsEquivalent,
  saving,
  onDraftChange,
}: {
  kind: 'income' | 'expense'
  draft: TDraft
  amountError?: string
  arsEquivalent: ArsEquivalent
  saving: boolean
  onDraftChange: (draft: TDraft) => void
}) {
  const amountId = `${kind}-amount`
  const currencyId = `${kind}-currency-trigger`

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field data-invalid={!!amountError}>
          <FieldLabel htmlFor={amountId}>Monto</FieldLabel>
          <Input
            id={amountId}
            aria-label="Monto"
            aria-invalid={!!amountError}
            aria-describedby={amountError ? `${amountId}-error` : undefined}
            inputMode="decimal"
            placeholder="0"
            value={draft.amount}
            disabled={saving}
            onChange={(event) => onDraftChange({ ...draft, amount: formatMoneyInput(event.target.value) })}
          />
          {amountError && <FieldError id={`${amountId}-error`}>{amountError}</FieldError>}
        </Field>
        <Field>
          <FieldLabel htmlFor={currencyId}>Moneda</FieldLabel>
          <Select
            items={{ ARS: 'Pesos (ARS)', USD: 'Dólares (USD)' }}
            value={draft.currency}
            disabled={saving}
            onValueChange={(nextCurrency) => {
              if (nextCurrency === 'ARS' || nextCurrency === 'USD') {
                onDraftChange({ ...draft, currency: nextCurrency })
              }
            }}
          >
            <SelectTrigger id={currencyId} aria-label="Moneda" className="w-full">
              <SelectValue placeholder="Seleccionar moneda" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ARS">Pesos (ARS)</SelectItem>
              <SelectItem value="USD">Dólares (USD)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      {arsEquivalent !== null && (
        <p className="text-sm text-[var(--sea-ink-soft)]">
          Equivale a ARS {formatMoneyInput(arsEquivalent.toFixed(0))}
        </p>
      )}
    </>
  )
}

export function FinancialRecurrenceField({
  id,
  checked,
  label,
  saving,
  onCheckedChange,
}: {
  id: string
  checked: boolean
  label: string
  saving: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <Field orientation="horizontal">
      <Switch id={id} checked={checked} disabled={saving} onCheckedChange={onCheckedChange} />
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
    </Field>
  )
}

export function FinancialSheetFrame({
  open,
  onOpenChange,
  saving,
  title,
  description,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  saving: boolean
  title: string
  description: string
  children: ReactNode
}) {
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && saving) return
    onOpenChange(nextOpen)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 p-0 data-[side=right]:w-full data-[side=right]:max-w-none data-[side=right]:sm:w-[450px] data-[side=right]:sm:max-w-[450px]"
      >
        <SheetHeader className="border-b border-[var(--line)] px-6 py-5">
          <SheetTitle className="font-serif text-2xl font-bold text-[var(--sea-ink)]">{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  )
}

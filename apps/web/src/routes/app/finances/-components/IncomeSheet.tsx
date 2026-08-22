import { useEffect, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import BigNumber from 'bignumber.js'
import { toast } from 'sonner'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../../../components/ui/sheet'
import { MonthPickerInput } from '../../../../components/MonthPicker'
import { createIncome, deleteIncome, updateIncome } from '../../../../features/financial/financial.functions'
import { FIXED_INCOME_SOURCES } from '../../../../features/financial/incomes'
import { createIncomeSchema, type IncomeDraft } from '../../../../features/financial/incomes.schema'
import { PLANNING_ARS_PER_USD } from '../../../../features/financial/financial'
import { formatMoneyInput, parseMoneyInput } from '../../../../lib/money'
import { IncomeSourcePicker } from './IncomeSourcePicker'

type IncomeRow = {
  id: string
  sourceKind: string
  sourceId: string | null
  sourceName: string
  amount: string
  currency: 'ARS' | 'USD'
  recurring: boolean
  effectiveMonth: string
}

function defaultDraft(month: string): IncomeDraft {
  return {
    source: { kind: 'salary' }, amount: '', currency: 'ARS', recurring: true,
    effectiveMonth: month,
  }
}

export function IncomeSheet({
  open,
  onOpenChange,
  month,
  sources,
  income,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  month: string
  sources: Array<{ id: string; name: string }>
  income?: IncomeRow
}) {
  const router = useRouter()
  const [draft, setDraft] = useState<IncomeDraft>(() => defaultDraft(month))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(null)
    setDraft(income ? {
      source: income.sourceKind === 'custom'
        ? { kind: 'custom', sourceId: income.sourceId! }
        : { kind: income.sourceKind as keyof typeof FIXED_INCOME_SOURCES },
      amount: formatMoneyInput(income.amount.replace('.', ',')),
      currency: income.currency,
      recurring: income.recurring,
      effectiveMonth: income.effectiveMonth.slice(0, 7),
    } : defaultDraft(month))
  }, [income, month, open])

  async function save() {
    const parsed = createIncomeSchema.safeParse({ draft })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revisá los datos del ingreso.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const normalizedDraft = {
        ...parsed.data.draft,
        amount: parseMoneyInput(parsed.data.draft.amount, parsed.data.draft.currency)!.amount,
      }
      if (income) await updateIncome({ data: { incomeId: income.id, draft: normalizedDraft } })
      else await createIncome({ data: { draft: normalizedDraft } })
      await router.invalidate()
      toast.success(income ? 'Ingreso actualizado.' : 'Ingreso agregado.')
      onOpenChange(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos guardar el ingreso.')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!income || !window.confirm('¿Eliminar este ingreso?')) return
    setSaving(true)
    try {
      await deleteIncome({ data: { incomeId: income.id } })
      await router.invalidate()
      toast.success('Ingreso eliminado.')
      onOpenChange(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos eliminar el ingreso.')
    } finally {
      setSaving(false)
    }
  }

  const parsedUsdAmount = draft.currency === 'USD' ? parseMoneyInput(draft.amount, 'USD') : null
  const arsEquivalent = parsedUsdAmount && new BigNumber(parsedUsdAmount.amount).isGreaterThan(0)
    ? new BigNumber(parsedUsdAmount.amount).times(PLANNING_ARS_PER_USD)
    : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col gap-0 p-0 data-[side=right]:w-full data-[side=right]:max-w-none data-[side=right]:sm:w-[450px] data-[side=right]:sm:max-w-[450px]">
        <SheetHeader className="border-b border-[var(--line)] px-6 py-5">
          <SheetTitle className="font-serif text-2xl font-bold text-[var(--sea-ink)]">{income ? 'Editar ingreso' : 'Nuevo ingreso'}</SheetTitle>
          <SheetDescription>Indicá el origen y desde cuándo contás con este ingreso.</SheetDescription>
        </SheetHeader>
        <form className="flex flex-1 flex-col gap-5 overflow-y-auto p-6" onSubmit={(event) => { event.preventDefault(); void save() }}>
          <IncomeSourcePicker sources={sources} value={draft.source} onChange={(source) => setDraft({ ...draft, source })} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-[var(--sea-ink)]">
              Monto
              <Input
                aria-label="Monto"
                inputMode="decimal"
                placeholder="0"
                value={draft.amount}
                onChange={(event) => setDraft({ ...draft, amount: formatMoneyInput(event.target.value) })}
              />
            </label>
            <fieldset className="grid gap-2">
              <legend className="text-sm font-medium text-[var(--sea-ink)]">Moneda</legend>
              <div className="flex gap-2">
                {(['ARS', 'USD'] as const).map((currency) => <Button key={currency} type="button" variant={draft.currency === currency ? 'default' : 'outline'} aria-pressed={draft.currency === currency} onClick={() => setDraft({ ...draft, currency })}>{currency}</Button>)}
              </div>
            </fieldset>
          </div>
          {arsEquivalent !== null && <p className="text-sm text-[var(--sea-ink-soft)]">Equivale a ARS {formatMoneyInput(arsEquivalent.toFixed(0))}</p>}
          <label className="flex items-center gap-3 text-sm font-medium text-[var(--sea-ink)]">
            <input type="checkbox" checked={draft.recurring} onChange={(event) => setDraft({ ...draft, recurring: event.target.checked })} />
            Es ingreso recurrente
          </label>
          <label className="grid gap-2 text-sm font-medium text-[var(--sea-ink)]">
            {draft.recurring ? 'Desde el mes' : 'Mes del ingreso'}
            <MonthPickerInput
              aria-label={draft.recurring ? 'Desde el mes' : 'Mes del ingreso'}
              value={draft.effectiveMonth}
              onValueChange={(effectiveMonth) => setDraft({ ...draft, effectiveMonth })}
            />
          </label>
          {error && <p role="alert" tabIndex={-1} className="text-sm text-destructive">{error}</p>}
          <div className="mt-auto flex gap-3 pt-4">
            {income && <Button type="button" variant="destructive" onClick={() => void remove()} disabled={saving}>Eliminar</Button>}
            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

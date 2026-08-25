import { useEffect, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import BigNumber from 'bignumber.js'
import { toast } from 'sonner'
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
import { Switch } from '../../../../components/ui/switch'
import { MonthPickerInput } from '../../../../components/MonthPicker'
import {
  createExpense,
  deleteExpense,
  updateExpense,
} from '../../../../features/financial/financial.functions'
import { FIXED_EXPENSE_SOURCES } from '../../../../features/financial/expenses'
import {
  createExpenseSchema,
  type ExpenseDraft,
} from '../../../../features/financial/expenses.schema'
import { PLANNING_ARS_PER_USD } from '../../../../features/financial/financial'
import { formatMoneyInput, parseMoneyInput } from '../../../../lib/money'
import { ExpenseSourcePicker } from './ExpenseSourcePicker'

type ExpenseRow = {
  id: string
  sourceKind: string
  sourceId: string | null
  sourceName: string
  amount: string
  currency: 'ARS' | 'USD'
  recurring: boolean
  effectiveMonth: string
  endMonth?: string | null
}

type ExpenseFormDraft = ExpenseDraft & { effectiveMonth: string }

function defaultDraft(month: string): ExpenseFormDraft {
  return {
    source: { kind: 'housing' },
    amount: '',
    currency: 'ARS',
    recurring: true,
    effectiveMonth: month,
  }
}

export function ExpenseSheet({
  open,
  onOpenChange,
  month,
  sources,
  expense,
  draft: initialDraft,
  onSaveDraft,
  recurringOnly = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  month: string
  sources: Array<{ id: string; name: string }>
  expense?: ExpenseRow
  draft?: ExpenseDraft
  onSaveDraft?: (draft: ExpenseDraft) => void
  recurringOnly?: boolean
}) {
  const router = useRouter()
  const [draft, setDraft] = useState<ExpenseFormDraft>(() => defaultDraft(month))
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(null)
    setValidationErrors({})
    setDraft(
      expense
        ? {
            source:
              expense.sourceKind === 'custom'
                ? { kind: 'custom', sourceId: expense.sourceId! }
                : {
                    kind: expense.sourceKind as keyof typeof FIXED_EXPENSE_SOURCES,
                  },
            amount: formatMoneyInput(expense.amount.replace('.', ',')),
            currency: expense.currency,
            recurring: expense.recurring,
            effectiveMonth: expense.effectiveMonth.slice(0, 7),
          }
        : initialDraft
          ? {
              ...initialDraft,
              amount: formatMoneyInput(initialDraft.amount.replace('.', ',')),
              recurring: recurringOnly ? true : initialDraft.recurring,
              effectiveMonth: month,
            }
          : defaultDraft(month),
    )
  }, [expense, initialDraft, month, open, recurringOnly])

  async function save() {
    const parsed = createExpenseSchema.safeParse({
      draft: {
        source: draft.source,
        amount: draft.amount,
        currency: draft.currency,
        recurring: draft.recurring,
      },
      effectiveMonth: draft.effectiveMonth,
    })
    if (!parsed.success) {
      const errors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] === 'draft' ? issue.path[1] : issue.path[0]
        if (typeof field === 'string' && !errors[field]) {
          errors[field] = issue.message
        }
      }
      setValidationErrors(errors)
      return
    }
    setValidationErrors({})
    setSaving(true)
    setError(null)
    try {
      const normalizedDraft = {
        ...parsed.data.draft,
        amount: parseMoneyInput(
          parsed.data.draft.amount,
          parsed.data.draft.currency,
        )!.amount,
      }
      if (onSaveDraft) {
        onSaveDraft(normalizedDraft)
      } else {
        if (expense) {
          await updateExpense({
            data: {
              expenseId: expense.id,
              draft: normalizedDraft,
              effectiveMonth: parsed.data.effectiveMonth,
            },
          })
        } else {
          await createExpense({
            data: {
              draft: normalizedDraft,
              effectiveMonth: parsed.data.effectiveMonth,
            },
          })
        }
        await router.invalidate()
        toast.success(expense ? 'Gasto actualizado.' : 'Gasto agregado.')
      }
      onOpenChange(false)
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'No pudimos guardar el gasto.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!expense || !window.confirm('¿Eliminar este gasto desde el mes seleccionado?')) return
    setSaving(true)
    try {
      await deleteExpense({
        data: {
          expenseId: expense.id,
          effectiveMonth: month,
        },
      })
      await router.invalidate()
      toast.success('Gasto eliminado.')
      onOpenChange(false)
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'No pudimos eliminar el gasto.',
      )
    } finally {
      setSaving(false)
    }
  }

  const parsedUsdAmount =
    draft.currency === 'USD' ? parseMoneyInput(draft.amount, 'USD') : null
  const arsEquivalent =
    parsedUsdAmount && new BigNumber(parsedUsdAmount.amount).isGreaterThan(0)
      ? new BigNumber(parsedUsdAmount.amount).times(PLANNING_ARS_PER_USD)
      : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 p-0 data-[side=right]:w-full data-[side=right]:max-w-none data-[side=right]:sm:w-[450px] data-[side=right]:sm:max-w-[450px]"
      >
        <SheetHeader className="border-b border-[var(--line)] px-6 py-5">
          <SheetTitle className="font-serif text-2xl font-bold text-[var(--sea-ink)]">
            {recurringOnly
              ? initialDraft
                ? 'Editar gasto recurrente'
                : 'Nuevo gasto recurrente'
              : expense
                ? 'Editar gasto'
                : 'Nuevo gasto'}
          </SheetTitle>
          <SheetDescription>
            {recurringOnly
              ? 'Indicá cuánto gastás por mes y en qué concepto.'
              : 'Indicá el concepto y las condiciones de este gasto.'}
          </SheetDescription>
        </SheetHeader>
        <form
          className="flex flex-1 flex-col gap-5 overflow-y-auto p-6"
          onSubmit={(event) => {
            event.preventDefault()
            void save()
          }}
        >
          <FieldGroup>
            <FieldSet>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field data-invalid={!!validationErrors.amount}>
                  <FieldLabel htmlFor="expense-amount">Monto</FieldLabel>
                  <Input
                    id="expense-amount"
                    aria-label="Monto"
                    inputMode="decimal"
                    placeholder="0"
                    value={draft.amount}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        amount: formatMoneyInput(event.target.value),
                      })
                    }
                  />
                  {validationErrors.amount && (
                    <FieldError>{validationErrors.amount}</FieldError>
                  )}
                </Field>
                <Field>
                  <FieldLabel htmlFor="expense-currency-trigger">
                    Moneda
                  </FieldLabel>
                  <Select
                    items={{ ARS: 'Pesos (ARS)', USD: 'Dólares (USD)' }}
                    value={draft.currency}
                    onValueChange={(currency) =>
                      currency &&
                      setDraft({
                        ...draft,
                        currency: currency as 'ARS' | 'USD',
                      })
                    }
                  >
                    <SelectTrigger
                      id="expense-currency-trigger"
                      aria-label="Moneda"
                      className="w-full"
                    >
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
              {!recurringOnly && (
                <Field orientation="horizontal">
                  <Switch
                    id="expense-recurring"
                    checked={draft.recurring}
                    onCheckedChange={(recurring) =>
                      setDraft({
                        ...draft,
                        recurring,
                        source:
                          draft.source.kind === 'custom'
                            ? draft.source
                            : { kind: recurring ? 'housing' : 'clothing' },
                      })
                    }
                  />
                  <FieldLabel htmlFor="expense-recurring">
                    Es gasto recurrente
                  </FieldLabel>
                </Field>
              )}
              <ExpenseSourcePicker
                recurring={draft.recurring}
                sources={sources}
                value={draft.source}
                error={validationErrors.source}
                onChange={(source) => setDraft({ ...draft, source })}
                showPersistenceHint={!onSaveDraft}
              />
              {!recurringOnly && (
                <Field data-invalid={!!validationErrors.effectiveMonth}>
                  <FieldLabel htmlFor="expense-month-picker">
                    {draft.recurring ? 'Desde el mes' : 'Mes del gasto'}
                  </FieldLabel>
                  <MonthPickerInput
                    id="expense-month-picker"
                    aria-label={draft.recurring ? 'Desde el mes' : 'Mes del gasto'}
                    value={draft.effectiveMonth}
                    onValueChange={(effectiveMonth) =>
                      setDraft({ ...draft, effectiveMonth })
                    }
                  />
                  {validationErrors.effectiveMonth && (
                    <FieldError>{validationErrors.effectiveMonth}</FieldError>
                  )}
                </Field>
              )}
              {error && <FieldError>{error}</FieldError>}
            </FieldSet>
          </FieldGroup>
          <div className="mt-auto flex gap-3 pt-4">
            {expense && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => void remove()}
                disabled={saving}
              >
                Eliminar
              </Button>
            )}
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

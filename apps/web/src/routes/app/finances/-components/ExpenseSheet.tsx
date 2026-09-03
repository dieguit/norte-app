import { usePostHog } from '@posthog/react'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
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
import { FinancialSheetFrame, type FinancialDraftState, useFinancialDraftState } from './FinancialFormPrimitives'
import { formatMoneyInput, parseMoneyInput } from '../../../../lib/money'
import { ExpenseSheetForm } from './ExpenseSheetForm'

type ExpenseRow = {
  id: string
  sourceKind: string
  sourceId: string | null
  sourceName: string
  amount: string
  concept: string | null
  currency: 'ARS' | 'USD'
  recurring: boolean
  effectiveMonth: string
  endMonth?: string | null
}

type ExpenseFormDraft = ExpenseDraft & { effectiveMonth: string }

type ExpenseSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  month: string
  sources: Array<{ id: string; name: string }>
  expense?: ExpenseRow
  draft?: ExpenseDraft
  onSaveDraft?: (draft: ExpenseDraft) => void
  recurringOnly?: boolean
}

type ValidationIssue = { path: PropertyKey[]; message: string }

function defaultDraft(month: string): ExpenseFormDraft {
  return {
    source: { kind: 'housing' },
    amount: '',
    concept: '',
    currency: 'ARS',
    recurring: true,
    effectiveMonth: month,
  }
}

function getExpenseDraft(
  expense: ExpenseRow | undefined,
  initialDraft: ExpenseDraft | undefined,
  month: string,
  recurringOnly: boolean,
): ExpenseFormDraft {
  if (expense) {
    return {
      source:
        expense.sourceKind === 'custom'
          ? { kind: 'custom', sourceId: expense.sourceId! }
          : { kind: expense.sourceKind as keyof typeof FIXED_EXPENSE_SOURCES },
      amount: formatMoneyInput(expense.amount.replace('.', ',')),
      concept: expense.concept ?? '',
      currency: expense.currency,
      recurring: expense.recurring,
      effectiveMonth: month,
    }
  }
  if (!initialDraft) return defaultDraft(month)
  return {
    ...initialDraft,
    amount: formatMoneyInput(initialDraft.amount.replace('.', ',')),
    recurring: recurringOnly ? true : initialDraft.recurring,
    effectiveMonth: month,
  }
}

function getValidationErrors(issues: readonly ValidationIssue[]) {
  const errors: Record<string, string> = {}
  for (const issue of issues) {
    const field = issue.path[0] === 'draft' ? issue.path[1] : issue.path[0]
    if (typeof field === 'string' && !errors[field]) errors[field] = issue.message
  }
  return errors
}

function normalizeExpenseDraft(draft: ExpenseDraft): ExpenseDraft {
  return {
    ...draft,
    amount: parseMoneyInput(draft.amount, draft.currency)!.amount,
  }
}

function parseExpenseFormDraft(draft: ExpenseFormDraft) {
  const parsed = createExpenseSchema.safeParse({
    draft: {
      source: draft.source,
      amount: draft.amount,
      concept: draft.concept,
      currency: draft.currency,
      recurring: draft.recurring,
    },
    effectiveMonth: draft.effectiveMonth,
  })
  if (!parsed.success) return { errors: getValidationErrors(parsed.error.issues) }
  return {
    data: {
      draft: normalizeExpenseDraft(parsed.data.draft),
      effectiveMonth: parsed.data.effectiveMonth,
    },
  }
}

async function persistExpense(
  expense: ExpenseRow | undefined,
  draft: ExpenseDraft,
  effectiveMonth: string,
) {
  if (expense) {
    await updateExpense({ data: { expenseId: expense.id, draft, effectiveMonth } })
    return
  }
  await createExpense({ data: { draft, effectiveMonth } })
}

function useExpenseDraftState({
  open,
  month,
  expense,
  draft: initialDraft,
  recurringOnly = false,
}: Pick<ExpenseSheetProps, 'open' | 'month' | 'expense' | 'draft' | 'recurringOnly'>): FinancialDraftState<ExpenseFormDraft> {
  const initialDraftValue = getExpenseDraft(expense, initialDraft, month, recurringOnly)
  return useFinancialDraftState({
    open,
    initialDraft: initialDraftValue,
    resetKey: JSON.stringify(initialDraftValue),
  })
}

async function persistExpenseForm(
  expense: ExpenseRow | undefined,
  draft: ExpenseDraft,
  effectiveMonth: string,
  onSaveDraft: ((draft: ExpenseDraft) => void) | undefined,
  posthog: ReturnType<typeof usePostHog>,
) {
  if (onSaveDraft) {
    onSaveDraft(draft)
    return
  }
  await persistExpense(expense, draft, effectiveMonth)
  posthog?.capture(expense ? 'expense_updated' : 'expense_created', {
    recurring: draft.recurring,
    currency: draft.currency,
    source_kind: draft.source.kind,
  })
}

function focusFirstInvalidExpenseField(draft: ExpenseFormDraft, errors: Record<string, string>) {
  const fields = [
    ['amount', 'expense-amount'],
    ['source', draft.source.kind === 'custom' && 'name' in draft.source ? 'new-expense-name' : 'expense-source-trigger'],
    ['concept', 'expense-concept'],
    ['effectiveMonth', 'expense-month-picker'],
  ] as const
  const [, id] = fields.find(([field]) => errors[field]) ?? []
  if (id) document.getElementById(id)?.focus()
}

type ExpenseSheetActionProps = ExpenseSheetProps & FinancialDraftState<ExpenseFormDraft> & {
  router: ReturnType<typeof useRouter>
  posthog: ReturnType<typeof usePostHog>
}

async function removeExpense({
  expense,
  month,
  onOpenChange,
  router,
  posthog,
  setError,
  setSaving,
  saving,
}: ExpenseSheetActionProps) {
  if (saving) return
  if (!expense || !window.confirm('¿Eliminar este gasto desde el mes seleccionado?')) return
  setSaving(true)
  try {
    await deleteExpense({ data: { expenseId: expense.id, effectiveMonth: month } })
    posthog?.capture('expense_deleted', {
      recurring: expense.recurring,
      currency: expense.currency,
      source_kind: expense.sourceKind,
    })
    toast.success('Gasto eliminado.')
    onOpenChange(false)
    try {
      await router.invalidate()
    } catch {
      toast.error('El gasto se eliminó, pero no pudimos actualizar la vista.')
    }
  } catch (cause) {
    setError(cause instanceof Error ? cause.message : 'No pudimos eliminar el gasto.')
  } finally {
    setSaving(false)
  }
}

function useExpenseSheetActions(props: ExpenseSheetActionProps) {
  const {
    expense,
    onOpenChange,
    onSaveDraft,
    router,
    posthog,
    draft,
    setError,
    setValidationErrors,
    setSaving,
  } = props

  async function save() {
    if (props.saving) return
    const result = parseExpenseFormDraft(draft)
    if (!result.data) {
      setValidationErrors(result.errors)
      focusFirstInvalidExpenseField(draft, result.errors)
      return
    }
    setValidationErrors({})
    setSaving(true)
    setError(null)
    try {
      await persistExpenseForm(
        expense,
        result.data.draft,
        result.data.effectiveMonth,
        onSaveDraft,
        posthog,
      )
      if (!onSaveDraft) {
        toast.success(expense ? 'Gasto actualizado.' : 'Gasto agregado.')
        onOpenChange(false)
        try {
          await router.invalidate()
        } catch {
          toast.error('El gasto se guardó, pero no pudimos actualizar la vista.')
        }
      } else {
        onOpenChange(false)
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos guardar el gasto.')
    } finally {
      setSaving(false)
    }
  }

  return {
    onSave: () => void save(),
    onRemove: expense ? () => void removeExpense(props) : undefined,
  }
}

function useExpenseSheet(props: ExpenseSheetProps) {
  const state = useExpenseDraftState(props)
  const router = useRouter()
  const posthog = usePostHog()
  const actions = useExpenseSheetActions({ ...props, ...state, router, posthog })

  return {
    ...state,
    showPersistenceHint: !props.onSaveDraft,
    onDraftChange: state.setDraft,
    ...actions,
  }
}

function getTitle(recurringOnly: boolean, hasDraft: boolean, hasExpense: boolean) {
  if (recurringOnly) return hasDraft ? 'Editar gasto recurrente' : 'Nuevo gasto recurrente'
  return hasExpense ? 'Editar gasto' : 'Nuevo gasto'
}

export function ExpenseSheet(props: ExpenseSheetProps) {
  const state = useExpenseSheet(props)
  const { open, onOpenChange, sources, expense, draft, recurringOnly = false } = props
  return (
    <FinancialSheetFrame
      open={open}
      onOpenChange={onOpenChange}
      saving={state.saving}
      title={getTitle(recurringOnly, Boolean(draft), Boolean(expense))}
      description={
        recurringOnly
          ? 'Indicá cuánto gastás por mes y en qué concepto.'
          : 'Indicá el concepto y las condiciones de este gasto.'
      }
    >
        <ExpenseSheetForm
          draft={state.draft}
          error={state.error}
          validationErrors={state.validationErrors}
          saving={state.saving}
          arsEquivalent={state.arsEquivalent}
          showPersistenceHint={state.showPersistenceHint}
          onDraftChange={state.onDraftChange}
          onSave={state.onSave}
          onRemove={state.onRemove}
          sources={sources}
          recurringOnly={recurringOnly}
        />
    </FinancialSheetFrame>
  )
}

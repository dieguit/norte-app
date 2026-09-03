import {
  FIXED_EXPENSE_SOURCES,
  ONE_TIME_EXPENSE_SOURCES,
  RECURRING_EXPENSE_SOURCES,
} from '../../../../features/financial/expenses'
import type { ExpenseDraft } from '../../../../features/financial/expenses.schema'
import { buildFinancialSourcePickerProps } from './FinancialFormPrimitives'
import { FinancialSourcePicker } from './FinancialSourcePicker'

function getSource(nextValue: string | null): ExpenseDraft['source'] | undefined {
  if (!nextValue) return undefined
  if (nextValue === 'other') return { kind: 'custom', name: '' }
  if (nextValue.startsWith('fixed:')) {
    return { kind: nextValue.slice('fixed:'.length) as keyof typeof FIXED_EXPENSE_SOURCES }
  }
  return { kind: 'custom', sourceId: nextValue.slice('custom:'.length) }
}

export function ExpenseSourcePicker({
  recurring,
  sources,
  value,
  error,
  onChange,
  showPersistenceHint = true,
  disabled = false,
}: {
  recurring: boolean
  sources: Array<{ id: string; name: string }>
  value: ExpenseDraft['source']
  error?: string
  onChange: (source: ExpenseDraft['source']) => void
  showPersistenceHint?: boolean
  disabled?: boolean
}) {
  return (
    <FinancialSourcePicker
      {...buildFinancialSourcePickerProps({
        fixedSources: recurring ? RECURRING_EXPENSE_SOURCES : ONE_TIME_EXPENSE_SOURCES,
        sources,
        value,
        label: 'Categoría del gasto',
        triggerId: 'expense-source-trigger',
        errorId: 'expense-source-error',
        newSourceId: 'new-expense-name',
        error,
        showPersistenceHint,
        disabled,
        getSource,
        onChange,
        onNewSourceNameChange: (name) => onChange({ kind: 'custom', name }),
      })}
    />
  )
}

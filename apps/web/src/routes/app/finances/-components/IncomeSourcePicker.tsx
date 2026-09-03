import {
  FIXED_INCOME_SOURCES,
  ONE_TIME_INCOME_SOURCES,
  RECURRING_INCOME_SOURCES,
} from '../../../../features/financial/incomes'
import type { IncomeDraft } from '../../../../features/financial/incomes.schema'
import { buildFinancialSourcePickerProps } from './FinancialFormPrimitives'
import { FinancialSourcePicker } from './FinancialSourcePicker'

function getSource(nextValue: string | null): IncomeDraft['source'] | undefined {
  if (!nextValue) return undefined
  if (nextValue === 'other') return { kind: 'custom', name: '' }
  if (nextValue.startsWith('fixed:')) {
    return { kind: nextValue.slice('fixed:'.length) as keyof typeof FIXED_INCOME_SOURCES }
  }
  return { kind: 'custom', sourceId: nextValue.slice('custom:'.length) }
}

export function IncomeSourcePicker({
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
  value: IncomeDraft['source']
  error?: string
  onChange: (source: IncomeDraft['source']) => void
  showPersistenceHint?: boolean
  disabled?: boolean
}) {
  return (
    <FinancialSourcePicker
      {...buildFinancialSourcePickerProps({
        fixedSources: recurring ? RECURRING_INCOME_SOURCES : ONE_TIME_INCOME_SOURCES,
        sources,
        value,
        label: 'Categoría del ingreso',
        triggerId: 'income-source-trigger',
        errorId: 'income-source-error',
        newSourceId: 'new-income-name',
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

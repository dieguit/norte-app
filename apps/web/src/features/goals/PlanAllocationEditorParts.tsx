import { formatMoney } from '../../lib/format'
import { Field, FieldLabel } from '../../components/ui/field'
import { Input } from '../../components/ui/input'
import { Slider } from '../../components/ui/slider'
import type { GoalCreationAllocationEntry } from './goal-creation'

function BaseAmount({ entry }: { entry: GoalCreationAllocationEntry }) {
  if (entry.allocatedBaseAmount) return <span>{formatMoney(entry.allocatedBaseAmount)}</span>
  if (entry.allocatedDestinationAmount?.currency === 'ARS') {
    return <span>{formatMoney(entry.allocatedDestinationAmount)}</span>
  }
  return null
}

function UsdAmount({ entry }: { entry: GoalCreationAllocationEntry }) {
  if (entry.allocatedDestinationAmount?.currency !== 'USD') return null
  const amount = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(entry.allocatedDestinationAmount.amount))
  return <span>≈ USD {amount} por mes</span>
}

function AllocationEntryAmounts({ entry }: { entry: GoalCreationAllocationEntry }) {
  return <div className="flex flex-wrap items-center gap-x-2 text-xs font-normal text-[var(--sea-ink-soft)]"><BaseAmount entry={entry} /><UsdAmount entry={entry} /></div>
}

function formatSliderPercentage(value: number | number[]) {
  const number = Array.isArray(value) ? value[0] : value
  return Number(number ?? 0).toFixed(2)
}

function PlanAllocationEntry({
  entry,
  disabled,
  isValid,
  errorId,
  errorMessage,
  onPercentageChange,
  onPercentageCommit,
}: {
  entry: GoalCreationAllocationEntry
  disabled: boolean
  isValid: boolean
  errorId: string
  errorMessage: string | null
  onPercentageChange: (goalId: string, percentage: string) => void
  onPercentageCommit: () => void
}) {
  const inputId = `allocation-${entry.goalId}-input`
  const labelId = `allocation-${entry.goalId}-label`
  const sliderValue = Number((entry.percentage || '0').replace(',', '.')) || 0

  return (
    <Field key={entry.goalId} data-invalid={!isValid} data-testid="allocation-row">
      <div className="flex items-center justify-between gap-4">
        <FieldLabel id={labelId} htmlFor={inputId} className="flex cursor-pointer flex-col items-start gap-0.5">
          <span className="text-sm font-medium text-[var(--sea-ink)]">{entry.goalName}</span>
          <AllocationEntryAmounts entry={entry} />
        </FieldLabel>
        <div className="flex items-center gap-1.5">
          <Input
            id={inputId}
            aria-label={`Porcentaje para ${entry.goalName}`}
            aria-invalid={!isValid}
            aria-describedby={errorMessage ? errorId : undefined}
            disabled={disabled}
            inputMode="decimal"
            value={entry.percentage?.replace('.', ',') ?? ''}
            onBlur={onPercentageCommit}
            onChange={(event) => onPercentageChange(entry.goalId, event.target.value)}
            className="w-20! text-right font-mono text-sm"
          />
          <span aria-hidden="true" className="text-sm font-medium text-[var(--sea-ink-soft)]">%</span>
        </div>
      </div>
      <Slider
        aria-label={`Porcentaje para ${entry.goalName}`}
        aria-invalid={!isValid}
        aria-describedby={errorMessage ? errorId : undefined}
        disabled={disabled}
        min={0}
        max={100}
        step={1}
        value={[sliderValue]}
        onValueChange={(value) => onPercentageChange(entry.goalId, formatSliderPercentage(value as number | number[]))}
        onValueCommitted={onPercentageCommit}
      />
    </Field>
  )
}

export function PlanAllocationGroup({
  title,
  entries,
  ...props
}: {
  title: string
  entries: GoalCreationAllocationEntry[]
  disabled: boolean
  isValid: boolean
  errorId: string
  errorMessage: string | null
  onPercentageChange: (goalId: string, percentage: string) => void
  onPercentageCommit: () => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)]">{title}</h4>
      <div className="flex flex-col gap-4">
        {entries.map((entry) => <PlanAllocationEntry key={entry.goalId} entry={entry} {...props} />)}
      </div>
    </div>
  )
}

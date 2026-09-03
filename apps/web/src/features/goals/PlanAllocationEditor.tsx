import BigNumber from 'bignumber.js'
import { FieldError } from '../../components/ui/field'
import {
  calculatePercentageSum,
  type GoalCreationAllocation,
} from './goal-creation'
import { PlanAllocationGroup } from './PlanAllocationEditorParts'

export interface PlanAllocationEditorProps {
  allocation: GoalCreationAllocation
  disabled?: boolean
  onPercentageChange: (goalId: string, percentage: string) => void
  onPercentageCommit: () => void
}

function getAllocationError(total: BigNumber) {
  if (total.isEqualTo(100)) return null
  const difference = total.isLessThan(100) ? new BigNumber(100).minus(total) : total.minus(100)
  return `${total.isLessThan(100) ? 'Falta asignar' : 'Te excediste'} ${difference.toFixed(2).replace('.', ',')}%`
}

export function PlanAllocationEditor({
  allocation,
  disabled = false,
  onPercentageChange,
  onPercentageCommit,
}: PlanAllocationEditorProps) {
  const total = calculatePercentageSum(allocation.entries)
  const isValid = total.isEqualTo(100)
  const errorMessage = getAllocationError(total)
  const errorId = 'allocation-total-error'
  const pendingEntry = allocation.entries.find((entry) => entry.pending)
  const existingEntries = allocation.entries.filter((entry) => !entry.pending)
  const groupProps = {
    disabled,
    isValid,
    errorId,
    errorMessage,
    onPercentageChange,
    onPercentageCommit,
  }

  return (
    <section
      aria-label="Distribución de tu aporte mensual"
      className="flex flex-col gap-4 rounded-xl border border-[var(--line)] bg-[var(--foam)]/30 p-4 sm:p-5"
    >
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold text-[var(--sea-ink)]">Distribución de tu aporte mensual</h3>
        {errorMessage && <FieldError id={errorId}>{errorMessage}</FieldError>}
      </div>
      <div className="flex flex-col gap-6">
        {pendingEntry && (
          <PlanAllocationGroup title="Nuevo objetivo" entries={[pendingEntry]} {...groupProps} />
        )}
        {existingEntries.length > 0 && (
          <PlanAllocationGroup title="Tus objetivos actuales" entries={existingEntries} {...groupProps} />
        )}
      </div>
    </section>
  )
}

import BigNumber from 'bignumber.js'
import { formatMoney } from '../../lib/format'
import { Field, FieldError, FieldLabel } from '../../components/ui/field'
import { Input } from '../../components/ui/input'
import { Slider } from '../../components/ui/slider'
import { calculatePercentageSum, type GoalCreationAllocationGroup } from './goal-creation'

export interface PlanAllocationEditorProps {
  groups: GoalCreationAllocationGroup[]
  disabled?: boolean
  onPercentageChange: (groupKey: string, goalId: string, percentage: string) => void
  onPercentageCommit: () => void
}

export function PlanAllocationEditor({
  groups,
  disabled = false,
  onPercentageChange,
  onPercentageCommit,
}: PlanAllocationEditorProps) {
  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => {
        const methodLabel = group.fundingMethod === 'save' ? 'Ahorrar' : 'Invertir'
        const title = `${methodLabel} en ${group.destinationCurrency}`

        const totalBn = calculatePercentageSum(group.entries)

        const isGroupValid = totalBn.isEqualTo(100)

        const totalDisplay = totalBn.isEqualTo(100)
          ? '100%'
          : `${totalBn.toFixed(2).replace('.', ',')}%`

        const summaryText = group.monthlyCommitment
          ? `De tus ${formatMoney(group.monthlyCommitment)} mensuales, asignaste el ${totalDisplay} a objetivos.`
          : `Asignaste el ${totalDisplay} a objetivos.`

        let errorMessage: string | null = null
        if (!isGroupValid) {
          if (totalBn.isLessThan(100)) {
            const missing = new BigNumber(100).minus(totalBn)
            errorMessage = `Falta asignar ${missing.toFixed(2).replace('.', ',')}%`
          } else {
            const excess = totalBn.minus(100)
            errorMessage = `Te excediste ${excess.toFixed(2).replace('.', ',')}%`
          }
        }

        return (
          <section
            key={group.key}
            aria-label={title}
            className="flex flex-col gap-4 rounded-xl border border-[var(--line)] bg-[var(--foam)]/30 p-4 sm:p-5"
          >
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-semibold text-[var(--sea-ink)]">{title}</h3>
              <p className="text-sm text-[var(--sea-ink-soft)]">{summaryText}</p>
              {errorMessage && <FieldError>{errorMessage}</FieldError>}
            </div>

            <div className="flex flex-col gap-4">
              {group.entries.map((entry) => {
                const sliderValue = Number(entry.percentage.replace(',', '.')) || 0

                return (
                  <Field key={entry.goalId} data-invalid={!isGroupValid}>
                    <div className="flex items-center justify-between gap-4">
                      <FieldLabel
                        id={`${group.key}-${entry.goalId}-label`}
                        htmlFor={`${group.key}-${entry.goalId}-input`}
                        className="flex flex-col items-start gap-0.5 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[var(--sea-ink)]">
                            {entry.goalName}
                          </span>
                          {entry.pending && (
                            <span className="inline-flex items-center rounded-full bg-[var(--foam)] border border-[var(--line)] px-2 py-0.5 text-xs font-medium text-[var(--pine)]">
                              Nuevo objetivo
                            </span>
                          )}
                        </div>
                        {entry.allocatedDestinationAmount && (
                          <span className="text-xs text-[var(--sea-ink-soft)] font-normal">
                            {formatMoney(entry.allocatedDestinationAmount)}
                          </span>
                        )}
                      </FieldLabel>
                      <div className="flex items-center gap-1.5">
                        <Input
                          id={`${group.key}-${entry.goalId}-input`}
                          aria-label={`Porcentaje para ${entry.goalName}`}
                          aria-invalid={!isGroupValid}
                          disabled={disabled}
                          inputMode="decimal"
                          value={entry.percentage != null ? entry.percentage.replace('.', ',') : ''}
                          onBlur={onPercentageCommit}
                          onChange={(event) =>
                            onPercentageChange(group.key, entry.goalId, event.target.value)
                          }
                          className="w-20 text-right font-mono text-sm"
                        />
                        <span aria-hidden="true" className="text-sm font-medium text-[var(--sea-ink-soft)]">
                          %
                        </span>
                      </div>
                    </div>
                    <Slider
                      aria-label={`Porcentaje para ${entry.goalName}`}
                      disabled={disabled}
                      min={0}
                      max={100}
                      step={1}
                      value={[sliderValue]}
                      onValueChange={(val) => {
                        const num = Array.isArray(val) ? val[0] : (val as number)
                        onPercentageChange(group.key, entry.goalId, Number(num ?? 0).toFixed(2))
                      }}
                      onValueCommitted={onPercentageCommit}
                    />
                  </Field>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}

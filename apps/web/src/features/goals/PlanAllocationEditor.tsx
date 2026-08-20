import BigNumber from "bignumber.js";
import { formatMoney } from "../../lib/format";
import { Field, FieldError, FieldLabel } from "../../components/ui/field";
import { Input } from "../../components/ui/input";
import { Slider } from "../../components/ui/slider";
import {
  calculatePercentageSum,
  type GoalCreationAllocation,
  type GoalCreationAllocationEntry,
} from "./goal-creation";

export interface PlanAllocationEditorProps {
  allocation: GoalCreationAllocation;
  disabled?: boolean;
  onPercentageChange: (goalId: string, percentage: string) => void;
  onPercentageCommit: () => void;
}

export function PlanAllocationEditor({
  allocation,
  disabled = false,
  onPercentageChange,
  onPercentageCommit,
}: PlanAllocationEditorProps) {
  const totalBn = calculatePercentageSum(allocation.entries);
  const isValid = totalBn.isEqualTo(100);

  let errorMessage: string | null = null;
  if (!isValid) {
    if (totalBn.isLessThan(100)) {
      const missing = new BigNumber(100).minus(totalBn);
      errorMessage = `Falta asignar ${missing.toFixed(2).replace(".", ",")}%`;
    } else {
      const excess = totalBn.minus(100);
      errorMessage = `Te excediste ${excess.toFixed(2).replace(".", ",")}%`;
    }
  }

  const pendingEntry = allocation.entries.find((entry) => entry.pending);
  const existingEntries = allocation.entries.filter((entry) => !entry.pending);

  const renderEntry = (entry: GoalCreationAllocationEntry) => {
    const sliderValue =
      Number((entry.percentage || "0").replace(",", ".")) || 0;

    const isUsdDestination =
      entry.allocatedDestinationAmount?.currency === "USD";
    const formattedUsd =
      isUsdDestination && entry.allocatedDestinationAmount
        ? new Intl.NumberFormat("es-AR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(Number(entry.allocatedDestinationAmount.amount))
        : null;

    return (
      <Field key={entry.goalId} data-invalid={!isValid}>
        <div className="flex items-center justify-between gap-4">
          <FieldLabel
            id={`allocation-${entry.goalId}-label`}
            htmlFor={`allocation-${entry.goalId}-input`}
            className="flex flex-col items-start gap-0.5 cursor-pointer"
          >
            <span className="text-sm font-medium text-[var(--sea-ink)]">
              {entry.goalName}
            </span>
            <div className="flex flex-wrap items-center gap-x-2 text-xs text-[var(--sea-ink-soft)] font-normal">
              {entry.allocatedBaseAmount && (
                <span>{formatMoney(entry.allocatedBaseAmount)}</span>
              )}
              {!entry.allocatedBaseAmount &&
                entry.allocatedDestinationAmount &&
                entry.allocatedDestinationAmount.currency === "ARS" && (
                  <span>{formatMoney(entry.allocatedDestinationAmount)}</span>
                )}
              {isUsdDestination && formattedUsd && (
                <span>≈ USD {formattedUsd} por mes</span>
              )}
            </div>
          </FieldLabel>
          <div className="flex items-center gap-1.5">
            <Input
              id={`allocation-${entry.goalId}-input`}
              aria-label={`Porcentaje para ${entry.goalName}`}
              aria-invalid={!isValid}
              disabled={disabled}
              inputMode="decimal"
              value={
                entry.percentage != null
                  ? entry.percentage.replace(".", ",")
                  : ""
              }
              onBlur={onPercentageCommit}
              onChange={(event) =>
                onPercentageChange(entry.goalId, event.target.value)
              }
              className="w-20 text-right font-mono text-sm"
            />
            <span
              aria-hidden="true"
              className="text-sm font-medium text-[var(--sea-ink-soft)]"
            >
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
            const num = Array.isArray(val) ? val[0] : (val as number);
            onPercentageChange(entry.goalId, Number(num ?? 0).toFixed(2));
          }}
          onValueCommitted={onPercentageCommit}
        />
      </Field>
    );
  };

  return (
    <section
      aria-label="Distribución de tu aporte mensual"
      className="flex flex-col gap-4 rounded-xl border border-[var(--line)] bg-[var(--foam)]/30 p-4 sm:p-5"
    >
      <div className="flex flex-col gap-1">
        <div className="flex flex-col sm:flex-col sm:justify-between gap-1">
          <h3 className="text-base font-semibold text-[var(--sea-ink)]">
            Distribución de tu aporte mensual
          </h3>
          <div>
            {allocation.monthlyContribution && (
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-[var(--sea-ink-soft)] font-medium">
                  Tu aporte mensual
                </span>
                <span className="text-sm font-semibold text-[var(--sea-ink)]">
                  {formatMoney(allocation.monthlyContribution)}
                </span>
              </div>
            )}
          </div>
        </div>
        {errorMessage && <FieldError>{errorMessage}</FieldError>}
      </div>

      <div className="flex flex-col gap-6">
        {pendingEntry && (
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)]">
              Nuevo objetivo
            </h4>
            {renderEntry(pendingEntry)}
          </div>
        )}

        {existingEntries.length > 0 && (
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)]">
              Tus objetivos actuales
            </h4>
            <div className="flex flex-col gap-4">
              {existingEntries.map(renderEntry)}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { usePostHog } from "@posthog/react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import BigNumber from "bignumber.js";
import { formatMoney } from "../../../../lib/format";
import { createMoney } from "../../../../lib/money";
import { Button } from "../../../../components/ui/button";
import { Slider } from "../../../../components/ui/slider";
import { PlanAllocationEditor } from "../../../../features/goals/PlanAllocationEditor";
import { getGoalContributionArs } from "../../../../features/financial/monthly-plan";
import {
  calculatePercentageSum,
  rebalanceAllocationEntries,
  recalculateAllocationAmounts,
  type GoalCreationAllocation,
  type GoalCreationAllocationEntry,
} from "../../../../features/goals/goal-creation";
import {
  previewAllocationChange,
  confirmAllocationChange,
} from "../../../../features/goals/goals.functions";
import type {
  AllocationChangeContext,
  AllocationChangePreviewResult,
} from "../../../../features/goals/allocation-change";
import { AllocationImpactComparison } from "./AllocationImpactComparison";

export interface AllocationChangeProps {
  context: AllocationChangeContext;
  onCancel: () => void;
  onUpdated: () => void;
}

export function AllocationChange({
  context,
  onCancel,
  onUpdated,
}: AllocationChangeProps) {
  const router = useRouter();
  const posthog = usePostHog();
  const serverErrorRef = useRef<HTMLDivElement>(null);

  const [dedicationPercentage, setDedicationPercentage] = useState<number>(
    () => {
      const raw = context.financialSummary?.dedicationPercentage;
      const parsed = Number(raw ? String(raw).replace(",", ".") : 90);
      return Number.isFinite(parsed) ? Math.round(parsed) : 90;
    },
  );

  const [entries, setEntries] = useState<
    Array<{ goalId: string; percentage: string }>
  >(() => {
    const allocationSource =
      context.pendingAllocation ?? context.currentAllocation;
    const sourceMap = new Map(
      allocationSource?.entries.map((e) => [e.goalId, e.percentage]),
    );
    return context.activeGoals.map((g) => ({
      goalId: g.id,
      percentage:
        sourceMap.get(g.id) ??
        (context.activeGoals.length === 1 ? "100.00" : "0.00"),
    }));
  });

  const [preview, setPreview] = useState<AllocationChangePreviewResult | null>(
    null,
  );
  const [isPreviewPending, setIsPreviewPending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const hasPositiveBalance = useMemo(() => {
    return new BigNumber(
      context.financialSummary?.balance?.amount ?? "0",
    ).isGreaterThan(0);
  }, [context.financialSummary?.balance?.amount]);

  const monthlyContribution = useMemo(() => {
    return getGoalContributionArs(
      context.financialSummary?.balance ?? createMoney("0", "ARS"),
      dedicationPercentage,
    );
  }, [context.financialSummary?.balance, dedicationPercentage]);

  useEffect(() => {
    if (serverError) {
      serverErrorRef.current?.focus();
    }
  }, [serverError]);

  useEffect(() => {
    if (calculatePercentageSum(entries).isEqualTo(100)) {
      let active = true;
      setIsPreviewPending(true);
      previewAllocationChange({
        data: {
          dedicationPercentage,
          allocations: entries,
        },
      })
        .then((res) => {
          if (active) {
            setPreview(res);
          }
        })
        .catch((err) => {
          if (active) {
            setServerError(
              err?.message ?? "Ocurrió un error al calcular la proyección.",
            );
          }
        })
        .finally(() => {
          if (active) {
            setIsPreviewPending(false);
          }
        });
      return () => {
        active = false;
      };
    }
  }, []);

  const baseEntries: GoalCreationAllocationEntry[] = useMemo(() => {
    return context.activeGoals.map((goal) => {
      const draftEntry = entries.find((e) => e.goalId === goal.id);
      return {
        goalId: goal.id,
        goalName: goal.name,
        percentage: draftEntry ? draftEntry.percentage : "0.00",
        pending: false,
      };
    });
  }, [context.activeGoals, entries]);

  const amountsMap = useMemo(() => {
    return recalculateAllocationAmounts({
      monthlyContribution,
      entries: baseEntries.map((entry) => {
        const goal = context.activeGoals.find((g) => g.id === entry.goalId);
        return {
          goalId: entry.goalId,
          percentage: entry.percentage,
          currency: goal?.currency ?? "ARS",
        };
      }),
    });
  }, [monthlyContribution, context.activeGoals, baseEntries]);

  const displayEntries: GoalCreationAllocationEntry[] = useMemo(() => {
    return baseEntries.map((entry) => {
      const amounts = amountsMap.get(entry.goalId);
      return {
        ...entry,
        allocatedBaseAmount: amounts?.allocatedBaseAmount,
        allocatedDestinationAmount: amounts?.allocatedDestinationAmount,
      };
    });
  }, [baseEntries, amountsMap]);

  const totalBn = useMemo(
    () => calculatePercentageSum(displayEntries),
    [displayEntries],
  );
  const isAllocationsValid =
    displayEntries.length > 0 && totalBn.isEqualTo(100);

  const isPreviewSynced = useMemo(() => {
    if (!preview) return false;
    if (preview.proposal.dedicationPercentage !== dedicationPercentage) {
      return false;
    }
    if (entries.length === 0) return true;
    return entries.every((draftEntry) => {
      const propEntry = preview.proposal.allocation.entries.find(
        (e) => e.goalId === draftEntry.goalId,
      );
      if (!propEntry) return false;
      try {
        const dPct = new BigNumber(
          (draftEntry.percentage || "0").trim().replace(",", "."),
        );
        const pPct = new BigNumber(
          (propEntry.percentage || "0").trim().replace(",", "."),
        );
        if (
          !dPct.isFinite() ||
          dPct.isNaN() ||
          !pPct.isFinite() ||
          pPct.isNaN()
        )
          return false;
        return dPct.toFixed(2) === pPct.toFixed(2);
      } catch {
        return false;
      }
    });
  }, [preview, entries, dedicationPercentage]);

  const isPreviewOutdated = !preview || !isPreviewSynced;

  const handlePercentageChange = (goalId: string, nextPercentage: string) => {
    const rebalanced = rebalanceAllocationEntries(
      entries,
      goalId,
      nextPercentage,
    );
    setEntries(rebalanced);
  };

  const handleCommit = async (
    overrideEntries?: Array<{ goalId: string; percentage: string }>,
    overrideDedication?: number,
  ) => {
    const currentEntries = overrideEntries ?? entries;
    const currentDedication = overrideDedication ?? dedicationPercentage;

    if (!calculatePercentageSum(currentEntries).isEqualTo(100)) {
      return;
    }

    setIsPreviewPending(true);
    setServerError(null);
    try {
      const previewResult = await previewAllocationChange({
        data: {
          dedicationPercentage: currentDedication,
          allocations: currentEntries,
        },
      });
      setPreview(previewResult);
    } catch (err: any) {
      setPreview(null);
      setServerError(
        err?.message ?? "Ocurrió un error al actualizar el impacto.",
      );
      setTimeout(() => serverErrorRef.current?.focus(), 0);
    } finally {
      setIsPreviewPending(false);
    }
  };

  const handleConfirm = async () => {
    if (
      !preview ||
      !isPreviewSynced ||
      !isAllocationsValid ||
      !hasPositiveBalance
    )
      return;
    setIsSubmitting(true);
    setServerError(null);

    try {
      const result = await confirmAllocationChange({
        data: {
          draft: {
            dedicationPercentage,
            allocations: entries,
          },
          previewToken: preview.previewToken,
        },
      });

      if (result.status === "stale") {
        setDedicationPercentage(result.preview.proposal.dedicationPercentage);
        setEntries(
          result.preview.proposal.allocation.entries.map((e) => ({
            goalId: e.goalId,
            percentage: e.percentage,
          })),
        );
        setPreview(result.preview);
        setServerError(
          "Tu Plan cambió. Revisá la distribución actualizada antes de confirmar.",
        );
        setTimeout(() => serverErrorRef.current?.focus(), 0);
        return;
      }

      const initialDedicationPercentage = Math.round(
        Number(
          String(
            context.financialSummary?.dedicationPercentage ?? 90,
          ).replace(",", "."),
        ),
      );
      const originalAllocation =
        context.pendingAllocation ?? context.currentAllocation;
      const allocationsChanged =
        entries.length !== (originalAllocation?.entries.length ?? 0) ||
        entries.some((entry) => {
          const original = originalAllocation?.entries.find(
            (candidate) => candidate.goalId === entry.goalId,
          );
          return (
            !original || !new BigNumber(entry.percentage).isEqualTo(original.percentage)
          );
        });

      if (allocationsChanged) {
        posthog?.capture("goal_allocations_updated");
      }
      if (dedicationPercentage !== initialDedicationPercentage) {
        posthog?.capture("goal_monthly_balance_percentage_updated");
      }
      await router.invalidate();
      toast.success("Plan actualizado.");
      onUpdated();
    } catch (err: any) {
      setServerError(err?.message ?? "Ocurrió un error al guardar.");
      setTimeout(() => serverErrorRef.current?.focus(), 0);
    } finally {
      setIsSubmitting(false);
    }
  };

  const allocationToDisplay: GoalCreationAllocation = {
    monthlyContribution: undefined,
    effectiveMonth: preview?.proposal.allocation.effectiveMonth ?? "",
    entries: displayEntries,
    totalPercentage: totalBn.toFixed(2),
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Scrollable Stage Body */}
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
        {/* Step progress heading */}
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
          <h3 className="text-base font-semibold text-[var(--sea-ink)]">
            Distribución e impacto
          </h3>
        </div>

        {/* Server error summary */}
        {serverError && (
          <div
            ref={serverErrorRef}
            tabIndex={-1}
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive outline-none focus:ring-2 focus:ring-destructive"
          >
            {serverError}
          </div>
        )}

        {/* Dedication percentage slider */}
        <section
          aria-labelledby="dedication-heading"
          className="flex flex-col gap-4"
        >
          <div className="flex items-end justify-between gap-4">
            <div>
              <h3
                id="dedication-heading"
                className="text-base font-semibold text-[var(--sea-ink)]"
              >
                Aporte mensual a objetivos
              </h3>
              <p className="text-sm text-[var(--sea-ink-soft)]">
                Elegí qué porcentaje de tu saldo mensual querés destinar a tus
                objetivos.
              </p>
            </div>
            <strong className="tabular-nums text-[var(--sea-ink)]">
              {dedicationPercentage}%
            </strong>
          </div>
          <Slider
            aria-label="Porcentaje del saldo para objetivos"
            min={0}
            max={100}
            step={1}
            value={[dedicationPercentage]}
            onValueChange={(val) => {
              const num = Array.isArray(val) ? val[0] : (val as number);
              setDedicationPercentage(
                typeof num === "number" ? Math.round(num) : 0,
              );
            }}
            onValueCommitted={(val) => {
              const num = Array.isArray(val) ? val[0] : val;
              const nextDedication =
                typeof num === "number" ? Math.round(num) : dedicationPercentage;
              handleCommit(undefined, nextDedication);
            }}
            disabled={isPreviewPending || isSubmitting || !hasPositiveBalance}
          />
          <p className="text-sm text-[var(--sea-ink-soft)]">
            Aproximadamente <strong>{formatMoney(monthlyContribution)}</strong>{" "}
            por mes
          </p>
          {!hasPositiveBalance && (
            <p className="text-sm text-[var(--sea-ink-soft)]">
              No tenés saldo disponible este mes para asignar a objetivos.
            </p>
          )}
        </section>

        {/* Allocation Editor */}
        <section
          aria-label="Distribución del Plan"
          className="flex flex-col gap-3"
        >
          <PlanAllocationEditor
            allocation={allocationToDisplay}
            disabled={isPreviewPending || isSubmitting}
            onPercentageChange={handlePercentageChange}
            onPercentageCommit={() => handleCommit()}
          />
        </section>

        {/* Trajectories / Impact comparison */}
        <section
          aria-label="Impacto en objetivos"
          className="flex flex-col gap-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-[var(--sea-ink)]">
              Impacto en las fechas
            </h3>
            {(isPreviewPending || isPreviewOutdated) && (
              <span className="text-xs text-[var(--sea-ink-soft)] animate-pulse">
                {isPreviewPending
                  ? "Actualizando impacto..."
                  : "Proyección pendiente de actualización"}
              </span>
            )}
          </div>

          {!isAllocationsValid ? (
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-muted)]/50 p-4 text-center">
              <p className="text-sm text-[var(--sea-ink-soft)] font-medium">
                Completá la distribución para calcular el impacto
              </p>
            </div>
          ) : preview?.proposal.impacts &&
            preview.proposal.impacts.length > 0 ? (
            <div
              className={`transition-opacity ${
                isPreviewPending ? "opacity-50" : "opacity-100"
              }`}
            >
              <AllocationImpactComparison impacts={preview.proposal.impacts} />
            </div>
          ) : null}
        </section>
      </div>

      {/* Sticky Actions Footer */}
      <div className="sticky bottom-0 border-t border-[var(--line)] bg-popover px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          disabled={
            !isAllocationsValid ||
            isPreviewPending ||
            isSubmitting ||
            !preview ||
            !isPreviewSynced ||
            !hasPositiveBalance
          }
          onClick={handleConfirm}
        >
          {isSubmitting ? "Guardando..." : "Actualizar Plan"}
        </Button>
      </div>
    </div>
  );
}

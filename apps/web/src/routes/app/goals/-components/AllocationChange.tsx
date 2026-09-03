import { useMemo, useState } from "react";
import { usePostHog } from "@posthog/react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import BigNumber from "bignumber.js";
import { formatMoney } from "../../../../lib/format";
import { createMoney } from "../../../../lib/money";
import { Slider } from "../../../../components/ui/slider";
import { PlanAllocationEditor } from "../../../../features/goals/PlanAllocationEditor";
import { getGoalContributionArs } from "../../../../features/financial/monthly-plan";
import {
  calculatePercentageSum,
  allocationEntriesMatch,
  rebalanceAllocationEntries,
  type GoalCreationAllocation,
} from "../../../../features/goals/goal-creation";
import { buildGoalAllocationDisplayEntries } from "../../../../features/goals/goal-proposal-allocation";
import {
  previewAllocationChange,
  confirmAllocationChange,
} from "../../../../features/goals/goals.functions";
import type {
  AllocationChangeContext,
  AllocationChangePreviewResult,
} from "../../../../features/goals/allocation-change";
import { goalErrorMessage, reportGoalError, reportGoalPreviewError } from "./goal-error";
import {
  GoalAllocationBody,
  GoalAllocationFooter,
  GoalAllocationImpactSection,
  applyStaleGoalAllocationPreview,
  type GoalAllocationState,
  useGoalAllocationState,
} from "./GoalAllocationPrimitives";

export interface AllocationChangeProps {
  context: AllocationChangeContext;
  onCancel: () => void;
  onUpdated: () => void;
}

function initialDedicationPercentage(context: AllocationChangeContext) {
  const raw = context.financialSummary?.dedicationPercentage;
  const parsed = Number(raw ? String(raw).replace(",", ".") : 90);
  return Number.isFinite(parsed) ? Math.round(parsed) : 90;
}

function initialAllocationEntries(context: AllocationChangeContext) {
  const source = context.pendingAllocation ?? context.currentAllocation;
  const sourceMap = new Map(source?.entries.map((entry) => [entry.goalId, entry.percentage]));
  return context.activeGoals.map((goal) => ({
    goalId: goal.id,
    percentage: sourceMap.get(goal.id) ?? (context.activeGoals.length === 1 ? "100.00" : "0.00"),
  }));
}

type AllocationChangeEntry = { goalId: string; percentage: string };
type AllocationChangeState = GoalAllocationState<AllocationChangeEntry, AllocationChangePreviewResult> & {
  dedicationPercentage: number;
  setDedicationPercentage: (percentage: number) => void;
};

function useAllocationChangeState(context: AllocationChangeContext): AllocationChangeState {
  const [dedicationPercentage, setDedicationPercentage] = useState(() => initialDedicationPercentage(context));
  const initialEntries = initialAllocationEntries(context);
  const allocationState = useGoalAllocationState<AllocationChangeEntry, AllocationChangePreviewResult>({
    initialEntries,
    loadPreview: calculatePercentageSum(initialEntries).isEqualTo(100)
      ? () => previewAllocationChange({ data: { dedicationPercentage, allocations: initialEntries } })
      : undefined,
    getErrorMessage: (error) => goalErrorMessage(error, "Ocurrió un error al calcular la proyección."),
  });
  return {
    dedicationPercentage,
    setDedicationPercentage,
    ...allocationState,
  };
}

function useAllocationChangeDisplay(
  context: AllocationChangeContext,
  state: AllocationChangeState,
) {
  const financial = useAllocationChangeFinancialDisplay(context, state);
  const allocation = useAllocationChangeAllocationDisplay(context, state, financial.monthlyContribution);
  const impacts = useMemo(() => state.preview?.proposal.impacts ?? context.activeGoals.map((goal) => ({
    goalId: goal.id,
    goalName: goal.name,
    before: { status: "existing" as const, projection: goal.projection, allocatedMonthlyAmounts: [] },
    after: goal.projection,
  })), [context.activeGoals, state.preview?.proposal.impacts]);

  return { ...financial, ...allocation, impacts };
}

function useAllocationChangeFinancialDisplay(
  context: AllocationChangeContext,
  state: AllocationChangeState,
) {
  const hasPositiveBalance = useMemo(
    () => new BigNumber(context.financialSummary?.balance?.amount ?? "0").isGreaterThan(0),
    [context.financialSummary?.balance?.amount],
  );
  const monthlyContribution = useMemo(
    () => getGoalContributionArs(context.financialSummary?.balance ?? createMoney("0", "ARS"), state.dedicationPercentage),
    [context.financialSummary?.balance, state.dedicationPercentage],
  );
  return { hasPositiveBalance, monthlyContribution };
}

function useAllocationChangeAllocationDisplay(
  context: AllocationChangeContext,
  state: AllocationChangeState,
  monthlyContribution: ReturnType<typeof getGoalContributionArs>,
) {
  const { displayEntries, total } = useMemo(
    () => buildGoalAllocationDisplayEntries({
      goals: context.activeGoals,
      entries: state.entries,
      monthlyContribution,
    }),
    [context.activeGoals, monthlyContribution, state.entries],
  );
  const isAllocationsValid = displayEntries.length > 0 && total.isEqualTo(100);
  const isPreviewSynced = state.preview !== null && state.preview.proposal.dedicationPercentage === state.dedicationPercentage && allocationEntriesMatch(state.entries, state.preview.proposal.allocation.entries);
  return {
    displayEntries,
    total,
    isAllocationsValid,
    isPreviewSynced,
    allocation: {
      monthlyContribution: undefined,
      effectiveMonth: state.preview?.proposal.allocation.effectiveMonth ?? "",
      entries: displayEntries,
      totalPercentage: total.toFixed(2),
    } satisfies GoalCreationAllocation,
  };
}

function useAllocationChangePercentageChange(state: AllocationChangeState) {
  return (goalId: string, nextPercentage: string) => {
    state.setEntries(rebalanceAllocationEntries(state.entries, goalId, nextPercentage));
  };
}

function useAllocationChangeCommit(state: AllocationChangeState) {
  return async (
    overrideEntries?: Array<{ goalId: string; percentage: string }>,
    overrideDedication?: number,
  ) => {
    const entries = overrideEntries ?? state.entries;
    const dedicationPercentage = overrideDedication ?? state.dedicationPercentage;
    if (!calculatePercentageSum(entries).isEqualTo(100)) return;
    state.setIsPreviewPending(true);
    state.setServerError(null);
    try {
      state.setPreview(await previewAllocationChange({ data: { dedicationPercentage, allocations: entries } }));
    } catch (error) {
      reportGoalPreviewError(error, "Ocurrió un error al actualizar el impacto.", state.setPreview, state.setServerError, state.serverErrorRef);
    } finally {
      state.setIsPreviewPending(false);
    }
  };
}

function trackAllocationChange(
  context: AllocationChangeContext,
  entries: AllocationChangeState["entries"],
  dedicationPercentage: number,
  posthog: ReturnType<typeof usePostHog>,
) {
  const initialDedication = Math.round(Number(String(context.financialSummary?.dedicationPercentage ?? 90).replace(",", ".")));
  const original = context.pendingAllocation ?? context.currentAllocation;
  const allocationsChanged = entries.length !== (original?.entries.length ?? 0) || entries.some((entry) => {
    const previous = original?.entries.find((candidate) => candidate.goalId === entry.goalId);
    return !previous || !new BigNumber(entry.percentage).isEqualTo(previous.percentage);
  });
  if (allocationsChanged) posthog?.capture("goal_allocations_updated");
  if (dedicationPercentage !== initialDedication) posthog?.capture("goal_monthly_balance_percentage_updated");
}

function useAllocationChangeConfirm(
  context: AllocationChangeContext,
  state: AllocationChangeState,
  display: ReturnType<typeof useAllocationChangeDisplay>,
  onUpdated: () => void,
) {
  const router = useRouter();
  const posthog = usePostHog();
  return async () => {
    if (!state.preview || !display.isPreviewSynced || !display.isAllocationsValid || !display.hasPositiveBalance) return;
    state.setIsSubmitting(true);
    state.setServerError(null);
    try {
      const result = await confirmAllocationChange({
        data: { draft: { dedicationPercentage: state.dedicationPercentage, allocations: state.entries }, previewToken: state.preview.previewToken },
      });
      if (result.status === "stale") {
        state.setDedicationPercentage(result.preview.proposal.dedicationPercentage);
        applyStaleGoalAllocationPreview(state, result.preview);
        return;
      }
      trackAllocationChange(context, state.entries, state.dedicationPercentage, posthog);
      await router.invalidate();
      toast.success("Plan actualizado.");
      onUpdated();
    } catch (error) {
      reportGoalError(error, "Ocurrió un error al guardar.", state.setServerError, state.serverErrorRef);
    } finally {
      state.setIsSubmitting(false);
    }
  };
}

function AllocationChangeDedicationSection({
  state,
  display,
  onCommit,
}: {
  state: AllocationChangeState;
  display: ReturnType<typeof useAllocationChangeDisplay>;
  onCommit: (entries?: AllocationChangeState["entries"], dedication?: number) => void;
}) {
  return (
    <section aria-labelledby="dedication-heading" className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 id="dedication-heading" className="text-base font-semibold text-[var(--sea-ink)]">Aporte mensual a objetivos</h3>
          <p className="text-sm text-[var(--sea-ink-soft)]">Elegí qué porcentaje de tu saldo mensual querés destinar a tus objetivos.</p>
        </div>
        <strong className="tabular-nums text-[var(--sea-ink)]">{state.dedicationPercentage}%</strong>
      </div>
      <Slider
        aria-label="Porcentaje del saldo para objetivos"
        min={0}
        max={100}
        step={1}
        value={[state.dedicationPercentage]}
        onValueChange={(value) => {
          const number = Array.isArray(value) ? value[0] : (value as number);
          state.setDedicationPercentage(typeof number === "number" ? Math.round(number) : 0);
        }}
        onValueCommitted={(value) => {
          const number = Array.isArray(value) ? value[0] : value;
          onCommit(undefined, typeof number === "number" ? Math.round(number) : state.dedicationPercentage);
        }}
        disabled={state.isPreviewPending || state.isSubmitting || !display.hasPositiveBalance}
      />
      <p className="text-sm text-[var(--sea-ink-soft)]">Aproximadamente <strong>{formatMoney(display.monthlyContribution)}</strong> por mes</p>
      {!display.hasPositiveBalance && <p className="text-sm text-[var(--sea-ink-soft)]">No tenés saldo disponible este mes para asignar a objetivos.</p>}
    </section>
  );
}

function AllocationChangePlanSection({
  state,
  display,
  onPercentageChange,
  onCommit,
}: {
  state: AllocationChangeState;
  display: ReturnType<typeof useAllocationChangeDisplay>;
  onPercentageChange: (goalId: string, percentage: string) => void;
  onCommit: () => void;
}) {
  return (
    <section aria-label="Distribución del Plan" className="flex flex-col gap-3">
      <PlanAllocationEditor
        allocation={display.allocation}
        disabled={state.isPreviewPending || state.isSubmitting}
        onPercentageChange={onPercentageChange}
        onPercentageCommit={onCommit}
      />
    </section>
  );
}

function AllocationChangeBody({
  state,
  display,
  onPercentageChange,
  onCommit,
}: {
  state: AllocationChangeState;
  display: ReturnType<typeof useAllocationChangeDisplay>;
  onPercentageChange: (goalId: string, percentage: string) => void;
  onCommit: (entries?: AllocationChangeState["entries"], dedication?: number) => void;
}) {
  return (
    <GoalAllocationBody serverError={state.serverError} serverErrorRef={state.serverErrorRef}>
      <AllocationChangeDedicationSection state={state} display={display} onCommit={onCommit} />
      <AllocationChangePlanSection state={state} display={display} onPercentageChange={onPercentageChange} onCommit={() => onCommit()} />
      <GoalAllocationImpactSection isPreviewPending={state.isPreviewPending} isPreviewSynced={display.isPreviewSynced} isAllocationsValid={display.isAllocationsValid} impacts={display.impacts} showImpacts />
    </GoalAllocationBody>
  );
}

export function AllocationChange({ context, onCancel, onUpdated }: AllocationChangeProps) {
  const state = useAllocationChangeState(context);
  const display = useAllocationChangeDisplay(context, state);
  const onPercentageChange = useAllocationChangePercentageChange(state);
  const onCommit = useAllocationChangeCommit(state);
  const onConfirm = useAllocationChangeConfirm(context, state, display, onUpdated);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <AllocationChangeBody state={state} display={display} onPercentageChange={onPercentageChange} onCommit={onCommit} />
      <GoalAllocationFooter
        isSubmitting={state.isSubmitting}
        disabled={!display.isAllocationsValid || state.isPreviewPending || state.isSubmitting || !state.preview || !display.isPreviewSynced || !display.hasPositiveBalance}
        onCancel={onCancel}
        onConfirm={onConfirm}
        confirmLabel="Actualizar Plan"
        savingLabel="Guardando..."
      />
    </div>
  );
}

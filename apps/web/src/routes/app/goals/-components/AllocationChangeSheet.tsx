import { useCallback } from "react";
import { useSheetLoader } from "../../../../components/SheetLoadingState";
import { getAllocationChangeContext } from "../../../../features/goals/goals.functions";
import { AllocationChange } from "./AllocationChange";
import { GoalContextSheet } from "./GoalContextSheet";

export interface AllocationChangeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AllocationChangeSheet({
  open,
  onOpenChange,
}: AllocationChangeSheetProps) {
  const load = useCallback(async () => {
    const result = await getAllocationChangeContext();
    if (result.profile === "missing") {
      throw new Error("Completá tu perfil financiero antes de cambiar la planificación.");
    }
    return result.context;
  }, []);
  const { data: context, loading, error } = useSheetLoader({ open, load });

  return (
    <GoalContextSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Planificación de objetivos"
      description="Redistribuí tu aporte mensual y revisá el impacto antes de confirmar."
      loading={loading}
      error={error}
    >
      {context ? (
          context.activeGoals.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
              <p className="text-sm font-medium text-[var(--sea-ink-soft)]">
                No tenés objetivos activos para redistribuir.
              </p>
            </div>
          ) : (
            <AllocationChange
              context={context}
              onCancel={() => onOpenChange(false)}
              onUpdated={() => onOpenChange(false)}
            />
          )
        ) : null}
    </GoalContextSheet>
  );
}

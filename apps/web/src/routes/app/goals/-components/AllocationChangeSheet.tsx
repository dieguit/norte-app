import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../../../../components/ui/sheet";
import { getAllocationChangeContext } from "../../../../features/goals/goals.functions";
import type { AllocationChangeContext } from "../../../../features/goals/allocation-change";
import { AllocationChange } from "./AllocationChange";

export interface AllocationChangeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AllocationChangeSheet({
  open,
  onOpenChange,
}: AllocationChangeSheetProps) {
  const [context, setContext] = useState<AllocationChangeContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError(null);

    getAllocationChangeContext()
      .then((res) => {
        if (!active) return;
        if (res.profile === "missing") {
          setError(
            "Completá tu perfil financiero antes de cambiar la planificación.",
          );
        } else {
          setContext(res.context);
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message ?? "No pudimos cargar los datos.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 p-0 data-[side=right]:w-full data-[side=right]:max-w-none data-[side=right]:sm:w-[450px] data-[side=right]:sm:max-w-[450px]"
      >
        <SheetHeader className="border-b border-[var(--line)] px-6 py-5">
          <SheetTitle className="font-serif text-2xl font-bold text-[var(--sea-ink)]">
            Planificación de objetivos
          </SheetTitle>
          <SheetDescription className="text-sm text-[var(--sea-ink-soft)]">
            Redistribuí tu aporte mensual y revisá el impacto antes de
            confirmar.
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex flex-1 flex-col gap-4 p-6" role="status">
            <div className="h-6 w-32 animate-pulse rounded bg-[var(--surface-strong)]" />
            <div className="h-10 w-full animate-pulse rounded-lg bg-[var(--surface-strong)]" />
            <div className="h-10 w-full animate-pulse rounded-lg bg-[var(--surface-strong)]" />
            <div className="h-24 w-full animate-pulse rounded-xl bg-[var(--surface-strong)]" />
            <p className="sr-only">Cargando...</p>
          </div>
        ) : error ? (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : context ? (
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
      </SheetContent>
    </Sheet>
  );
}

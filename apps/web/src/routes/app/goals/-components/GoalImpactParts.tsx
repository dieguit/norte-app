import { Badge } from '../../../../components/ui/badge'
import { AllocationImpactComparison } from '../../../../features/goals/AllocationImpactComparison'

const INVALID_ALLOCATION_MESSAGE = 'Completá la distribución para calcular el impacto'

export function PausedGoalAllocation({ name, label }: { name: string; label?: string }) {
  return (
    <div
      data-testid="allocation-row"
      className="flex items-center justify-between gap-4 rounded-xl border border-[var(--line)] bg-[var(--foam)]/30 p-4 sm:p-5"
    >
      <div className="flex flex-col items-start gap-0.5">
        <span className="text-sm font-medium text-[var(--sea-ink)]">{name}</span>
        <span className="text-xs font-normal text-[var(--sea-ink-soft)]">
          Sin asignación de aporte mensual
        </span>
      </div>
      <Badge variant="secondary">{label ?? 'Pausado'}</Badge>
    </div>
  )
}

export function GoalImpactComparison({
  impacts,
  isAllocationsValid,
  isPreviewPending,
  isPreviewOutdated,
}: {
  impacts: Parameters<typeof AllocationImpactComparison>[0]['impacts']
  isAllocationsValid: boolean
  isPreviewPending: boolean
  isPreviewOutdated: boolean
}) {
  return (
    <section aria-label="Impacto en objetivos" className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-[var(--sea-ink)]">Impacto en las fechas</h3>
        {(isPreviewPending || isPreviewOutdated) && (
          <span className="animate-pulse text-xs text-[var(--sea-ink-soft)]">
            {isPreviewPending
              ? 'Actualizando impacto...'
              : 'Proyección pendiente de actualización'}
          </span>
        )}
      </div>

      {!isAllocationsValid && (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-muted)]/50 p-4 text-center">
          <p className="text-sm font-medium text-[var(--sea-ink-soft)]">
            {INVALID_ALLOCATION_MESSAGE}
          </p>
        </div>
      )}

      {impacts.length > 0 && (
        <div className={isPreviewPending ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
          <AllocationImpactComparison
            impacts={impacts}
            beforeNotCreatedLabel="Objetivo todavía no creado"
          />
        </div>
      )}
    </section>
  )
}

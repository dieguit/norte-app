import { Target } from 'lucide-react'
import { MapGrid } from '../../../../components/norte/MapGrid'
import { Button } from '../../../../components/ui/button'

const PULSE = 'animate-pulse bg-muted motion-reduce:animate-none'

export function GoalsLoading() {
  return (
    <div className="flex flex-col gap-6 px-5 pt-5">
      <div className="flex items-center justify-between">
        <div aria-hidden="true" className={`h-8 w-36 rounded-md ${PULSE}`} />
        <div aria-hidden="true" className={`h-9 w-24 rounded-md ${PULSE}`} />
      </div>
      <div aria-hidden="true" className="h-44 animate-pulse rounded-lg bg-secondary motion-reduce:animate-none" />
      <p role="status" className="m-0 text-body-sm text-muted-foreground">Cargando objetivos…</p>
      <div className="flex flex-col">
        {[1, 2, 3].map((i) => (
          <div key={i} aria-hidden="true" data-skeleton-row className="flex flex-col gap-2 border-t border-border py-3.5">
            <div className={`h-5 w-2/3 rounded-sm ${PULSE}`} />
            <div className={`h-1 w-full rounded-xs ${PULSE}`} />
            <div className={`h-4 w-1/2 rounded-sm ${PULSE}`} />
          </div>
        ))}
      </div>
    </div>
  )
}

export interface GoalsErrorProps {
  onRetry?: () => void
}

export function GoalsError({ onRetry }: GoalsErrorProps) {
  return (
    <div className="flex flex-col px-5 pt-5">
      <div role="alert" className="flex flex-col items-start gap-3 rounded-md bg-negative-soft p-4">
        <h2 className="m-0 text-heading text-negative">No pudimos cargar tus objetivos</h2>
        <p className="m-0 text-body-sm text-foreground">Ocurrió un error al intentar obtener la información. Por favor, volvé a intentarlo.</p>
        {onRetry && <Button variant="default" onClick={onRetry}>Reintentar</Button>}
      </div>
    </div>
  )
}

export interface GoalsEmptyProps {
  onNewGoal?: () => void
}

export function GoalsEmpty({ onNewGoal }: GoalsEmptyProps) {
  return (
    <div className="relative isolate flex flex-col gap-6 px-5 pt-5">
      <MapGrid className="h-65" />
      <h1 className="m-0 text-display text-foreground">Objetivos</h1>
      <div className="flex flex-col items-center gap-1 border-t border-border py-10 text-center">
        <Target className="mb-2 size-6 text-accent-brand" aria-hidden="true" />
        <h2 className="m-0 text-heading text-foreground">No tenés objetivos registrados</h2>
        <p className="m-0 max-w-sm text-body-sm text-muted-foreground">Acá vas a ver tus objetivos una vez que los crees y comiences a planificar tu patrimonio.</p>
        <Button type="button" id="new-goal-trigger" onClick={onNewGoal} className="mt-4 h-11 rounded-md">Nuevo objetivo</Button>
      </div>
    </div>
  )
}

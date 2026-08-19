import { Link } from '@tanstack/react-router'
import { Button } from '../../../../components/ui/button'

export function GoalsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-12">
      <div>
        <div className="h-9 w-48 animate-pulse motion-reduce:animate-none rounded-lg bg-[var(--surface-strong)]" aria-hidden="true" />
        <div className="mt-2 h-5 w-80 animate-pulse motion-reduce:animate-none rounded-lg bg-[var(--surface-strong)]" aria-hidden="true" />
      </div>
      <p role="status" className="text-sm text-[var(--sea-ink-soft)]">
        Cargando objetivos…
      </p>
      <div className="flex flex-col gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            aria-hidden="true"
            className="h-44 w-full animate-pulse motion-reduce:animate-none rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6"
          />
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
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center gap-4 px-5 py-16 text-center">
      <div
        role="alert"
        className="flex max-w-md flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-6 text-center text-destructive"
      >
        <h2 className="font-serif text-xl font-bold">No pudimos cargar tus objetivos</h2>
        <p className="text-sm text-[var(--sea-ink-soft)]">
          Ocurrió un error al intentar obtener la información. Por favor, volvé a intentarlo.
        </p>
        {onRetry && (
          <Button variant="default" onClick={onRetry} className="mt-2">
            Reintentar
          </Button>
        )}
      </div>
    </div>
  )
}

export function GoalsEmpty() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-12">
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-[var(--sea-ink)] sm:text-4xl">
          Objetivos
        </h1>
        <p className="mt-2 text-base leading-relaxed text-[var(--sea-ink-soft)]">
          Administrá tus metas financieras y su asignación mensual.
        </p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-12 text-center shadow-sm">
        <h2 className="font-serif text-2xl font-bold text-[var(--sea-ink)]">
          No tenés objetivos registrados
        </h2>
        <p className="mt-2 max-w-md text-sm text-[var(--sea-ink-soft)]">
          Acá vas a ver tus objetivos una vez que los crees y comiences a planificar tu patrimonio.
        </p>
      </div>
    </div>
  )
}

export function GoalNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center gap-6 px-5 py-16 text-center">
      <div className="flex max-w-md flex-col items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8 shadow-sm">
        <h2 className="font-serif text-2xl font-bold text-[var(--sea-ink)]">
          Objetivo no encontrado
        </h2>
        <p className="text-sm text-[var(--sea-ink-soft)]">
          El objetivo que buscás no existe o no tenés acceso a él.
        </p>
        <Link
          to="/app/goals"
          className="mt-2 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80"
        >
          Volver a objetivos
        </Link>
      </div>
    </div>
  )
}

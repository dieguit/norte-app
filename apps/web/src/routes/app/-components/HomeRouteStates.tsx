import { Button } from '../../../components/ui/button'

export function HomeLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8">
      <p role="status" className="text-sm text-[var(--sea-ink-soft)]">
        Cargando hoja de ruta...
      </p>
    </div>
  )
}

export function HomeError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8">
      <div
        role="alert"
        className="rounded-2xl border border-destructive/20 bg-destructive/10 p-6 text-center"
      >
        <h1 className="font-serif text-xl font-bold text-[var(--sea-ink)]">
          No pudimos cargar tu hoja de ruta
        </h1>
        <p className="mt-2 text-sm text-[var(--sea-ink-soft)]">
          Volvé a intentarlo para ver tu planificación.
        </p>
        <Button type="button" className="mt-4" onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    </div>
  )
}

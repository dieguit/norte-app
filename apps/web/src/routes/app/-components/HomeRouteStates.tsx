import { Button } from "../../../components/ui/button";

export function HomeLoading() {
  return (
    <div className="w-full px-5 py-12">
      <p role="status" className="text-body-sm text-muted-foreground">
        Cargando hoja de ruta...
      </p>
    </div>
  );
}

export function HomeError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="w-full px-5 py-12">
      <div
        role="alert"
        className="rounded-lg bg-negative-soft p-6 text-center"
      >
        <h1 className="text-title text-foreground">
          No pudimos cargar tu hoja de ruta
        </h1>
        <p className="mt-2 text-body-sm text-muted-foreground">
          Volvé a intentarlo para ver tu planificación.
        </p>
        <Button type="button" className="mt-4" onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    </div>
  );
}

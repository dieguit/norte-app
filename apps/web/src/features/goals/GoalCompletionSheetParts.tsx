export function GoalCompletionLoading() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-6" role="status">
      <div className="h-6 w-40 animate-pulse rounded bg-[var(--surface-strong)]" />
      <div className="h-12 w-full animate-pulse rounded-xl bg-[var(--surface-strong)]" />
      <div className="h-12 w-full animate-pulse rounded-xl bg-[var(--surface-strong)]" />
      <div className="h-28 w-full animate-pulse rounded-xl bg-[var(--surface-strong)]" />
      <p className="sr-only">Cargando...</p>
    </div>
  )
}

export function GoalCompletionError({ message }: { message: string }) {
  return <div className="flex flex-1 items-center justify-center p-6 text-center"><p role="alert" className="text-sm text-destructive">{message}</p></div>
}

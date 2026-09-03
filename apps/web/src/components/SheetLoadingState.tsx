import { useCallback, useEffect, useState } from 'react'

interface SheetLoaderOptions<T> {
  open: boolean
  load: () => Promise<T>
}

export function useSheetLoader<T>({ open, load }: SheetLoaderOptions<T>) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [request, setRequest] = useState(0)
  const retry = useCallback(() => setRequest((current) => current + 1), [])

  useEffect(() => {
    if (!open) return
    let active = true
    setData(null)
    setLoading(true)
    setError(null)
    load()
      .then((result) => active && setData(result))
      .catch((reason: unknown) => {
        if (!active) return
        setError(reason instanceof Error ? reason.message : 'No pudimos cargar los datos.')
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [load, open, request])

  return { data, loading, error, retry }
}

export function SheetLoadingState() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-6" role="status">
      <div className="h-6 w-32 animate-pulse rounded bg-[var(--surface-strong)]" />
      <div className="h-10 w-full animate-pulse rounded-lg bg-[var(--surface-strong)]" />
      <div className="h-10 w-full animate-pulse rounded-lg bg-[var(--surface-strong)]" />
      <div className="h-24 w-full animate-pulse rounded-xl bg-[var(--surface-strong)]" />
      <p className="sr-only">Cargando...</p>
    </div>
  )
}

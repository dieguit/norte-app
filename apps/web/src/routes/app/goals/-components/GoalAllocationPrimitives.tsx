import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Button } from '../../../../components/ui/button'
import { AllocationImpactComparison } from '../../../../features/goals/AllocationImpactComparison'
import type { AllocationImpactItem } from '../../../../features/goals/AllocationImpactComparison'

export type GoalAllocationState<TEntry, TPreview> = {
  entries: TEntry[]
  setEntries: (entries: TEntry[]) => void
  preview: TPreview | null
  setPreview: (preview: TPreview | null) => void
  isPreviewPending: boolean
  setIsPreviewPending: (pending: boolean) => void
  isSubmitting: boolean
  setIsSubmitting: (submitting: boolean) => void
  serverError: string | null
  setServerError: (error: string | null) => void
  serverErrorRef: RefObject<HTMLDivElement | null>
}

export function useGoalAllocationState<TEntry, TPreview>({
  initialEntries,
  loadPreview,
  getErrorMessage,
}: {
  initialEntries: TEntry[]
  loadPreview?: () => Promise<TPreview>
  getErrorMessage: (error: unknown) => string
}): GoalAllocationState<TEntry, TPreview> {
  const serverErrorRef = useRef<HTMLDivElement>(null)
  const [entries, setEntries] = useState(initialEntries)
  const [preview, setPreview] = useState<TPreview | null>(null)
  const [isPreviewPending, setIsPreviewPending] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  useEffect(() => {
    if (serverError) serverErrorRef.current?.focus()
  }, [serverError])

  useEffect(() => {
    if (!loadPreview) return
    let active = true
    setIsPreviewPending(true)
    loadPreview()
      .then((result) => active && setPreview(result))
      .catch((error) => active && setServerError(getErrorMessage(error)))
      .finally(() => active && setIsPreviewPending(false))
    return () => {
      active = false
    }
  }, [])

  return {
    entries,
    setEntries,
    preview,
    setPreview,
    isPreviewPending,
    setIsPreviewPending,
    isSubmitting,
    setIsSubmitting,
    serverError,
    setServerError,
    serverErrorRef,
  }
}

export function GoalAllocationBody({
  serverError,
  serverErrorRef,
  children,
}: {
  serverError: string | null
  serverErrorRef: RefObject<HTMLDivElement | null>
  children: ReactNode
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
        <h3 className="text-base font-semibold text-[var(--sea-ink)]">Distribución e impacto</h3>
      </div>
      {serverError && (
        <div ref={serverErrorRef} tabIndex={-1} role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive outline-none focus:ring-2 focus:ring-destructive">
          {serverError}
        </div>
      )}
      {children}
    </div>
  )
}

export function GoalAllocationImpactSection({
  isPreviewPending,
  isPreviewSynced,
  isAllocationsValid,
  impacts,
  showImpacts,
}: {
  isPreviewPending: boolean
  isPreviewSynced: boolean
  isAllocationsValid: boolean
  impacts: AllocationImpactItem[]
  showImpacts: boolean
}) {
  const outdated = !isPreviewSynced
  return (
    <section aria-label="Impacto en objetivos" className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-[var(--sea-ink)]">Impacto en las fechas</h3>
        {(isPreviewPending || outdated) && (
          <span className="text-xs text-[var(--sea-ink-soft)] animate-pulse">
            {isPreviewPending ? 'Actualizando impacto...' : 'Proyección pendiente de actualización'}
          </span>
        )}
      </div>
      {!isAllocationsValid && (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-muted)]/50 p-4 text-center">
          <p className="text-sm text-[var(--sea-ink-soft)] font-medium">Completá la distribución para calcular el impacto</p>
        </div>
      )}
      {showImpacts && impacts.length > 0 && (
        <div className={isPreviewPending ? 'opacity-50' : 'opacity-100'}>
          <AllocationImpactComparison impacts={impacts} />
        </div>
      )}
    </section>
  )
}

export function GoalAllocationFooter({
  isSubmitting,
  disabled,
  onCancel,
  onConfirm,
  confirmLabel,
  savingLabel,
}: {
  isSubmitting: boolean
  disabled: boolean
  onCancel: () => void
  onConfirm: () => void
  confirmLabel: string
  savingLabel: string
}) {
  return (
    <div className="sticky bottom-0 border-t border-[var(--line)] bg-popover px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex items-center justify-between">
      <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancelar</Button>
      <Button type="button" disabled={disabled} onClick={onConfirm}>
        {isSubmitting ? savingLabel : confirmLabel}
      </Button>
    </div>
  )
}

export function applyStaleGoalAllocationPreview<TPreview extends {
  proposal: { allocation: { entries: Array<{ goalId: string; percentage: string }> } }
}>(
  state: Pick<GoalAllocationState<{ goalId: string; percentage: string }, TPreview>, 'setEntries' | 'setPreview' | 'setServerError' | 'serverErrorRef'>,
  preview: TPreview,
) {
  state.setEntries(preview.proposal.allocation.entries.map(({ goalId, percentage }) => ({ goalId, percentage })))
  state.setPreview(preview)
  state.setServerError('Tu Plan cambió. Revisá la distribución actualizada antes de confirmar.')
  setTimeout(() => state.serverErrorRef.current?.focus(), 0)
}

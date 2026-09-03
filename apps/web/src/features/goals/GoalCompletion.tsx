import { useEffect, useRef, useState } from 'react'
import { usePostHog } from '@posthog/react'
import { useRouter } from '@tanstack/react-router'
import BigNumber from 'bignumber.js'
import { toast } from 'sonner'
import { Button } from '../../components/ui/button'
import { Field, FieldError, FieldLabel } from '../../components/ui/field'
import { Input } from '../../components/ui/input'
import { PlanAllocationEditor } from './PlanAllocationEditor'
import {
  calculatePercentageSum,
  rebalanceAllocationEntries,
  recalculateAllocationAmounts,
  type GoalCreationAllocation,
  type GoalCreationAllocationEntry,
} from './goal-creation'
import {
  confirmGoalCompletion,
  previewGoalCompletion,
} from './goals.functions'
import type {
  GoalCompletionContext,
  GoalCompletionPreviewResult,
} from './goal-completion'
import { formatMoney } from '../../lib/format'
import { formatMoneyInput, parseMoneyInput } from '../../lib/money'
import { AllocationImpactComparison } from './AllocationImpactComparison'

export interface GoalCompletionProps {
  context: GoalCompletionContext
  onCancel: () => void
  onUpdated: () => void
  onContextInvalid?: () => Promise<void> | void
}

function parseAmount(value: string): BigNumber | null {
  if (!value.trim()) return null
  const money = parseMoneyInput(value, 'ARS')
  return money ? new BigNumber(money.amount) : null
}

function canonical(value: string): string {
  const amount = parseAmount(value)
  return amount ? amount.toFixed(2) : value
}

function initialAllocationEntries(context: GoalCompletionContext) {
  const source = context.pendingAllocation ?? context.currentAllocation
  const sourceMap = new Map(source?.entries.map((entry) => [entry.goalId, entry.percentage]))
  const remaining = context.activeGoals.filter((goal) => goal.id !== context.goalId)

  if (remaining.length === 0) return []

  return rebalanceAllocationEntries(
    context.activeGoals.map((goal) => ({
      goalId: goal.id,
      percentage: sourceMap.get(goal.id) ?? '0.00',
    })),
    context.goalId,
    '0.00',
  )
}

type GoalCompletionState = ReturnType<typeof useGoalCompletionState>

function errorMessage(error: unknown, fallback: string) {
  return (error as { message?: string } | null)?.message ?? fallback
}

function inspectWithdrawal(
  place: GoalCompletionContext['savingsPlaces'][number],
  value: string,
) {
  if (!value.trim()) return { amount: null }
  const amount = parseAmount(value)
  if (!amount || amount.isLessThanOrEqualTo(0)) {
    return { amount: null, error: 'Ingresá un monto mayor a cero, con hasta dos decimales.' }
  }
  if (amount.isGreaterThan(place.balance.amount)) {
    return { amount: null, error: `El monto supera el saldo disponible en ${place.name}.` }
  }
  return { amount }
}

function getAvailableShortfall(context: GoalCompletionContext) {
  const availableTotal = context.savingsPlaces
    .filter((place) => place.balance.currency === context.targetAmount.currency)
    .reduce((total, place) => total.plus(place.balance.amount), new BigNumber(0))
  return availableTotal.isLessThan(context.targetAmount.amount)
    ? new BigNumber(context.targetAmount.amount).minus(availableTotal)
    : null
}

function getWithdrawalDraft(context: GoalCompletionContext, withdrawals: Record<string, string>) {
  return context.savingsPlaces
    .filter((place) => (withdrawals[place.id] ?? '').trim() !== '')
    .map((place) => ({ placeId: place.id, amount: canonical(withdrawals[place.id]) }))
}

function getWithdrawalView(context: GoalCompletionContext, withdrawals: Record<string, string>) {
  const errors: Record<string, string> = {}
  let selectedTotal = new BigNumber(0)
  let validCount = 0
  for (const place of context.savingsPlaces) {
    const inspection = inspectWithdrawal(place, withdrawals[place.id] ?? '')
    if (inspection.error) errors[place.id] = inspection.error
    if (!inspection.amount) continue
    const amount = inspection.amount
    selectedTotal = selectedTotal.plus(amount)
    validCount += 1
  }
  const hasErrors = Object.keys(errors).length > 0
  const withdrawalsValid = validCount > 0 && !hasErrors && selectedTotal.isEqualTo(context.targetAmount.amount)
  const totalError = !hasErrors && !selectedTotal.isEqualTo(context.targetAmount.amount) ? 'Los montos deben sumar exactamente el objetivo.' : null
  return { errors, selectedTotal, withdrawalsValid, totalError, availableShortfall: getAvailableShortfall(context), withdrawalDraft: getWithdrawalDraft(context, withdrawals) }
}

function getAllocationView(context: GoalCompletionContext, allocations: GoalCompletionState['allocations'], preview: GoalCompletionPreviewResult | null) {
  const remainingGoals = context.activeGoals.filter((goal) => goal.id !== context.goalId)
  const entries: GoalCreationAllocationEntry[] = allocations
    .filter((entry) => entry.goalId !== context.goalId)
    .map((entry) => ({
      goalId: entry.goalId,
      goalName: remainingGoals.find((goal) => goal.id === entry.goalId)?.name ?? 'Objetivo',
      percentage: entry.percentage,
      pending: false,
    }))
  const total = calculatePercentageSum(entries)
  const ids = new Set(entries.map((entry) => entry.goalId))
  const allocationsValid = remainingGoals.length === 0 || (
    ids.size === remainingGoals.length && remainingGoals.every((goal) => ids.has(goal.id)) && total.isEqualTo(100)
  )
  const amounts = recalculateAllocationAmounts({
    monthlyContribution: context.plannedMonthlyContribution,
    entries: entries.map((entry) => ({
      goalId: entry.goalId,
      percentage: entry.percentage,
      currency: remainingGoals.find((goal) => goal.id === entry.goalId)?.currency ?? 'ARS',
    })),
  })
  const displayedEntries = entries.map((entry) => ({ ...entry, ...amounts.get(entry.goalId) }))
  return {
    remainingGoals,
    allocationsValid,
    allocation: {
      monthlyContribution: context.plannedMonthlyContribution,
      effectiveMonth: preview?.proposal.allocation.effectiveMonth ?? '',
      entries: displayedEntries,
      totalPercentage: total.toFixed(2),
    } satisfies GoalCreationAllocation,
    allocationDraft: allocations,
  }
}

function previewMatchesDraft(
  candidate: GoalCompletionPreviewResult | null,
  view: {
    context: GoalCompletionContext
    withdrawalsValid: boolean
    allocationsValid: boolean
    withdrawalDraft: Array<{ placeId: string; amount: string }>
    allocationDraft: GoalCompletionState['allocations']
  },
) {
  if (!candidate || !view.withdrawalsValid || !view.allocationsValid) return false
  const previewWithdrawals = new Map(candidate.proposal.withdrawals.map((item) => [item.placeId, item.amount.amount]))
  const withdrawalsMatch = view.withdrawalDraft.length === previewWithdrawals.size && view.withdrawalDraft.every(
    (item) => canonical(item.amount) === canonical(previewWithdrawals.get(item.placeId) ?? ''),
  )
  const draftAllocations = view.allocationDraft.filter((entry) => entry.goalId !== view.context.goalId)
  const proposedAllocations = candidate.proposal.allocation.entries.filter((entry) => entry.goalId !== view.context.goalId)
  const allocationsMatch = draftAllocations.length === proposedAllocations.length && draftAllocations.every((entry) => {
    const proposed = proposedAllocations.find((item) => item.goalId === entry.goalId)
    return proposed !== undefined && canonical(entry.percentage) === canonical(proposed.percentage)
  })
  return withdrawalsMatch && allocationsMatch
}

function useGoalCompletionState(context: GoalCompletionContext) {
  const serverErrorRef = useRef<HTMLDivElement>(null)
  const suppressNextPreviewRef = useRef(false)
  const [withdrawals, setWithdrawals] = useState<Record<string, string>>(() => Object.fromEntries(context.savingsPlaces.map((place) => [place.id, ''])))
  const [allocations, setAllocations] = useState(() => initialAllocationEntries(context))
  const [preview, setPreview] = useState<GoalCompletionPreviewResult | null>(null)
  const [isPreviewPending, setIsPreviewPending] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPreviewRevalidationRequired, setIsPreviewRevalidationRequired] = useState(false)
  const contextKey = JSON.stringify(context)
  const contextRef = useRef(contextKey)
  const contextChanged = contextRef.current !== contextKey

  useEffect(() => {
    const hasChanged = contextRef.current !== contextKey
    contextRef.current = contextKey
    if (hasChanged) {
      suppressNextPreviewRef.current = true
      setPreview(null)
      setIsPreviewRevalidationRequired(true)
      setServerError((current) => current ?? 'Los datos del objetivo cambiaron. Revisá los datos actualizados antes de confirmar.')
    }
    setAllocations((current) => {
      const currentMap = new Map(current.map((entry) => [entry.goalId, entry.percentage]))
      const seeded = initialAllocationEntries(context)
      return context.activeGoals.map((goal) => ({
        goalId: goal.id,
        percentage: goal.id === context.goalId ? '0.00' : currentMap.get(goal.id) ?? seeded.find((entry) => entry.goalId === goal.id)?.percentage ?? '0.00',
      }))
    })
  }, [context, contextKey])
  useEffect(() => {
    if (serverError) serverErrorRef.current?.focus()
  }, [serverError])
  return {
    withdrawals,
    setWithdrawals,
    allocations,
    setAllocations,
    preview,
    setPreview,
    isPreviewPending,
    setIsPreviewPending,
    isSubmitting,
    setIsSubmitting,
    serverError,
    setServerError,
    isPreviewRevalidationRequired,
    setIsPreviewRevalidationRequired,
    contextChanged,
    suppressNextPreviewRef,
    serverErrorRef,
  }
}

function useGoalCompletionView(context: GoalCompletionContext, state: GoalCompletionState) {
  const withdrawals = getWithdrawalView(context, state.withdrawals)
  const allocation = getAllocationView(context, state.allocations, state.preview)
  return {
    context,
    ...withdrawals,
    ...allocation,
    isPreviewSynced: !state.contextChanged && !state.isPreviewRevalidationRequired && previewMatchesDraft(state.preview, { context, ...withdrawals, ...allocation }),
  }
}

function useGoalCompletionPreview(
  context: GoalCompletionContext,
  state: GoalCompletionState,
  view: ReturnType<typeof useGoalCompletionView>,
) {
  useEffect(() => {
    if (!view.withdrawalsValid || !view.allocationsValid || state.isPreviewRevalidationRequired) return
    if (state.suppressNextPreviewRef.current) {
      state.suppressNextPreviewRef.current = false
      return
    }
    let active = true
    state.setIsPreviewPending(true)
    previewGoalCompletion({ data: { goalId: context.goalId, withdrawals: view.withdrawalDraft, allocations: view.allocationDraft } })
      .then((result) => active && state.setPreview(result))
      .catch((error) => {
        if (!active) return
        state.setPreview(null)
        state.setServerError(errorMessage(error, 'Ocurrió un error al actualizar el impacto.'))
      })
      .finally(() => active && state.setIsPreviewPending(false))
    return () => {
      active = false
    }
  }, [context, state.allocations, state.withdrawals, view.allocationsValid, view.withdrawalsValid])
}

function useGoalCompletionInputActions(state: GoalCompletionState) {
  const handleWithdrawalChange = (placeId: string, value: string) => {
    if (state.isSubmitting) return
    state.setWithdrawals((current) => ({ ...current, [placeId]: formatMoneyInput(value) }))
    state.setPreview(null)
    if (!state.isPreviewRevalidationRequired) state.setServerError(null)
  }
  const handlePercentageChange = (goalId: string, percentage: string) => {
    if (state.isSubmitting) return
    state.setAllocations((current) => rebalanceAllocationEntries(current, goalId, percentage))
    state.setPreview(null)
    if (!state.isPreviewRevalidationRequired) state.setServerError(null)
  }
  return { handleWithdrawalChange, handlePercentageChange }
}

function useGoalCompletionReviewAction(
  context: GoalCompletionContext,
  state: GoalCompletionState,
  view: ReturnType<typeof useGoalCompletionView>,
) {
  return async () => {
    if (!state.isPreviewRevalidationRequired || state.isPreviewPending || state.isSubmitting) return
    state.setIsPreviewPending(true)
    try {
      const result = await previewGoalCompletion({ data: { goalId: context.goalId, withdrawals: view.withdrawalDraft, allocations: view.allocationDraft } })
      state.setPreview(result)
      if (previewMatchesDraft(result, view)) {
        state.setIsPreviewRevalidationRequired(false)
        state.setServerError(null)
      }
    } catch (error) {
      state.setPreview(null)
      state.setIsPreviewRevalidationRequired(true)
      state.setServerError(errorMessage(error, 'Ocurrió un error al actualizar el impacto.'))
    } finally {
      state.setIsPreviewPending(false)
    }
  }
}

async function handleStaleCompletion(
  result: { status: 'stale'; preview: GoalCompletionPreviewResult },
  state: GoalCompletionState,
  onContextInvalid?: () => Promise<void> | void,
) {
  state.suppressNextPreviewRef.current = true
  state.setIsPreviewRevalidationRequired(true)
  state.setPreview(result.preview)
  state.setWithdrawals(Object.fromEntries(result.preview.proposal.withdrawals.map((item) => [item.placeId, formatMoneyInput(item.amount.amount.replace('.', ','))])))
  state.setAllocations(result.preview.proposal.allocation.entries.map(({ goalId, percentage }) => ({ goalId, percentage })))
  state.setServerError('Tus saldos o tu Plan cambiaron. Revisá los retiros y la distribución actualizados antes de confirmar.')
  await onContextInvalid?.()
  state.serverErrorRef.current?.focus()
}

async function handleInvalidCompletion(
  result: { status: 'invalid'; message: string },
  state: GoalCompletionState,
  onContextInvalid?: () => Promise<void> | void,
) {
  state.setIsPreviewRevalidationRequired(true)
  state.setPreview(null)
  state.setServerError(result.message)
  await onContextInvalid?.()
  state.serverErrorRef.current?.focus()
}

function useGoalCompletionConfirmAction(
  context: GoalCompletionContext,
  state: GoalCompletionState,
  view: ReturnType<typeof useGoalCompletionView>,
  onUpdated: () => void,
  onContextInvalid?: () => Promise<void> | void,
) {
  const router = useRouter()
  const posthog = usePostHog()
  return async () => {
    if (!state.preview || !view.isPreviewSynced || !view.withdrawalsValid || !view.allocationsValid) return
    state.setIsSubmitting(true)
    state.setServerError(null)
    try {
      const result = await confirmGoalCompletion({
        data: { goalId: context.goalId, withdrawals: view.withdrawalDraft, allocations: view.allocationDraft, previewToken: state.preview.previewToken },
      })
      if (result.status === 'stale') {
        await handleStaleCompletion(result, state, onContextInvalid)
        return
      }
      if (result.status === 'invalid') {
        await handleInvalidCompletion(result, state, onContextInvalid)
        return
      }
      posthog?.capture('goal_completed')
      await router.invalidate()
      toast.success('Objetivo completado.')
      onUpdated()
    } catch (error) {
      state.setServerError(errorMessage(error, 'Ocurrió un error al guardar.'))
    } finally {
      state.setIsSubmitting(false)
    }
  }
}

function CompletionError({ state, onReview }: { state: GoalCompletionState; onReview: () => void }) {
  if (!state.serverError) return null
  return (
    <div ref={state.serverErrorRef} tabIndex={-1} role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive outline-none focus:ring-2 focus:ring-destructive">
      {state.serverError}
      {state.isPreviewRevalidationRequired && <Button type="button" variant="outline" className="mt-3 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={onReview} disabled={state.isPreviewPending || state.isSubmitting}>Revisar datos actualizados</Button>}
    </div>
  )
}

function CompletionWithdrawalField({
  place,
  value,
  error,
  disabled,
  onChange,
}: {
  place: GoalCompletionContext['savingsPlaces'][number]
  value: string
  error?: string
  disabled: boolean
  onChange: (value: string) => void
}) {
  const errorId = `completion-${place.id}-error`
  return (
    <Field data-invalid={Boolean(error)}>
      <div className="grid grid-cols-2 items-start gap-4">
        <FieldLabel htmlFor={`completion-${place.id}`} className="flex w-full min-w-0 flex-col items-start gap-1">
          <span className="text-sm font-medium text-[var(--sea-ink)]">{place.name}</span>
          <span className="text-xs font-normal text-[var(--sea-ink-soft)]">Disponible: {formatMoney(place.balance)}</span>
        </FieldLabel>
        <Input id={`completion-${place.id}`} aria-label={`Monto a retirar de ${place.name}`} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} inputMode="decimal" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="min-w-0 text-right font-mono text-sm" />
      </div>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </Field>
  )
}

function CompletionWithdrawalsSection({ context, state, view, onChange }: { context: GoalCompletionContext; state: GoalCompletionState; view: ReturnType<typeof useGoalCompletionView>; onChange: (placeId: string, value: string) => void }) {
  return (
    <section aria-labelledby="completion-sources-title" className="flex flex-col gap-4">
      <div>
        <h2 id="completion-sources-title" className="text-base font-semibold text-[var(--sea-ink)]">¿De dónde sale el dinero?</h2>
        <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">Elegí de qué lugares de ahorro sale el monto exacto de {formatMoney(context.targetAmount)}.</p>
      </div>
      {view.availableShortfall && <p role="alert" className="rounded-xl border border-[var(--line)] bg-[var(--foam)]/60 p-4 text-sm text-[var(--sea-ink-soft)]">El saldo disponible entre tus lugares de ahorro no alcanza para este objetivo. Faltan {formatMoney({ amount: view.availableShortfall.toFixed(2), currency: context.targetAmount.currency })}.</p>}
      <div className="flex flex-col gap-4">
        {context.savingsPlaces.map((place) => <CompletionWithdrawalField key={place.id} place={place} value={state.withdrawals[place.id] ?? ''} error={view.errors[place.id]} disabled={state.isSubmitting} onChange={(value) => onChange(place.id, value)} />)}
      </div>
      <div className="rounded-xl border border-[var(--line)] bg-[var(--foam)]/40 p-4">
        <p role="status" aria-live="polite" className="text-sm font-semibold text-[var(--sea-ink)]">Seleccionado: {formatMoney({ amount: view.selectedTotal.toFixed(2), currency: context.targetAmount.currency })} de {formatMoney(context.targetAmount)}</p>
        {view.totalError && <p className="mt-1 text-sm text-destructive" role="alert">{view.totalError}</p>}
      </div>
    </section>
  )
}

function CompletionPlanSection({ state, view, onChange }: { state: GoalCompletionState; view: ReturnType<typeof useGoalCompletionView>; onChange: (goalId: string, percentage: string) => void }) {
  return (
    <section aria-labelledby="completion-plan-title" className="flex flex-col gap-3">
      <div>
        <h2 id="completion-plan-title" className="text-base font-semibold text-[var(--sea-ink)]">Redistribuí tu Plan</h2>
        <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">Al completar este objetivo, su aporte mensual queda disponible para tus otros objetivos.</p>
      </div>
      {view.remainingGoals.length === 0 ? <p className="rounded-xl border border-[var(--line)] bg-[var(--foam)]/40 p-4 text-sm text-[var(--sea-ink-soft)]">No quedan objetivos activos: el Plan mensual se va a pausar.</p> : <PlanAllocationEditor allocation={view.allocation} disabled={Boolean(view.availableShortfall) || !view.withdrawalsValid || state.isPreviewPending || state.isSubmitting} onPercentageChange={onChange} onPercentageCommit={() => undefined} />}
    </section>
  )
}

function CompletionImpactSection({ state, view }: { state: GoalCompletionState; view: ReturnType<typeof useGoalCompletionView> }) {
  const showPending = view.withdrawalsValid && view.allocationsValid && !view.isPreviewSynced
  return (
    <section aria-labelledby="completion-impact-title" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="completion-impact-title" className="text-base font-semibold text-[var(--sea-ink)]">Impacto en las fechas</h2>
        {(state.isPreviewPending || showPending) && <span className="text-right text-xs text-[var(--sea-ink-soft)]" role="status">{state.isPreviewPending ? 'Actualizando impacto...' : 'Proyección pendiente de actualización'}</span>}
      </div>
      {!view.withdrawalsValid ? <p className="rounded-xl border border-[var(--line)] bg-[var(--foam)]/40 p-4 text-center text-sm text-[var(--sea-ink-soft)]">Completá los retiros para calcular el impacto.</p> : state.preview?.proposal.impacts.length ? <div className={state.isPreviewPending ? 'opacity-50' : undefined}><AllocationImpactComparison impacts={state.preview.proposal.impacts} /></div> : null}
    </section>
  )
}

function CompletionFooter({ state, view, onCancel, onConfirm }: { state: GoalCompletionState; view: ReturnType<typeof useGoalCompletionView>; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="sticky bottom-0 flex flex-col items-stretch gap-3 border-t border-[var(--line)] bg-popover px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between">
      <Button type="button" variant="outline" onClick={onCancel} disabled={state.isSubmitting} className="w-full sm:w-auto">Cancelar</Button>
      <Button type="button" disabled={Boolean(view.availableShortfall) || !view.withdrawalsValid || !view.allocationsValid || !state.preview || !view.isPreviewSynced || state.isPreviewPending || state.isSubmitting} onClick={onConfirm} className="w-full sm:w-auto">{state.isSubmitting ? 'Completando...' : 'Confirmar, marcar como completado'}</Button>
    </div>
  )
}

export function GoalCompletion({ context, onCancel, onUpdated, onContextInvalid }: GoalCompletionProps) {
  const state = useGoalCompletionState(context)
  const view = useGoalCompletionView(context, state)
  useGoalCompletionPreview(context, state, view)
  const inputActions = useGoalCompletionInputActions(state)
  const onReview = useGoalCompletionReviewAction(context, state, view)
  const onConfirm = useGoalCompletionConfirmAction(context, state, view, onUpdated, onContextInvalid)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <div className="flex flex-col gap-6">
          <p className="text-sm leading-relaxed text-[var(--sea-ink-soft)]">Completar {context.goalName} significa usar los ahorros acumulados para alcanzar el objetivo; las deducciones quedan registradas y reducen esos lugares de ahorro.</p>
          <CompletionError state={state} onReview={onReview} />
          <CompletionWithdrawalsSection context={context} state={state} view={view} onChange={inputActions.handleWithdrawalChange} />
          <CompletionPlanSection state={state} view={view} onChange={inputActions.handlePercentageChange} />
          <CompletionImpactSection state={state} view={view} />
        </div>
      </div>
      <CompletionFooter state={state} view={view} onCancel={onCancel} onConfirm={onConfirm} />
    </div>
  )
}

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

export function GoalCompletion({
  context,
  onCancel,
  onUpdated,
  onContextInvalid,
}: GoalCompletionProps) {
  const router = useRouter()
  const posthog = usePostHog()
  const serverErrorRef = useRef<HTMLDivElement>(null)
  const suppressNextPreviewRef = useRef(false)
  const [withdrawals, setWithdrawals] = useState<Record<string, string>>(() =>
    Object.fromEntries(context.savingsPlaces.map((place) => [place.id, ''])),
  )
  const [allocations, setAllocations] = useState(() => initialAllocationEntries(context))
  const [preview, setPreview] = useState<GoalCompletionPreviewResult | null>(null)
  const [isPreviewPending, setIsPreviewPending] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPreviewRevalidationRequired, setIsPreviewRevalidationRequired] = useState(false)
  const contextKey = JSON.stringify(context)
  const contextRef = useRef(contextKey)
  const contextChanged = contextRef.current !== contextKey
  const previewStaleMessage = 'Los datos del objetivo cambiaron. Revisá los datos actualizados antes de confirmar.'

  const withdrawalErrors: Record<string, string> = {}
  let selectedTotal = new BigNumber(0)
  let validWithdrawalCount = 0

  for (const place of context.savingsPlaces) {
    const value = withdrawals[place.id] ?? ''
    if (!value.trim()) continue
    const amount = parseAmount(value)
    if (!amount || amount.isLessThanOrEqualTo(0)) {
      withdrawalErrors[place.id] = 'Ingresá un monto mayor a cero, con hasta dos decimales.'
      continue
    }
    if (amount.isGreaterThan(place.balance.amount)) {
      withdrawalErrors[place.id] = `El monto supera el saldo disponible en ${place.name}.`
      continue
    }
    selectedTotal = selectedTotal.plus(amount)
    validWithdrawalCount += 1
  }

  const withdrawalsValid =
    validWithdrawalCount > 0 &&
    Object.keys(withdrawalErrors).length === 0 &&
    selectedTotal.isEqualTo(context.targetAmount.amount)
  const totalError =
    Object.keys(withdrawalErrors).length === 0 &&
    !selectedTotal.isEqualTo(context.targetAmount.amount)
      ? 'Los montos deben sumar exactamente el objetivo.'
      : null
  const availableTotal = context.savingsPlaces
    .filter((place) => place.balance.currency === context.targetAmount.currency)
    .reduce((total, place) => total.plus(place.balance.amount), new BigNumber(0))
  const availableShortfall = availableTotal.isLessThan(context.targetAmount.amount)
    ? new BigNumber(context.targetAmount.amount).minus(availableTotal)
    : null

  const remainingGoals = context.activeGoals.filter((goal) => goal.id !== context.goalId)
  const allocationEntries: GoalCreationAllocationEntry[] = allocations
    .filter((entry) => entry.goalId !== context.goalId)
    .map((entry) => {
      const goal = remainingGoals.find((candidate) => candidate.id === entry.goalId)
      return {
        goalId: entry.goalId,
        goalName: goal?.name ?? 'Objetivo',
        percentage: entry.percentage,
        pending: false,
      }
    })
  const allocationTotal = calculatePercentageSum(allocationEntries)
  const allocationIds = new Set(
    allocations
      .filter((entry) => entry.goalId !== context.goalId)
      .map((entry) => entry.goalId),
  )
  const allocationsValid = remainingGoals.length === 0 || (
    allocationIds.size === remainingGoals.length &&
    remainingGoals.every((goal) => allocationIds.has(goal.id)) &&
    allocationTotal.isEqualTo(100)
  )
  const allocationAmounts = recalculateAllocationAmounts({
    monthlyContribution: context.plannedMonthlyContribution,
    entries: allocationEntries.map((entry) => ({
      goalId: entry.goalId,
      percentage: entry.percentage,
      currency: remainingGoals.find((goal) => goal.id === entry.goalId)?.currency ?? 'ARS',
    })),
  })
  const displayedAllocationEntries = allocationEntries.map((entry) => ({
    ...entry,
    ...allocationAmounts.get(entry.goalId),
  }))
  const allocation: GoalCreationAllocation = {
    monthlyContribution: context.plannedMonthlyContribution,
    effectiveMonth: preview?.proposal.allocation.effectiveMonth ?? '',
    entries: displayedAllocationEntries,
    totalPercentage: allocationTotal.toFixed(2),
  }

  const withdrawalDraft = context.savingsPlaces
    .filter((place) => (withdrawals[place.id] ?? '').trim() !== '')
    .map((place) => ({ placeId: place.id, amount: canonical(withdrawals[place.id]) }))
  const allocationDraft = allocations
  const previewMatchesDraft = (candidate: GoalCompletionPreviewResult | null) => {
    if (!candidate || !withdrawalsValid || !allocationsValid) return false
    const previewWithdrawals = new Map(
      candidate.proposal.withdrawals.map((withdrawal) => [withdrawal.placeId, withdrawal.amount.amount]),
    )
    const withdrawalsMatch = withdrawalDraft.length === previewWithdrawals.size &&
      withdrawalDraft.every((withdrawal) => canonical(withdrawal.amount) === canonical(previewWithdrawals.get(withdrawal.placeId) ?? ''))
    const draftAllocations = allocations.filter((entry) => entry.goalId !== context.goalId)
    const proposedAllocations = candidate.proposal.allocation.entries.filter((entry) => entry.goalId !== context.goalId)
    const allocationsMatch = draftAllocations.length === proposedAllocations.length && draftAllocations.every((entry) => {
      const proposed = proposedAllocations.find((item) => item.goalId === entry.goalId)
      return proposed && canonical(entry.percentage) === canonical(proposed.percentage)
    })
    return withdrawalsMatch && allocationsMatch
  }
  const isPreviewSynced = !contextChanged && !isPreviewRevalidationRequired && previewMatchesDraft(preview)

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
      return context.activeGoals
        .map((goal) => ({
          goalId: goal.id,
          percentage: goal.id === context.goalId
            ? '0.00'
            : currentMap.get(goal.id) ?? seeded.find((entry) => entry.goalId === goal.id)?.percentage ?? '0.00',
        }))
    })
  }, [context, contextKey])

  useEffect(() => {
    if (!withdrawalsValid || !allocationsValid || isPreviewRevalidationRequired) return
    if (suppressNextPreviewRef.current) {
      suppressNextPreviewRef.current = false
      return
    }

    let active = true
    setIsPreviewPending(true)
    previewGoalCompletion({
      data: {
        goalId: context.goalId,
        withdrawals: withdrawalDraft,
        allocations: allocationDraft,
      },
    })
      .then((result) => {
        if (active) {
          setPreview(result)
        }
      })
      .catch(() => {
        if (!active) return
        setPreview(null)
        setIsPreviewRevalidationRequired(true)
        setServerError(previewStaleMessage)
        void Promise.resolve(onContextInvalid?.()).finally(() => serverErrorRef.current?.focus())
      })
      .finally(() => {
        if (active) setIsPreviewPending(false)
      })

    return () => {
      active = false
    }
  }, [withdrawals, allocations, withdrawalsValid, allocationsValid, context])

  useEffect(() => {
    if (serverError) serverErrorRef.current?.focus()
  }, [serverError])

  const handleWithdrawalChange = (placeId: string, value: string) => {
    if (isSubmitting) return
    setWithdrawals((current) => ({ ...current, [placeId]: formatMoneyInput(value) }))
    setPreview(null)
    if (!isPreviewRevalidationRequired) setServerError(null)
  }

  const handlePercentageChange = (goalId: string, percentage: string) => {
    if (isSubmitting) return
    setAllocations((current) => rebalanceAllocationEntries(current, goalId, percentage))
    setPreview(null)
    if (!isPreviewRevalidationRequired) setServerError(null)
  }

  const handleReviewUpdatedData = async () => {
    if (!isPreviewRevalidationRequired || isPreviewPending || isSubmitting) return
    setIsPreviewPending(true)
    try {
      const result = await previewGoalCompletion({
        data: {
          goalId: context.goalId,
          withdrawals: withdrawalDraft,
          allocations: allocationDraft,
        },
      })
      setPreview(result)
      if (previewMatchesDraft(result)) {
        setIsPreviewRevalidationRequired(false)
        setServerError(null)
      }
    } catch (error: any) {
      setPreview(null)
      setIsPreviewRevalidationRequired(true)
      setServerError(previewStaleMessage)
      try {
        await onContextInvalid?.()
      } finally {
        serverErrorRef.current?.focus()
      }
    } finally {
      setIsPreviewPending(false)
    }
  }

  const handleConfirm = async () => {
    if (!preview || !isPreviewSynced || !withdrawalsValid || !allocationsValid) return
    setIsSubmitting(true)
    setServerError(null)
    try {
      const result = await confirmGoalCompletion({
        data: {
          goalId: context.goalId,
          withdrawals: withdrawalDraft,
          allocations: allocationDraft,
          previewToken: preview.previewToken,
        },
      })

      if (result.status === 'stale') {
        suppressNextPreviewRef.current = true
        setIsPreviewRevalidationRequired(true)
        setPreview(result.preview)
        setWithdrawals(Object.fromEntries(result.preview.proposal.withdrawals.map((withdrawal) => [withdrawal.placeId, formatMoneyInput(withdrawal.amount.amount.replace('.', ','))])))
        setAllocations(result.preview.proposal.allocation.entries.map((entry) => ({ goalId: entry.goalId, percentage: entry.percentage })))
        setServerError('Tus saldos o tu Plan cambiaron. Revisá los retiros y la distribución actualizados antes de confirmar.')
        await onContextInvalid?.()
        serverErrorRef.current?.focus()
        return
      }

      if (result.status === 'invalid') {
        setIsPreviewRevalidationRequired(true)
        setPreview(null)
        setServerError(result.message)
        await onContextInvalid?.()
        serverErrorRef.current?.focus()
        return
      }

      posthog?.capture('goal_completed')
      await router.invalidate()
      toast.success('Objetivo completado.')
      onUpdated()
    } catch (error: any) {
      setServerError(error?.message ?? 'Ocurrió un error al guardar.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <div className="flex flex-col gap-6">
          <p className="text-sm leading-relaxed text-[var(--sea-ink-soft)]">
            Completar {context.goalName} significa usar los ahorros acumulados para alcanzar el objetivo; las deducciones quedan registradas y reducen esos lugares de ahorro.
          </p>

          {serverError && (
            <div
              ref={serverErrorRef}
              tabIndex={-1}
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive outline-none focus:ring-2 focus:ring-destructive"
            >
              {serverError}
              {isPreviewRevalidationRequired && (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={handleReviewUpdatedData}
                  disabled={isPreviewPending || isSubmitting}
                >
                  Revisar datos actualizados
                </Button>
              )}
            </div>
          )}

          <section aria-labelledby="completion-sources-title" className="flex flex-col gap-4">
            <div>
              <h2 id="completion-sources-title" className="text-base font-semibold text-[var(--sea-ink)]">
                ¿De dónde sale el dinero?
              </h2>
              <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
                Elegí de qué lugares de ahorro sale el monto exacto de {formatMoney(context.targetAmount)}.
              </p>
            </div>
            {availableShortfall && (
              <p role="alert" className="rounded-xl border border-[var(--line)] bg-[var(--foam)]/60 p-4 text-sm text-[var(--sea-ink-soft)]">
                El saldo disponible entre tus lugares de ahorro no alcanza para este objetivo. Faltan{' '}
                {formatMoney({ amount: availableShortfall.toFixed(2), currency: context.targetAmount.currency })}.
              </p>
            )}
            <div className="flex flex-col gap-4">
              {context.savingsPlaces.map((place) => {
                const error = withdrawalErrors[place.id]
                const errorId = `completion-${place.id}-error`
                return (
                  <Field key={place.id} data-invalid={Boolean(error)}>
                    <div className="grid grid-cols-2 items-start gap-4">
                      <FieldLabel
                        htmlFor={`completion-${place.id}`}
                        className="flex w-full min-w-0 flex-col items-start gap-1"
                      >
                        <span className="text-sm font-medium text-[var(--sea-ink)]">{place.name}</span>
                        <span className="text-xs font-normal text-[var(--sea-ink-soft)]">
                          Disponible: {formatMoney(place.balance)}
                        </span>
                      </FieldLabel>
                      <Input
                        id={`completion-${place.id}`}
                        aria-label={`Monto a retirar de ${place.name}`}
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? errorId : undefined}
                        inputMode="decimal"
                        value={withdrawals[place.id] ?? ''}
                        disabled={isSubmitting}
                        onChange={(event) => handleWithdrawalChange(place.id, event.target.value)}
                        className="min-w-0 text-right font-mono text-sm"
                      />
                    </div>
                    {error && <FieldError id={errorId}>{error}</FieldError>}
                  </Field>
                )
              })}
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--foam)]/40 p-4">
              <p role="status" aria-live="polite" className="text-sm font-semibold text-[var(--sea-ink)]">
                Seleccionado: {formatMoney({ amount: selectedTotal.toFixed(2), currency: context.targetAmount.currency })} de {formatMoney(context.targetAmount)}
              </p>
              {totalError && <p className="mt-1 text-sm text-destructive" role="alert">{totalError}</p>}
            </div>
          </section>

          <section aria-labelledby="completion-plan-title" className="flex flex-col gap-3">
            <div>
              <h2 id="completion-plan-title" className="text-base font-semibold text-[var(--sea-ink)]">
                Redistribuí tu Plan
              </h2>
              <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
                Al completar este objetivo, su aporte mensual queda disponible para tus otros objetivos.
              </p>
            </div>
            {remainingGoals.length === 0 ? (
              <p className="rounded-xl border border-[var(--line)] bg-[var(--foam)]/40 p-4 text-sm text-[var(--sea-ink-soft)]">
                No quedan objetivos activos: el Plan mensual se va a pausar.
              </p>
            ) : (
              <PlanAllocationEditor
                allocation={allocation}
                disabled={Boolean(availableShortfall) || !withdrawalsValid || isPreviewPending || isSubmitting}
                onPercentageChange={handlePercentageChange}
                onPercentageCommit={() => undefined}
              />
            )}
          </section>

          <section aria-labelledby="completion-impact-title" className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 id="completion-impact-title" className="text-base font-semibold text-[var(--sea-ink)]">
                Impacto en las fechas
              </h2>
              {(isPreviewPending || (withdrawalsValid && allocationsValid && !isPreviewSynced)) && (
                <span className="text-right text-xs text-[var(--sea-ink-soft)]" role="status">
                  {isPreviewPending ? 'Actualizando impacto...' : 'Proyección pendiente de actualización'}
                </span>
              )}
            </div>
            {!withdrawalsValid ? (
              <p className="rounded-xl border border-[var(--line)] bg-[var(--foam)]/40 p-4 text-center text-sm text-[var(--sea-ink-soft)]">
                Completá los retiros para calcular el impacto.
              </p>
            ) : preview?.proposal.impacts.length ? (
              <div className={isPreviewPending ? 'opacity-50' : undefined}>
                <AllocationImpactComparison impacts={preview.proposal.impacts} />
              </div>
            ) : null}
          </section>
        </div>
      </div>

      <div className="sticky bottom-0 flex flex-col items-stretch gap-3 border-t border-[var(--line)] bg-popover px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} className="w-full sm:w-auto">
          Cancelar
        </Button>
        <Button
          type="button"
          disabled={Boolean(availableShortfall) || !withdrawalsValid || !allocationsValid || !preview || !isPreviewSynced || isPreviewPending || isSubmitting}
          onClick={handleConfirm}
          className="w-full sm:w-auto"
        >
          {isSubmitting ? 'Completando...' : 'Confirmar, marcar como completado'}
        </Button>
      </div>
    </div>
  )
}

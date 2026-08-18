import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import BigNumber from 'bignumber.js'
import { Badge } from '@/components/ui/badge'
import {
  compareMoney,
  createMoney,
  formatMoneyInput,
  isPositiveMoney,
  multiplyMoneyByFactor,
  parseMoneyInput,
} from '../../../lib/money'
import { formatMoney } from '../../../lib/format'
import { completeInitialPlan } from '../../../features/financial/financial.functions'

type GoalKind = 'emergency_fund' | 'fixed_savings' | 'car'

export function FinancialOnboarding() {
  const router = useRouter()

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [goalKind, setGoalKind] = useState<GoalKind>('emergency_fund')
  const [fixedTarget, setFixedTarget] = useState('')
  const [income, setIncome] = useState('')
  const [expensesKnowledge, setExpensesKnowledge] = useState<'known' | 'unknown'>('known')
  const [expenses, setExpenses] = useState('')
  const [savingsPercentageInput, setSavingsPercentageInput] = useState('50')

  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const parsedIncome = parseMoneyInput(income, 'ARS')
  const parsedExpenses = expensesKnowledge === 'known' ? parseMoneyInput(expenses, 'ARS') : null
  const savingsPercentage = Number(savingsPercentageInput)
  const hasValidSavingsPercentage =
    Number.isInteger(savingsPercentage) && savingsPercentage >= 1 && savingsPercentage <= 100
  const hasPositiveSavingsCapacity =
    parsedIncome && parsedExpenses && compareMoney(parsedIncome, parsedExpenses) > 0
  const savingsCapacity = parsedIncome && parsedExpenses
    ? createMoney(new BigNumber(parsedIncome.amount).minus(parsedExpenses.amount), 'ARS')
    : null
  const contributionBase = hasPositiveSavingsCapacity ? savingsCapacity : parsedIncome
  const plannedContribution = contributionBase && hasValidSavingsPercentage
    ? multiplyMoneyByFactor(contributionBase, savingsPercentage / 100)
    : null

  const handleNextStep1 = () => {
    setError(null)
    if (goalKind === 'fixed_savings' || goalKind === 'car') {
      const parsed = parseMoneyInput(fixedTarget, 'ARS')
      if (!parsed || !isPositiveMoney(parsed)) {
        setError('Ingresá un monto objetivo mayor a cero.')
        return
      }
    }
    setStep(2)
  }

  const handleNextStep2 = () => {
    setError(null)
    const parsed = parseMoneyInput(income, 'ARS')
    if (!parsed) {
      setError('Ingresá tus ingresos mensuales aproximados.')
      return
    }
    setStep(3)
  }

  const handleNextStep3 = () => {
    setError(null)
    if (expensesKnowledge === 'known') {
      const parsed = parseMoneyInput(expenses, 'ARS')
      if (!parsed) {
        setError('Ingresá tus gastos mensuales aproximados.')
        return
      }
    }

    const currentIncome = parseMoneyInput(income, 'ARS')
    const currentExpenses = expensesKnowledge === 'known' ? parseMoneyInput(expenses, 'ARS') : null
    const hasPositiveCapacity =
      currentIncome && currentExpenses ? compareMoney(currentIncome, currentExpenses) > 0 : false

    setSavingsPercentageInput(hasPositiveCapacity ? '50' : '5')
    setStep(4)
  }

  const handleSubmit = async () => {
    setError(null)
    setServerError(null)

    if (!hasValidSavingsPercentage) {
      setError('Ingresá un porcentaje entre 1% y 100%.')
      return
    }
    if (!plannedContribution) {
      setError('No pudimos calcular tu aporte mensual. Volvé a revisar tus ingresos.')
      return
    }

    setIsSubmitting(true)
    try {
      await completeInitialPlan({
        data: {
          goalKind,
          income,
          expensesKnowledge,
          expenses: expensesKnowledge === 'known' ? expenses : '',
          plannedContribution: plannedContribution.amount,
          fixedTarget: goalKind === 'emergency_fund' ? '' : fixedTarget,
        },
      })
      await router.invalidate()
      toast.success('Tu plan ya está listo.')
    } catch (err: unknown) {
      setServerError(
        err instanceof Error && err.message
          ? err.message
          : 'Ocurrió un error al guardar tu plan. Por favor, reintentá.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className={`mx-auto flex w-full max-w-2xl flex-col px-4 sm:px-6 sm:py-12 sm:pb-24 ${step === 1 ? 'py-4 pb-0' : 'py-8 pb-24'}`}
    >
      {/* Progress */}
      <nav aria-label="Progreso del perfil financiero" className={`${step === 1 ? 'mb-4' : 'mb-8'} sm:mb-8`}>
        <div className="flex items-center justify-center text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)]">
          <span>Paso {step} de 4</span>
          <span className="sr-only">
            {step === 1 && 'Paso 1: Objetivo inicial'}
            {step === 2 && 'Paso 2: Ingresos mensuales'}
            {step === 3 && 'Paso 3: Gastos mensuales'}
            {step === 4 && 'Paso 4: Aporte planificado'}
          </span>
        </div>
        <div className="mx-auto mt-2 flex h-1.5 w-36 gap-2 overflow-hidden rounded-full">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              aria-current={s === step ? 'step' : undefined}
              className={`h-full flex-1 rounded-full transition-all duration-300 ${
                s <= step ? 'bg-[var(--palm)]' : 'bg-[var(--line)]'
              }`}
            />
          ))}
        </div>
      </nav>

      {/* Form Container */}
      <div
        className={`rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] shadow-[var(--shadow-card)] sm:p-8 ${step === 1 ? 'p-4' : 'p-6'}`}
      >
        {step === 1 && (
          <div className="flex flex-col gap-4 sm:gap-6">
            <div>
              <h1 className="font-serif text-2xl font-bold tracking-tight text-[var(--sea-ink)] sm:text-3xl">
                Vamos a construir tu perfil financiero
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-[var(--sea-ink-soft)] sm:text-base">
                Empecemos con algunos datos básicos. No tienen que ser exactos y podés cambiarlos después.
              </p>
            </div>

            <fieldset className="flex flex-col gap-2 sm:gap-3">
              <legend className="text-sm font-semibold text-[var(--sea-ink)]">
                Elegí tu primer objetivo:
              </legend>

              <div
                className={`rounded-xl border p-3 sm:p-4 transition-colors ${
                  goalKind === 'emergency_fund'
                    ? 'border-[var(--palm)] bg-[var(--foam)]'
                    : 'border-[var(--line)] bg-white/50 hover:bg-white/80'
                }`}
              >
                <label htmlFor="emergency-fund-goal" className="flex w-full cursor-pointer items-start gap-2 sm:gap-3">
                  <input
                    type="radio"
                    name="goalKind"
                    value="emergency_fund"
                    checked={goalKind === 'emergency_fund'}
                    aria-label="Colchón financiero"
                    id="emergency-fund-goal"
                    aria-describedby="emergency-fund-recommendation emergency-fund-description"
                    onChange={() => {
                      setGoalKind('emergency_fund')
                      setError(null)
                    }}
                    className="h-4 w-4 text-[var(--palm)] focus:ring-[var(--palm)]"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium text-[var(--sea-ink)]">Colchón financiero</div>
                      <Badge
                        id="emergency-fund-recommendation"
                        variant="outline"
                        className="h-4 border-[var(--line)] bg-[var(--foam)] px-1.5 text-[10px] text-[var(--sea-ink-soft)]"
                      >
                        Recomendado
                      </Badge>
                    </div>
                    <p id="emergency-fund-description" className="text-xs text-[var(--sea-ink-soft)]">
                      Si no tenés un fondo emergencia todavía, recomendamos empezar por acá. Un fondo de emergencia equivale a 6 meses de gastos, útil para estar seguro ante cualquier eventualidad.
                    </p>
                  </div>
                </label>
              </div>

              <label
                className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 sm:p-4 transition-colors ${
                  goalKind === 'fixed_savings'
                    ? 'border-[var(--palm)] bg-[var(--foam)]'
                    : 'border-[var(--line)] bg-white/50 hover:bg-white/80'
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <input
                    type="radio"
                    name="goalKind"
                    value="fixed_savings"
                    checked={goalKind === 'fixed_savings'}
                    onChange={() => {
                      setGoalKind('fixed_savings')
                      setError(null)
                    }}
                    className="h-4 w-4 text-[var(--palm)] focus:ring-[var(--palm)]"
                  />
                  <div>
                    <div className="font-medium text-[var(--sea-ink)]">
                      Quiero ahorrar cierta suma de dinero
                    </div>
                    <div className="text-[11px] leading-tight text-[var(--sea-ink-soft)] sm:text-xs sm:leading-normal">
                      Meta de ahorro fija con monto específico
                    </div>
                  </div>
                </div>
              </label>

              <label
                className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 sm:p-4 transition-colors ${
                  goalKind === 'car'
                    ? 'border-[var(--palm)] bg-[var(--foam)]'
                    : 'border-[var(--line)] bg-white/50 hover:bg-white/80'
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <input
                    type="radio"
                    name="goalKind"
                    value="car"
                    checked={goalKind === 'car'}
                    onChange={() => {
                      setGoalKind('car')
                      setError(null)
                    }}
                    className="h-4 w-4 text-[var(--palm)] focus:ring-[var(--palm)]"
                  />
                  <div>
                    <div className="font-medium text-[var(--sea-ink)]">Quiero cambiar el auto</div>
                    <div className="text-[11px] leading-tight text-[var(--sea-ink-soft)] sm:text-xs sm:leading-normal">
                      Planificar el ahorro para tu próximo vehículo
                    </div>
                  </div>
                </div>
              </label>
            </fieldset>

            {(goalKind === 'fixed_savings' || goalKind === 'car') && (
              <div className="flex flex-col gap-1.5 animate-in fade-in duration-200">
                <label htmlFor="fixedTarget" className="text-sm font-semibold text-[var(--sea-ink)]">
                  Monto objetivo
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-[var(--sea-ink-soft)]">
                    $
                  </span>
                  <input
                    id="fixedTarget"
                    type="text"
                    inputMode="decimal"
                    value={fixedTarget}
                    onChange={(e) => {
                      setFixedTarget(formatMoneyInput(e.target.value))
                      setError(null)
                    }}
                    placeholder="Ej: 5.000.000"
                    className="w-full rounded-xl border border-[var(--line)] bg-white/80 py-2.5 pl-8 pr-4 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)]/50 focus:border-[var(--palm)] focus:outline-none focus:ring-1 focus:ring-[var(--palm)]"
                  />
                </div>
              </div>
            )}

            <p className="text-xs text-[var(--sea-ink-soft)]">
              Podés cambiar o agregar objetivos más adelante.
            </p>

            {error && (
              <div role="alert" className="rounded-lg bg-[var(--error-surface)] p-3 text-sm text-[var(--error)] border border-[var(--error-border)]">
                {error}
              </div>
            )}

            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={handleNextStep1}
                className="inline-flex items-center justify-center rounded-xl bg-[var(--palm)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--palm)]/90 focus:outline-none focus:ring-2 focus:ring-[var(--palm)] focus:ring-offset-2"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[var(--sea-ink)] sm:text-3xl">
                Ingresos mensuales aproximados
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--sea-ink-soft)] sm:text-base">
                ¿Cuánto dinero ingresa por mes en promedio? (0 es válido si no tenés ingresos actualmente).
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="income" className="text-sm font-semibold text-[var(--sea-ink)]">
                Ingresos mensuales aproximados
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-[var(--sea-ink-soft)]">
                  $
                </span>
                <input
                  id="income"
                  type="text"
                  inputMode="decimal"
                  value={income}
                  onChange={(e) => {
                    setIncome(formatMoneyInput(e.target.value))
                    setError(null)
                  }}
                  placeholder="Ej: 500.000"
                  className="w-full rounded-xl border border-[var(--line)] bg-white/80 py-2.5 pl-8 pr-4 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)]/50 focus:border-[var(--palm)] focus:outline-none focus:ring-1 focus:ring-[var(--palm)]"
                />
              </div>
            </div>

            {error && (
              <div role="alert" className="rounded-lg bg-[var(--error-surface)] p-3 text-sm text-[var(--error)] border border-[var(--error-border)]">
                {error}
              </div>
            )}

            <div className="mt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setError(null)
                  setStep(1)
                }}
                className="inline-flex items-center justify-center rounded-xl border border-[var(--line)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--sea-ink)] hover:bg-[var(--foam)] focus:outline-none focus:ring-2 focus:ring-[var(--palm)]"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleNextStep2}
                className="inline-flex items-center justify-center rounded-xl bg-[var(--palm)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--palm)]/90 focus:outline-none focus:ring-2 focus:ring-[var(--palm)] focus:ring-offset-2"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[var(--sea-ink)] sm:text-3xl">
                Gastos mensuales aproximados
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--sea-ink-soft)] sm:text-base">
                ¿Cuánto estimás que gastás por mes en total? Si todavía no lo sabés, podés marcar la opción debajo.
              </p>
            </div>

            {expensesKnowledge === 'known' ? (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="expenses" className="text-sm font-semibold text-[var(--sea-ink)]">
                  Gastos mensuales aproximados
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-[var(--sea-ink-soft)]">
                    $
                  </span>
                  <input
                    id="expenses"
                    type="text"
                    inputMode="decimal"
                    value={expenses}
                    onChange={(e) => {
                      setExpenses(formatMoneyInput(e.target.value))
                      setError(null)
                    }}
                    placeholder="Ej: 250.000"
                    className="w-full rounded-xl border border-[var(--line)] bg-white/80 py-2.5 pl-8 pr-4 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)]/50 focus:border-[var(--palm)] focus:outline-none focus:ring-1 focus:ring-[var(--palm)]"
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-[var(--line)] bg-[var(--foam)] p-4 text-sm text-[var(--sea-ink-soft)]">
                Vas a poder detallar tus gastos más adelante en tu plan.
              </div>
            )}

            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={expensesKnowledge === 'unknown'}
                onChange={(e) => {
                  if (e.target.checked) {
                    setExpensesKnowledge('unknown')
                    setExpenses('')
                  } else {
                    setExpensesKnowledge('known')
                  }
                  setError(null)
                }}
                className="h-4 w-4 rounded border-[var(--line)] text-[var(--palm)] focus:ring-[var(--palm)]"
              />
              <span className="text-sm font-medium text-[var(--sea-ink)]">No sé / Gasto todo lo que ingresa</span>
            </label>

            {error && (
              <div role="alert" className="rounded-lg bg-[var(--error-surface)] p-3 text-sm text-[var(--error)] border border-[var(--error-border)]">
                {error}
              </div>
            )}

            <div className="mt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setError(null)
                  setStep(2)
                }}
                className="inline-flex items-center justify-center rounded-xl border border-[var(--line)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--sea-ink)] hover:bg-[var(--foam)] focus:outline-none focus:ring-2 focus:ring-[var(--palm)]"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleNextStep3}
                className="inline-flex items-center justify-center rounded-xl bg-[var(--palm)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--palm)]/90 focus:outline-none focus:ring-2 focus:ring-[var(--palm)] focus:ring-offset-2"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[var(--sea-ink)] sm:text-3xl">
                Aporte mensual planificado
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--sea-ink-soft)] sm:text-base">
                ¿Cuánto dinero pensás destinar por mes para construir este objetivo?
              </p>
            </div>

            <div className="flex flex-col gap-2 rounded-xl border border-[var(--line)] bg-[var(--foam)]/40 p-4">
              {parsedIncome && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--sea-ink-soft)]">Ingresos</span>
                  <span className="font-medium text-[var(--sea-ink)]">{formatMoney(parsedIncome)}</span>
                </div>
              )}
              {parsedExpenses && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--sea-ink-soft)]">Gastos</span>
                  <span className="font-medium text-[var(--sea-ink)]">{formatMoney(parsedExpenses)}</span>
                </div>
              )}
              {savingsCapacity && (
                <div className="flex items-center justify-between border-t border-[var(--line)] pt-2 text-sm">
                  <span className="font-semibold text-[var(--sea-ink)]">Capacidad de ahorro</span>
                  <span className="font-semibold text-[var(--sea-ink)]">{formatMoney(savingsCapacity)}</span>
                </div>
              )}
            </div>

            {!hasPositiveSavingsCapacity && (
              <div className="rounded-xl border border-[var(--line)] bg-[var(--foam)] p-3.5 text-xs leading-relaxed text-[var(--sea-ink-soft)] sm:text-sm">
                Tus gastos están muy cerca (o superan) tus ingresos. Vamos a empezar con un 5% de ahorro, y no te preocupes, con nuestra ayuda seguro podes ahorrar!
              </div>
            )}

            <div className="flex flex-col gap-3">
              <label htmlFor="savingsPercentage" className="text-sm font-semibold text-[var(--sea-ink)]">
                Porcentaje de tu capacidad de ahorro
              </label>
              <div className="relative">
                <input
                  id="savingsPercentage"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="100"
                  step="1"
                  value={savingsPercentageInput}
                  onChange={(event) => {
                    setSavingsPercentageInput(event.target.value)
                    setError(null)
                    setServerError(null)
                  }}
                  className="w-full rounded-xl border border-[var(--line)] bg-white/80 py-2.5 pl-4 pr-8 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)]/50 focus:border-[var(--palm)] focus:outline-none focus:ring-1 focus:ring-[var(--palm)]"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-[var(--sea-ink-soft)]"
                >
                  %
                </span>
              </div>
              <input
                aria-label="Ajustar porcentaje de ahorro"
                type="range"
                min="1"
                max="100"
                step="1"
                value={hasValidSavingsPercentage ? savingsPercentage : 1}
                onChange={(event) => {
                  setSavingsPercentageInput(event.target.value)
                  setError(null)
                  setServerError(null)
                }}
                className="w-full accent-[var(--palm)]"
              />
              {plannedContribution && (
                <p className="text-sm font-medium text-[var(--sea-ink)]">
                  Equivale a {formatMoney(plannedContribution)} por mes
                </p>
              )}
            </div>

            {error && (
              <div role="alert" className="rounded-lg bg-[var(--error-surface)] p-3 text-sm text-[var(--error)] border border-[var(--error-border)]">
                {error}
              </div>
            )}

            {serverError && (
              <div role="alert" className="rounded-lg bg-[var(--error-surface)] p-3 text-sm text-[var(--error)] border border-[var(--error-border)]">
                {serverError}
              </div>
            )}

            <div className="mt-2 flex items-center justify-between">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setError(null)
                  setServerError(null)
                  setStep(3)
                }}
                className="inline-flex items-center justify-center rounded-xl border border-[var(--line)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--sea-ink)] hover:bg-[var(--foam)] focus:outline-none focus:ring-2 focus:ring-[var(--palm)] disabled:opacity-50"
              >
                Volver
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="inline-flex items-center justify-center rounded-xl bg-[var(--palm)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--palm)]/90 focus:outline-none focus:ring-2 focus:ring-[var(--palm)] focus:ring-offset-2 disabled:opacity-50"
              >
                {isSubmitting ? 'Guardando...' : serverError ? 'Reintentar' : 'Ver mi plan'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

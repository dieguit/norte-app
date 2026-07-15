import { createFileRoute } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  onboardingSteps,
  validateStep,
  getFirstIncompleteStep,
  type OnboardingAnswers,
} from '../onboarding/definition'
import { loadDraft, saveDraft as saveLocalDraft } from '../onboarding/draft'
import { getOnboardingDraft, saveOnboardingDraft } from '../onboarding/server'
import { ArrowLeft, ArrowRight, CheckCircle2, Lock, Sparkles } from 'lucide-react'

export const Route = createFileRoute('/onboarding')({
  component: OnboardingPage,
})

export function OnboardingPage() {
  const [mounted, setMounted] = useState(false)
  const [deviceId, setDeviceId] = useState<string>('')
  const [stepIndex, setStepIndex] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Initialize form with TanStack React Form
  const form = useForm({
    defaultValues: {} as OnboardingAnswers,
  })

  // Set mounted on client
  useEffect(() => {
    setMounted(true)
  }, [])

  // Load draft data on mount
  useEffect(() => {
    if (!mounted) return

    // 1. Get or generate device ID
    let id = localStorage.getItem('onboarding-device-id')
    if (!id) {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        id = crypto.randomUUID()
      } else {
        id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0
          const v = c === 'x' ? r : (r & 0x3) | 0x8
          return v.toString(16)
        })
      }
      localStorage.setItem('onboarding-device-id', id)
    }
    setDeviceId(id)

    // 2. Read local storage draft
    const local = loadDraft()
    if (local) {
      setStepIndex(local.stepIndex)
      setCompleted(local.completed)
      Object.entries(local.answers).forEach(([key, val]) => {
        form.setFieldValue(key as any, val as any)
      })
    }

    // 3. Call getOnboardingDraft and compare timestamps
    getOnboardingDraft({ data: { deviceId: id } })
      .then((serverDraft) => {
        if (serverDraft) {
          const localTime = local ? new Date(local.updatedAt).getTime() : 0
          const serverTime = serverDraft.updatedAt ? new Date(serverDraft.updatedAt).getTime() : 0

          if (!local || serverTime > localTime) {
            const nextIncomplete = getFirstIncompleteStep(serverDraft.answers)
            const resolvedStep = nextIncomplete >= 0 ? nextIncomplete : 0
            const isCompleted = !!serverDraft.completedAt

            setStepIndex(resolvedStep)
            setCompleted(isCompleted)

            // Update form values
            Object.entries(serverDraft.answers).forEach(([key, val]) => {
              form.setFieldValue(key as any, val as any)
            })

            // Sync back to local storage
            saveLocalDraft({
              deviceId: id,
              answers: serverDraft.answers,
              stepIndex: resolvedStep,
              completed: isCompleted,
              updatedAt: new Date(serverDraft.updatedAt).toISOString(),
            })
          }
        }
      })
      .catch((err) => {
        console.error('Failed to retrieve onboarding draft from server:', err)
      })
  }, [mounted])

  if (!mounted) {
    return (
      <main className="flex flex-col flex-1 sm:items-center sm:justify-center px-0 py-0 sm:px-8 sm:py-12">
        <section className="flex flex-col flex-1 w-full rounded-none border-x-0 border-b border-t-0 sm:flex-initial lg:w-[70vw] sm:rounded-[2rem] sm:border sm:shadow-[var(--shadow-card)] p-6 sm:p-8 lg:p-10 bg-[var(--surface-strong)] animate-pulse h-96">
          <div className="h-6 bg-[var(--line)] rounded w-1/4 mb-4"></div>
          <div className="h-10 bg-[var(--line)] rounded w-3/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-12 bg-[var(--line)] rounded"></div>
            <div className="h-12 bg-[var(--line)] rounded"></div>
          </div>
        </section>
      </main>
    )
  }

  // Back action: without saving
  const handleBack = () => {
    if (stepIndex > 0) {
      setSaveError(null)
      setValidationErrors({})
      const prevStepIndex = stepIndex - 1
      setStepIndex(prevStepIndex)

      const local = loadDraft()
      if (local) {
        saveLocalDraft({
          ...local,
          stepIndex: prevStepIndex,
          updatedAt: new Date().toISOString(),
        })
      }
    }
  }

  // Next action
  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveError(null)
    setValidationErrors({})

    const currentAnswers = form.state.values
    const errors = validateStep(stepIndex, currentAnswers)
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    setIsSaving(true)
    try {
      const isLastStep = stepIndex === onboardingSteps.length - 1
      const isCompleted = isLastStep
      const nextStepIndex = stepIndex + 1
      const updatedAt = new Date().toISOString()

      // 1. Save to local draft first
      saveLocalDraft({
        deviceId,
        answers: currentAnswers,
        stepIndex: isCompleted ? stepIndex : nextStepIndex,
        completed: isCompleted,
        updatedAt,
      })

      // 2. Call saveOnboardingDraft server action
      await saveOnboardingDraft({
        data: {
          deviceId,
          answers: currentAnswers,
          completed: isCompleted,
        },
      })

      // 3. Proceed
      if (isCompleted) {
        setCompleted(true)
      } else {
        setStepIndex(nextStepIndex)
      }
    } catch (error) {
      console.error('Failed to save onboarding progress:', error)
      setSaveError('Failed to save onboarding draft. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  // Render completion screen
  if (completed) {
    return (
      <main className="flex flex-col flex-1 sm:items-center sm:justify-center px-0 py-0 sm:px-8 sm:py-12">
        <section className="flex flex-col flex-1 w-full rounded-none border-x-0 border-b border-t-0 sm:flex-initial lg:w-[70vw] sm:rounded-[2rem] sm:border sm:shadow-[var(--shadow-card)] p-6 sm:p-8 lg:p-10 bg-[var(--surface-strong)] text-center items-center justify-center">
          <div className="bg-[var(--foam)] border border-[var(--chip-line)] rounded-full p-4 mb-6 text-[var(--palm)] animate-bounce">
            <CheckCircle2 className="size-16" />
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold leading-tight text-[var(--sea-ink)] mb-4">
            Onboarding Completed!
          </h1>
          <p className="text-base text-[var(--sea-ink-soft)] leading-relaxed mb-8 max-w-md">
            Thank you for sharing your financial overview. Your profile is ready, and you can now explore tailored tools and services.
          </p>
          <div className="flex items-center gap-2 text-sm text-[var(--sea-ink-soft)]">
            <Lock className="size-4" />
            <span>Your financial data is encrypted & secure</span>
          </div>
        </section>
      </main>
    )
  }

  const currentStep = onboardingSteps[stepIndex]
  const progressPercent = Math.round(((stepIndex + 1) / onboardingSteps.length) * 100)

  return (
    <main className="flex flex-col flex-1 sm:items-center sm:justify-center px-0 py-0 sm:px-8 sm:py-12">
      <section className="flex flex-col flex-1 w-full rounded-none border-x-0 border-b border-t-0 sm:flex-initial lg:w-[70vw] sm:rounded-[2rem] sm:border sm:shadow-[var(--shadow-card)] p-6 sm:p-8 lg:p-10 bg-[var(--surface-strong)] space-y-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center text-xs font-semibold text-[var(--sea-ink-soft)] mb-2">
            <span>STEP {stepIndex + 1} OF {onboardingSteps.length}</span>
            <span>{progressPercent}% COMPLETE</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--line)]">
            <div
              className="h-full bg-[var(--lagoon-deep)] transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Step Header */}
        <div className="mb-6">
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1 text-xs font-bold text-[var(--palm)]">
            <Sparkles className="size-3.5" />
            Financial Assessment
          </span>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold leading-tight text-[var(--sea-ink)]">
            {currentStep.title}
          </h1>
        </div>

        {/* Form */}
        <form onSubmit={handleNext} className="flex flex-col flex-1 justify-between sm:justify-start space-y-6">
          <div className="flex-1 space-y-6">
            {currentStep.fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <label
                  htmlFor={field.id}
                  className="block text-sm font-bold text-[var(--sea-ink)]"
                >
                  {field.label}
                  {field.required && <span className="text-rose-500 ml-0.5">*</span>}
                </label>

                <form.Field name={field.id}>
                  {(fieldState) => {
                    if (field.type === 'currency') {
                      return (
                        <Input
                          id={field.id}
                          type="number"
                          placeholder="e.g. 1500000"
                          value={fieldState.state.value ?? ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : Number(e.target.value)
                            fieldState.handleChange(val)
                          }}
                          onBlur={fieldState.handleBlur}
                          className={
                            validationErrors[field.id]
                              ? 'border-[var(--error)] ring-[color-mix(in_oklab,var(--error)_20%,transparent)] focus:border-[var(--error)]'
                              : ''
                          }
                        />
                      )
                    } else {
                      return (
                        <div className="relative">
                          <select
                            id={field.id}
                            aria-label={
                              field.id === 'incomeRange'
                                ? 'Income range'
                                : field.id === 'savingsRange'
                                  ? 'Savings range'
                                  : field.id === 'debtRange'
                                    ? 'Debt range'
                                    : undefined
                            }
                            value={fieldState.state.value ?? ''}
                            onChange={(e) => fieldState.handleChange(e.target.value)}
                            onBlur={fieldState.handleBlur}
                            className="block w-full rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-3.5 py-2.5 text-base text-[var(--sea-ink)] outline-none transition-colors focus:border-[var(--lagoon-deep)] focus:ring-3 focus:ring-[color-mix(in_oklab,var(--lagoon)_25%,transparent)]"
                          >
                            <option value="" disabled>Select an option...</option>
                            {field.options?.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                      )
                    }
                  }}
                </form.Field>

                {validationErrors[field.id] && (
                  <p className="mt-1 text-xs font-semibold text-[var(--error)]">
                    {validationErrors[field.id]}
                  </p>
                )}
              </div>
            ))}

            {/* Save/Retry Error */}
            {saveError && (
              <div
                className="flex items-center gap-2 rounded-xl border border-[var(--error-border)] bg-[var(--error-surface)] p-4 text-sm font-semibold text-[var(--error)]"
                role="alert"
                aria-live="polite"
              >
                <div className="size-2 rounded-full bg-[var(--error)] animate-ping" />
                <span>{saveError}</span>
              </div>
            )}
          </div>

          {/* Navigation Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={stepIndex === 0 || isSaving}
              className="h-auto rounded-xl border border-[var(--line)] px-5 py-2.5 text-base font-bold text-[var(--sea-ink)] hover:bg-[var(--foam)] disabled:opacity-40 flex items-center gap-2 transition-all active:scale-[0.98]"
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>

            <Button
              type="submit"
              disabled={isSaving}
              className="h-auto rounded-xl bg-[var(--lagoon-deep)] px-6 py-2.5 text-base font-bold text-[var(--on-primary)] hover:bg-[var(--sea-ink)] disabled:opacity-50 flex items-center gap-2 shadow-md shadow-[var(--lagoon)/10] transition-all active:scale-[0.98]"
            >
              {isSaving ? (
                <>
                  <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  {stepIndex === onboardingSteps.length - 1 ? 'Complete' : 'Next'}
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </section>
    </main>
  )
}

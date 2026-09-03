import type { RefObject } from 'react'
import { formatCalendarMonth } from '../../../lib/format'

interface SavingContributionFeedbackProps {
  serverError: string | null
  placeError?: string
  staleMessage: string | null
  catchUpMonth?: string
  alertRef: RefObject<HTMLDivElement | null>
}

export function SavingContributionFeedback({
  serverError,
  placeError,
  staleMessage,
  catchUpMonth,
  alertRef,
}: SavingContributionFeedbackProps) {
  return (
    <>
      {serverError && !placeError && (
        <div ref={alertRef} tabIndex={-1} role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive outline-none focus:ring-2 focus:ring-destructive">
          {serverError}
        </div>
      )}
      {staleMessage && (
        <div ref={alertRef} tabIndex={-1} role="alert" className="rounded-xl border border-[var(--line)] bg-[var(--foam)] p-4 text-sm font-medium text-[var(--sea-ink)] outline-none focus:ring-2 focus:ring-[var(--palm)]">
          {staleMessage}
        </div>
      )}
      {catchUpMonth && (
        <p className="rounded-xl border border-[var(--line)] bg-[var(--foam)]/60 px-4 py-3 text-sm text-[var(--sea-ink)]">
          Este aporte se registrará para {formatCalendarMonth(catchUpMonth)}.
        </p>
      )}
    </>
  )
}

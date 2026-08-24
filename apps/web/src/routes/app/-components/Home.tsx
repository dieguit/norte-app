import { useState } from 'react'
import { Button } from '../../../components/ui/button'
import { formatMoney, formatMonthName } from '../../../lib/format'
import {
  getPreviousCalendarMonth,
  type InitialHomeState,
} from '../../../features/financial/financial'
import type { RoadmapData } from '../../../features/roadmap/roadmap'
import { ContributionActionSheet, type CatchUpContribution } from './ContributionActionSheet'
import { Roadmap } from './Roadmap'

export interface HomeProps {
  home: InitialHomeState
  roadmap: RoadmapData
  now?: Date
}

export function Home({ home, roadmap, now }: HomeProps) {
  const [isContributionOpen, setIsContributionOpen] = useState(false)
  const [catchUpContribution, setCatchUpContribution] = useState<CatchUpContribution | null>(null)

  const closedMonth = getPreviousCalendarMonth(now)
  const previousMonthName = formatMonthName(closedMonth)
  const shortfalls = home.previousMonthShortfalls ?? []

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-12">
      <header className="flex items-center justify-between gap-4">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-[var(--sea-ink)] sm:text-4xl">Inicio</h1>
        <Button
          type="button"
          onClick={() => {
            setCatchUpContribution(null)
            setIsContributionOpen(true)
          }}
        >
          + Registrar
        </Button>
      </header>
      {shortfalls.length > 0 ? (
        <section
          aria-labelledby="previous-month-shortfalls-heading"
          className="rounded-xl border border-[var(--line)] bg-[var(--foam)] p-5"
        >
          <h2
            id="previous-month-shortfalls-heading"
            className="text-base font-semibold text-[var(--sea-ink)]"
          >
            No cumpliste todos tus objetivos de {previousMonthName}.
          </h2>
          <ul className="mt-2 flex flex-col gap-2 text-sm text-[var(--sea-ink-soft)]">
            {shortfalls.map((shortfall, index) => (
              <li
                key={`${shortfall.kind}-${shortfall.currency}-${index}`}
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <span>
                  En {previousMonthName} te faltaron{' '}
                  {shortfall.kind === 'investment' ? 'invertir' : 'ahorrar'} {shortfall.currency}{' '}
                  {formatMoney(shortfall.amount)}.
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCatchUpContribution({
                      kind: shortfall.kind,
                      currency: shortfall.currency,
                      amount: shortfall.amount.amount,
                      month: closedMonth,
                    })
                    setIsContributionOpen(true)
                  }}
                >
                  Ponerse al día
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section
          aria-labelledby="previous-month-success-heading"
          className="rounded-xl border border-[var(--line)] bg-[var(--lagoon)]/35 p-5"
        >
          <h2
            id="previous-month-success-heading"
            className="font-semibold text-[var(--sea-ink)]"
          >
            Cumpliste tus objetivos de {previousMonthName}.
          </h2>
          <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">Seguís en camino con tu plan.</p>
        </section>
      )}
      <Roadmap roadmap={roadmap} />
      <ContributionActionSheet
        open={isContributionOpen}
        onOpenChange={(open) => {
          setIsContributionOpen(open)
          if (!open) {
            setCatchUpContribution(null)
          }
        }}
        catchUpContribution={catchUpContribution}
      />
    </div>
  )
}

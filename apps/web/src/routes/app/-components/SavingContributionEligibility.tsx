import type { ContributionKind } from '../../../features/contributions/saving-contribution'

interface SavingContributionEligibilityProps {
  kind: ContributionKind
  currency: 'ARS' | 'USD'
  hasEligibleGoals: boolean
  hasIncompleteInvestmentData: boolean
}

function getEmptyGoalsMessage(kind: ContributionKind, currency: 'ARS' | 'USD') {
  if (kind === 'investment') return `No hay objetivos activos para distribuir la inversión en ${currency}.`
  return currency === 'USD'
    ? 'No hay objetivos activos para distribuir el ahorro en USD.'
    : 'No tenés objetivos activos en ARS para asignar este ahorro.'
}

export function SavingContributionEligibility({
  kind,
  currency,
  hasEligibleGoals,
  hasIncompleteInvestmentData,
}: SavingContributionEligibilityProps) {
  return (
    <>
      {!hasEligibleGoals && !hasIncompleteInvestmentData && (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-strong)]/50 p-4 text-center">
          <p className="text-sm font-medium text-[var(--sea-ink-soft)]">{getEmptyGoalsMessage(kind, currency)}</p>
        </div>
      )}
      {hasIncompleteInvestmentData && (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-strong)]/50 p-4 text-center" role="status">
          <p className="text-sm font-medium text-[var(--sea-ink-soft)]">
            Falta asociar una posición de inversión en {currency} a uno o más objetivos. Configurala para continuar.
          </p>
        </div>
      )}
    </>
  )
}

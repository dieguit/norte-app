import type {
  ContributionKind,
  SavingContributionContext,
} from '../../../features/contributions/saving-contribution'
import { formatMoney } from '../../../lib/format'

interface SavingContributionTargetProps {
  kind: ContributionKind
  currency: 'ARS' | 'USD'
  context?: SavingContributionContext
  hidden: boolean
}

function getMonthlyTarget(
  kind: ContributionKind,
  currency: 'ARS' | 'USD',
  context?: SavingContributionContext,
) {
  if (kind === 'investment') {
    return currency === 'USD'
      ? context?.monthlyInvestmentTargetUsd
      : context?.monthlyInvestmentTargetArs
  }
  return currency === 'USD' ? context?.monthlyTargetUsd : context?.monthlyTargetArs
}

export function SavingContributionTarget({
  kind,
  currency,
  context,
  hidden,
}: SavingContributionTargetProps) {
  if (hidden) return null
  const target = getMonthlyTarget(kind, currency, context)
  if (!target) return null
  const action = kind === 'investment' ? 'invertir' : 'ahorrar'
  const noun = kind === 'investment' ? 'inversión' : 'ahorro'
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--foam)]/60 px-4 py-3 text-sm text-[var(--sea-ink)]">
      {Number(target.amount) > 0 ? (
        <>Necesitás {action} <span className="font-bold">{formatMoney(target)}</span> este mes para cumplir con tus objetivos.</>
      ) : (
        <span className="font-semibold text-[var(--sea-ink)]">
          ¡Ya cubriste tu meta de {noun} planificada para este mes!
        </span>
      )}
    </div>
  )
}

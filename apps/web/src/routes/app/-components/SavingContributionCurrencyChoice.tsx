import type { ContributionKind } from '../../../features/contributions/saving-contribution'

interface SavingContributionCurrencyChoiceProps {
  kind: ContributionKind
  currency: 'ARS' | 'USD'
  disabled: boolean
  onChange: (currency: 'ARS' | 'USD') => void
}

export function SavingContributionCurrencyChoice({
  kind,
  currency,
  disabled,
  onChange,
}: SavingContributionCurrencyChoiceProps) {
  const verb = kind === 'investment' ? 'Invertí' : 'Ahorré'
  return (
    <div
      role="group"
      aria-label={`Moneda del ${kind === 'investment' ? 'inversión' : 'ahorro'}`}
      className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] p-1"
    >
      {(['ARS', 'USD'] as const).map((option) => (
        <button
          key={option}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option)}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
            currency === option
              ? 'bg-[var(--surface)] text-[var(--sea-ink)] shadow-sm'
              : 'text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]'
          } ${disabled ? 'cursor-not-allowed opacity-75' : ''}`}
        >
          {verb} {option}
        </button>
      ))}
    </div>
  )
}

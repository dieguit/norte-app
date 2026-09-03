import { PiggyBank, TrendingUp } from 'lucide-react'
import type { ContributionKind } from '../../../features/contributions/saving-contribution'

interface ContributionActionChoicesProps {
  onSelect: (action: { kind: ContributionKind; currency: 'ARS' | 'USD' }) => void
}

function ContributionActionButton({
  kind,
  currency,
  description,
  accent,
  onSelect,
}: {
  kind: ContributionKind
  currency: 'ARS' | 'USD'
  description: string
  accent: 'palm' | 'lagoon-deep'
  onSelect: ContributionActionChoicesProps['onSelect']
}) {
  const label = `${kind === 'investment' ? 'Invertí' : 'Ahorré'} ${currency}`
  const hoverBorder = accent === 'palm' ? 'hover:border-[var(--palm)]' : 'hover:border-[var(--lagoon-deep)]'
  return (
    <button type="button" aria-label={label} onClick={() => onSelect({ kind, currency })} className={`flex flex-col gap-1.5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 text-left shadow-sm transition-all ${hoverBorder} hover:shadow-md active:scale-[0.98]`}>
      <span className="text-base font-bold text-[var(--sea-ink)]">{label}</span>
      <span className="text-xs text-[var(--sea-ink-soft)]">{description}</span>
    </button>
  )
}

function ContributionActionGroup({
  kind,
  title,
  icon,
  descriptions,
  accent,
  onSelect,
}: {
  kind: ContributionKind
  title: string
  icon: 'saving' | 'investment'
  descriptions: [string, string]
  accent: 'palm' | 'lagoon-deep'
  onSelect: ContributionActionChoicesProps['onSelect']
}) {
  const Icon = icon === 'saving' ? PiggyBank : TrendingUp
  const accentText = accent === 'palm' ? 'text-[var(--palm)]' : 'text-[var(--lagoon-deep)]'
  return (
    <div className="flex flex-col gap-3">
      <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${accentText}`}>
        <Icon className={`size-4 ${accentText}`} />
        <span>{title}</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ContributionActionButton kind={kind} currency="ARS" description={descriptions[0]} accent={accent} onSelect={onSelect} />
        <ContributionActionButton kind={kind} currency="USD" description={descriptions[1]} accent={accent} onSelect={onSelect} />
      </div>
    </div>
  )
}

export function ContributionActionChoices({ onSelect }: ContributionActionChoicesProps) {
  return (
    <div className="flex flex-col gap-6">
      <ContributionActionGroup kind="saving" title="Ahorro" icon="saving" accent="palm" descriptions={['Ahorro guardado en pesos argentinos', 'Compra o ahorro en dólares']} onSelect={onSelect} />
      <ContributionActionGroup kind="investment" title="Inversión" icon="investment" accent="lagoon-deep" descriptions={['Aporte a inversiones en pesos (CEDEARs, FCI)', 'Aporte a inversiones en dólares']} onSelect={onSelect} />
    </div>
  )
}

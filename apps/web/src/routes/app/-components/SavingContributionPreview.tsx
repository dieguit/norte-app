import type { SavingContributionPreviewResult } from '../../../features/contributions/saving-contribution'
import { formatPercentage, formatMoney } from '../../../lib/format'

interface SavingContributionPreviewProps {
  actionNoun: string
  preview: SavingContributionPreviewResult | null
}

function ContributionAllocationSection({ actionNoun, preview }: SavingContributionPreviewProps) {
  if (!preview || preview.preview.allocations.length === 0) return null
  return (
    <section aria-label={`Distribución de la ${actionNoun}`} className="flex flex-col gap-3">
      <h3 className="text-base font-semibold text-foreground">Así se distribuye tu {actionNoun}</h3>
      <div className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card px-4 py-2 shadow-sm">
        {preview.preview.allocations.map((allocation) => (
          <div key={allocation.goalId} className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-semibold text-foreground">{allocation.goalName}</span>
              <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">{formatPercentage(allocation.percentage)}</span>
            </div>
            <span className="text-sm font-bold text-foreground">{formatMoney(allocation.amount)}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function ContributionImpactSection({ preview }: Pick<SavingContributionPreviewProps, 'preview'>) {
  if (!preview || preview.preview.allocations.length === 0) return null
  return (
    <section aria-label="Impacto en objetivos" className="flex flex-col gap-3">
      <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Impacto en tus objetivos</h4>
      <div className="flex flex-col gap-3">
        {preview.preview.allocations.map((allocation) => <ContributionImpactRow key={allocation.goalId} allocation={allocation} />)}
      </div>
    </section>
  )
}

function ContributionImpactRow({ allocation }: { allocation: SavingContributionPreviewResult['preview']['allocations'][number] }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-muted/20 p-4">
      <span className="text-sm font-semibold text-foreground">{allocation.goalName}</span>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <ContributionImpactCell label="Antes" progress={allocation.progressBefore} />
        <ContributionImpactCell label="Con este aporte" progress={allocation.progressAfter} emphasis />
      </div>
    </div>
  )
}

function ContributionImpactCell({ label, progress, emphasis = false }: { label: string; progress?: string; emphasis?: boolean }) {
  const progressClass = emphasis ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'
  return (
    <div className={`flex flex-col gap-1 rounded-lg border border-border p-2.5 ${emphasis ? 'bg-muted/60' : 'bg-card'}`}>
      <span className={`text-xs font-semibold uppercase tracking-wider ${emphasis ? 'text-positive' : 'text-muted-foreground'}`}>{label}</span>
      {progress !== undefined && <span className={`text-xs ${progressClass}`}>Progreso: {formatPercentage(progress)}</span>}
    </div>
  )
}

export function SavingContributionPreview({ actionNoun, preview }: SavingContributionPreviewProps) {
  if (!preview || preview.preview.allocations.length === 0) return null
  return (
    <div className="flex flex-col gap-6">
      <ContributionAllocationSection actionNoun={actionNoun} preview={preview} />
      <ContributionImpactSection preview={preview} />
    </div>
  )
}

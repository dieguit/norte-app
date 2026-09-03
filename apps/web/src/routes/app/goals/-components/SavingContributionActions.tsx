import { useState } from 'react'
import type { ContributionSummary } from '../../../../features/goals/goals'
import { ContributionEditSheet, ContributionHistoryItem } from './SavingContributionActionsParts'
import { useContributionDeletion } from './useContributionDeletion'

export interface SavingContributionActionsProps {
  goalId: string
  contributions: ContributionSummary[]
  readOnly?: boolean
}

export function SavingContributionActions({ goalId: _goalId, contributions, readOnly = false }: SavingContributionActionsProps) {
  const [editingContribution, setEditingContribution] = useState<ContributionSummary | null>(null)
  const { deletingContributionId, setDeletingContributionId, isDeleting, deleteContribution } = useContributionDeletion()

  if (!contributions || contributions.length === 0) return null

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-[var(--line)] pt-3">
      <h5 className="text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)]">Historial de aportes</h5>
      <ul className="flex flex-col divide-y divide-[var(--line)] rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-1 shadow-sm">
        {contributions.map((item) => (
          <ContributionHistoryItem
            key={item.id}
            item={item}
            readOnly={readOnly}
            deleting={deletingContributionId === item.id}
            isDeleting={isDeleting}
            onEdit={() => setEditingContribution(item)}
            onDeleteOpen={(open) => setDeletingContributionId(open ? item.id : null)}
            onDelete={() => deleteContribution(item)}
          />
        ))}
      </ul>
      {editingContribution && <ContributionEditSheet item={editingContribution} onClose={() => setEditingContribution(null)} />}
    </div>
  )
}

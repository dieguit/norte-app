import { useState } from 'react'
import type { ContributionSummary } from '../../../../features/goals/goals'
import { ContributionEditSheet, ContributionHistoryItem } from './SavingContributionActionsParts'
import { useContributionDeletion } from './useContributionDeletion'

export interface SavingContributionActionsProps {
  goalId: string
  contributions: ContributionSummary[]
  readOnly?: boolean
}

export function SavingContributionActions({ contributions, readOnly = false }: SavingContributionActionsProps) {
  const [editingContribution, setEditingContribution] = useState<ContributionSummary | null>(null)
  const { deletingContributionId, setDeletingContributionId, isDeleting, deleteContribution } = useContributionDeletion()

  if (contributions.length === 0) return null

  return (
    <>
      <ul className="m-0 flex list-none flex-col p-0">
        {contributions.map((item) => (
          <ContributionHistoryItem
            key={item.id}
            item={item}
            readOnly={readOnly}
            menuOpen={deletingContributionId === item.id}
            isDeleting={isDeleting}
            onEdit={() => setEditingContribution(item)}
            onMenuOpenChange={(open) => setDeletingContributionId(open ? item.id : null)}
            onDelete={() => deleteContribution(item)}
          />
        ))}
      </ul>
      {editingContribution && <ContributionEditSheet item={editingContribution} onClose={() => setEditingContribution(null)} />}
    </>
  )
}

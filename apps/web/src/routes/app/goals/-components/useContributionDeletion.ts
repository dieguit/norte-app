import { useState } from 'react'
import { usePostHog } from '@posthog/react'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { deleteSavingContribution } from '../../../../features/contributions/saving-contribution.functions'
import type { ContributionSummary } from '../../../../features/goals/goals'

export function useContributionDeletion() {
  const router = useRouter()
  const posthog = usePostHog()
  const [deletingContributionId, setDeletingContributionId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  async function deleteContribution(contribution: ContributionSummary) {
    setIsDeleting(true)
    try {
      await deleteSavingContribution({ data: { contributionId: contribution.id } })
      posthog?.capture('contribution_deleted', { kind: contribution.kind, currency: contribution.currency })
      await router.invalidate()
      toast.success(contribution.kind === 'investment' ? 'Inversión eliminada.' : 'Ahorro eliminado.')
      setDeletingContributionId(null)
    } catch (error: any) {
      toast.error(error?.message ?? (contribution.kind === 'investment' ? 'Ocurrió un error al eliminar la inversión.' : 'Ocurrió un error al eliminar el ahorro.'))
    } finally {
      setIsDeleting(false)
    }
  }

  return { deletingContributionId, setDeletingContributionId, isDeleting, deleteContribution }
}

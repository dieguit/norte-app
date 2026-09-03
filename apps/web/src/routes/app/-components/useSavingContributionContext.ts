import { useCallback } from 'react'
import { useSheetLoader } from '../../../components/SheetLoadingState'
import { getSavingContributionContext } from '../../../features/contributions/saving-contribution.functions'

interface UseSavingContributionContextOptions {
  open: boolean
  missingProfileMessage: string
}

export function useSavingContributionContext({ open, missingProfileMessage }: UseSavingContributionContextOptions) {
  const load = useCallback(async () => {
    const result = await getSavingContributionContext()
    if (result.profile === 'missing') throw new Error(missingProfileMessage)
    return result.context
  }, [missingProfileMessage])
  const state = useSheetLoader({ open, load })
  return { context: state.data, loading: state.loading, error: state.error, fetchContext: state.retry }
}

import { SavingContributionView } from './SavingContributionView'
import { useSavingContributionController } from './useSavingContributionController'
import type { SavingContributionProps } from './saving-contribution-types'

export type { SavingContributionProps } from './saving-contribution-types'

export function SavingContribution(props: SavingContributionProps) {
  return <SavingContributionView {...useSavingContributionController(props)} />
}

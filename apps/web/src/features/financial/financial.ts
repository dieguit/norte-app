import type { CurrencyCode, Money } from '../../lib/money'
import type { PreviousMonthShortfall } from '../contributions/saving-contribution'

export {
  PLANNING_ARS_PER_USD,
  getArsEquivalent,
  getPreviousCalendarMonth,
} from '@repo/finance-utils'

export type FundingMethod = 'save' | 'invest'

export interface InitialHomeState {
  income: Money
  expensesKnowledge: 'known' | 'unknown'
  expenses?: Money
  plan: {
    fundingMethod: FundingMethod
    destinationCurrency: CurrencyCode
    monthlyCommitment: Money
    destinationAmount: Money
    effectiveMonth: string
    allocationPercentage: string
  }
  goal: {
    type: string
    name: string
    targetAmount?: Money
    currentAmount: Money
    emergencyFundMonths?: number
  }
  previousMonthShortfalls: PreviousMonthShortfall[]
}

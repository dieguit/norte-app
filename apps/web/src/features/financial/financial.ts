import BigNumber from 'bignumber.js'
import {
  type CurrencyCode,
  type Money,
  createMoney,
  parseMoneyInput,
} from '../../lib/money'
import type { PreviousMonthShortfall } from '../contributions/saving-contribution'

export const PLANNING_ARS_PER_USD = '1500'
export const PROJECTION_HORIZON_MONTHS = 720

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

export function getNextCalendarMonth(now: Date): string {
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() + 1
  const next = new Date(Date.UTC(year, month, 1))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`
}

export function getPreviousCalendarMonth(now: Date = new Date()): string {
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() - 1
  const prev = new Date(Date.UTC(year, month, 1))
  return `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}`
}

export function convertCommitmentToDestination(
  commitment: Money,
  destinationCurrency: CurrencyCode,
): Money {
  if (commitment.currency === destinationCurrency) return commitment
  if (commitment.currency !== 'ARS' || destinationCurrency !== 'USD') {
    throw new Error('Unsupported planning-rate conversion.')
  }
  return createMoney(
    new BigNumber(commitment.amount).dividedBy(PLANNING_ARS_PER_USD),
    'USD',
  )
}

export function deriveEmergencyFundTarget(expenses: Money, months: number): Money {
  if (expenses.currency !== 'ARS') throw new Error('Emergency expenses must use ARS.')
  return createMoney(
    new BigNumber(expenses.amount).times(months).dividedBy(PLANNING_ARS_PER_USD),
    'USD',
  )
}

export function getArsEquivalent(amount: string, currency: CurrencyCode) {
  if (currency !== 'USD') return null
  const parsed = parseMoneyInput(amount, 'USD')
  if (!parsed || !new BigNumber(parsed.amount).isGreaterThan(0)) return null
  return new BigNumber(parsed.amount).times(PLANNING_ARS_PER_USD)
}

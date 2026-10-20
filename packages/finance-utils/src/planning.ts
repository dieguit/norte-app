import BigNumber from 'bignumber.js'
import {
  type CurrencyCode,
  type Money,
  createMoney,
  parseMoneyInput,
} from './money'

export const PLANNING_ARS_PER_USD = '1500'
export const PROJECTION_HORIZON_MONTHS = 720

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

export function getArsEquivalent(amount: string, currency: CurrencyCode): BigNumber | null {
  if (currency !== 'USD') return null
  const parsed = parseMoneyInput(amount, 'USD')
  if (!parsed || !new BigNumber(parsed.amount).isGreaterThan(0)) return null
  return new BigNumber(parsed.amount).times(PLANNING_ARS_PER_USD)
}

import BigNumber from 'bignumber.js'
import { createMoney, type Money } from '../../lib/money'
import { PLANNING_ARS_PER_USD } from './financial'

export const FIXED_INCOME_SOURCES = {
  salary: 'Sueldo',
  independent: 'Trabajo independiente',
  pension: 'Jubilación o pensión',
  rent: 'Alquileres',
  investments: 'Inversiones',
  family_support: 'Ayuda familiar',
} as const

export type FixedIncomeSourceKind = keyof typeof FIXED_INCOME_SOURCES

export interface IncomeMonthInput {
  amount: Money
  recurring: boolean
  effectiveMonth: string
}

export interface IncomesWorkspace {
  sources: Array<{ id: string; name: string; normalizedName: string }>
  incomes: Array<{
    id: string
    sourceKind: string
    sourceId: string | null
    sourceName: string
    amount: string
    currency: 'ARS' | 'USD'
    recurring: boolean
    effectiveMonth: string
  }>
}

export function isIncomeIncludedInMonth(
  income: Pick<IncomeMonthInput, 'recurring' | 'effectiveMonth'>,
  month: string,
) {
  const effectiveMonth = income.effectiveMonth.slice(0, 7)
  return income.recurring ? effectiveMonth <= month : effectiveMonth === month
}

export function getIncomeTotalArs(incomes: IncomeMonthInput[], month: string): Money {
  const total = incomes.reduce((sum, income) => {
    if (!isIncomeIncludedInMonth(income, month)) return sum
    return sum.plus(
      income.amount.currency === 'USD'
        ? new BigNumber(income.amount.amount).times(PLANNING_ARS_PER_USD)
        : income.amount.amount,
    )
  }, new BigNumber(0))

  return createMoney(total, 'ARS')
}

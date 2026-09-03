import BigNumber from 'bignumber.js'
import { createMoney, type Money } from '../../lib/money'
import { PLANNING_ARS_PER_USD } from './financial'

export const RECURRING_INCOME_SOURCES = {
  salary: 'Sueldo',
  independent: 'Trabajo independiente',
  pension: 'Jubilación o pensión',
  rent: 'Alquileres',
  investments: 'Inversiones',
  family_support: 'Ayuda familiar',
} as const

export const ONE_TIME_INCOME_SOURCES = {
  asset_sale: 'Venta de bienes / usados',
  bonus: 'Bono / aguinaldo / premio',
  occasional_work: 'Trabajo ocasional / changa',
  gift_inheritance: 'Regalo / herencia',
  refund: 'Reintegro / devolución',
  extraordinary_income: 'Rescate o cobro extraordinario',
} as const

export const FIXED_INCOME_SOURCES = {
  ...RECURRING_INCOME_SOURCES,
  ...ONE_TIME_INCOME_SOURCES,
} as const

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
    concept: string | null
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

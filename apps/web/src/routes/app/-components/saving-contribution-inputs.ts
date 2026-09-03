import BigNumber from 'bignumber.js'
import { formatMoneyInput } from '../../../lib/money'
import { deriveUsdPurchase } from '../../../features/contributions/saving-contribution'

export type DerivedContributionField = 'arsSpent' | 'effectiveRate' | 'amount' | null

export interface UsdContributionInputState {
  amount: string
  arsSpent: string
  effectiveRate: string
  derivedField: DerivedContributionField
}

type UsdInputField = Exclude<keyof UsdContributionInputState, 'derivedField'>
type Derivation = { field: Exclude<UsdInputField, never>; value: string }

export function formatDerivedMoney(value: string): string {
  if (!value.trim()) return ''
  const number = new BigNumber(value)
  if (!number.isFinite() || number.isNaN()) return ''
  const formatted = number.toFixed(2, BigNumber.ROUND_HALF_UP)
  const [integer, decimal] = formatted.split('.')
  const formattedInteger = new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 0,
  }).format(BigInt(integer))
  return decimal && decimal !== '00'
    ? `${formattedInteger},${decimal.replace(/0+$/, '')}`
    : formattedInteger
}

type UsdDerivation = {
  target: UsdInputField
  input: Parameters<typeof deriveUsdPurchase>[0]
}

function createUsdDerivation(
  target: UsdInputField,
  input: UsdDerivation['input'],
  hasValues: boolean,
): UsdDerivation | null {
  return hasValues ? { target, input } : null
}

function getAmountDerivation(value: string, state: UsdContributionInputState) {
  if (state.derivedField === 'arsSpent' || !state.arsSpent) {
    return createUsdDerivation('arsSpent', { usdAmount: value, effectiveRate: state.effectiveRate }, Boolean(value && state.effectiveRate))
  }
  if (state.derivedField === 'effectiveRate' || !state.effectiveRate) {
    return createUsdDerivation('effectiveRate', { usdAmount: value, arsSpent: state.arsSpent }, Boolean(value && state.arsSpent))
  }
  return null
}

function getArsSpentDerivation(value: string, state: UsdContributionInputState) {
  if (state.derivedField === 'effectiveRate' || !state.effectiveRate) {
    return createUsdDerivation('effectiveRate', { usdAmount: state.amount, arsSpent: value }, Boolean(state.amount && value))
  }
  if (state.derivedField === 'amount' || !state.amount) {
    return createUsdDerivation('amount', { arsSpent: value, effectiveRate: state.effectiveRate }, Boolean(state.effectiveRate && value))
  }
  return null
}

function getRateDerivation(value: string, state: UsdContributionInputState) {
  if (state.derivedField === 'arsSpent' || !state.arsSpent) {
    return createUsdDerivation('arsSpent', { usdAmount: state.amount, effectiveRate: value }, Boolean(state.amount && value))
  }
  if (state.derivedField === 'amount' || !state.amount) {
    return createUsdDerivation('amount', { arsSpent: state.arsSpent, effectiveRate: value }, Boolean(state.arsSpent && value))
  }
  return null
}

function getUsdDerivation(field: UsdInputField, value: string, state: UsdContributionInputState): UsdDerivation | null {
  if (field === 'amount') return getAmountDerivation(value, state)
  if (field === 'arsSpent') return getArsSpentDerivation(value, state)
  return getRateDerivation(value, state)
}

function deriveValue(
  derivation: ReturnType<typeof getUsdDerivation>,
): Derivation | null {
  if (!derivation) return null
  try {
    const result = deriveUsdPurchase(derivation.input)
    const value =
      derivation.target === 'amount' ? result.usdAmount : result[derivation.target]
    return value ? { field: derivation.target, value: formatDerivedMoney(value) } : null
  } catch {
    return null
  }
}

export function resolveUsdInputChange(
  field: UsdInputField,
  raw: string,
  state: UsdContributionInputState,
): Partial<UsdContributionInputState> {
  const value = formatMoneyInput(raw)
  if (field === 'arsSpent' && !value) return { arsSpent: value, derivedField: null }
  if (field === 'effectiveRate' && !value) return { effectiveRate: value, derivedField: 'effectiveRate' }

  const change = { [field]: value } as Partial<UsdContributionInputState>
  const derived = deriveValue(getUsdDerivation(field, value, state))
  return derived ? { ...change, [derived.field]: derived.value, derivedField: derived.field } : change
}

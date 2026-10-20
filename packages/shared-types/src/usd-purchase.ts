import BigNumber from 'bignumber.js'

export interface UsdPurchaseInput {
  usdAmount?: string | null
  arsSpent?: string | null
  effectiveRate?: string | null
}

export interface UsdPurchaseDerivation {
  usdAmount?: string
  arsSpent?: string
  effectiveRate?: string
}

type ParsedUsdValue = { value: BigNumber | null; provided: boolean }

function normalizeDotSeparatedNumber(value: string): string {
  const parts = value.split('.')
  return parts.length > 2 || (parts.length === 2 && parts[1].length === 3)
    ? value.replace(/\./g, '')
    : value
}

function normalizeNumericText(value?: string | null): string | null {
  if (value === undefined || value === null) return null
  const clean = String(value).replace(/[$]|US[$]|USD|ARS|\s/gi, '').trim()
  if (!clean) return null
  return normalizeNumericSeparators(clean)
}

function hasCommaAndDot(value: string): boolean {
  return value.includes(',') && value.includes('.')
}

function normalizeNumericSeparators(value: string): string {
  if (hasCommaAndDot(value)) return value.replace(/\./g, '').replace(',', '.')
  if (value.includes(',')) return value.replace(',', '.')
  return normalizeDotSeparatedNumber(value)
}

function isFiniteNumber(value: BigNumber): boolean {
  return value.isFinite() && !value.isNaN()
}

function parseNumericValue(value?: string | null): BigNumber | null {
  const normalized = normalizeNumericText(value)
  if (!normalized) return null
  try {
    const parsed = new BigNumber(normalized)
    return isFiniteNumber(parsed) ? parsed : null
  } catch {
    return null
  }
}

function isValueProvided(value?: string | null): boolean {
  return value !== undefined && value !== null && String(value).trim() !== ''
}

function parseUsdPurchaseValues(input: UsdPurchaseInput) {
  const values = [input.usdAmount, input.arsSpent, input.effectiveRate]
  const parsed = values.map((value): ParsedUsdValue => ({
    value: parseNumericValue(value),
    provided: isValueProvided(value),
  }))
  return {
    usd: parsed[0],
    ars: parsed[1],
    rate: parsed[2],
    providedCount: parsed.filter(({ provided }) => provided).length,
  }
}

function validateUsdPurchaseValues(values: ReturnType<typeof parseUsdPurchaseValues>): void {
  for (const item of [values.usd, values.ars, values.rate]) {
    if (item.provided && !item.value?.isGreaterThan(0)) {
      throw new Error('USD purchase values must be positive')
    }
  }
}

function hasUsdPurchasePair(first: ParsedUsdValue, second: ParsedUsdValue): boolean {
  return first.provided && second.provided && !!first.value && !!second.value
}

function deriveUsdRate(usd: BigNumber, ars: BigNumber): UsdPurchaseDerivation {
  return { effectiveRate: ars.dividedBy(usd).toFixed(2, BigNumber.ROUND_HALF_UP) }
}

function deriveArsSpent(usd: BigNumber, rate: BigNumber): UsdPurchaseDerivation {
  return { arsSpent: usd.times(rate).toFixed(2, BigNumber.ROUND_HALF_UP) }
}

function deriveUsdAmount(ars: BigNumber, rate: BigNumber): UsdPurchaseDerivation {
  return { usdAmount: ars.dividedBy(rate).toFixed(2, BigNumber.ROUND_HALF_UP) }
}

function deriveTwoUsdPurchaseValues(values: ReturnType<typeof parseUsdPurchaseValues>): UsdPurchaseDerivation | null {
  const { usd, ars, rate } = values
  if (hasUsdPurchasePair(usd, ars)) return deriveUsdRate(usd.value!, ars.value!)
  if (hasUsdPurchasePair(usd, rate)) return deriveArsSpent(usd.value!, rate.value!)
  if (hasUsdPurchasePair(ars, rate)) return deriveUsdAmount(ars.value!, rate.value!)
  return null
}

function hasIncoherentUsdPurchase(ars: BigNumber, expectedArs: BigNumber): boolean {
  const roundedExpected = expectedArs.toFixed(2, BigNumber.ROUND_HALF_UP)
  const roundedActual = ars.toFixed(2, BigNumber.ROUND_HALF_UP)
  return roundedExpected !== roundedActual
}

function normalizeCompleteUsdPurchase(values: ReturnType<typeof parseUsdPurchaseValues>): UsdPurchaseDerivation {
  const { usd, ars, rate } = values
  const [usdValue, arsValue, rateValue] = requireCompleteUsdPurchaseValues(usd.value, ars.value, rate.value)
  const expectedArs = usdValue.times(rateValue)
  if (hasIncoherentUsdPurchase(arsValue, expectedArs)) {
    throw new Error('USD purchase values are incoherent')
  }
  return {
    usdAmount: usdValue.toFixed(2, BigNumber.ROUND_HALF_UP),
    arsSpent: arsValue.toFixed(2, BigNumber.ROUND_HALF_UP),
    effectiveRate: rateValue.toFixed(2, BigNumber.ROUND_HALF_UP),
  }
}

function requireCompleteUsdPurchaseValues(
  usd: BigNumber | null,
  ars: BigNumber | null,
  rate: BigNumber | null,
): [BigNumber, BigNumber, BigNumber] {
  if (!usd) throw new Error('USD purchase derivation requires at least two positive values')
  if (!ars) throw new Error('USD purchase derivation requires at least two positive values')
  if (!rate) throw new Error('USD purchase derivation requires at least two positive values')
  return [usd, ars, rate]
}

export function deriveUsdPurchase(input: UsdPurchaseInput): UsdPurchaseDerivation {
  const values = parseUsdPurchaseValues(input)
  validateUsdPurchaseValues(values)
  if (values.providedCount < 2) {
    throw new Error('USD purchase derivation requires at least two positive values')
  }
  if (values.providedCount === 2) {
    return deriveTwoUsdPurchaseValues(values) ?? {
      ...normalizeCompleteUsdPurchase(values),
    }
  }
  return normalizeCompleteUsdPurchase(values)
}

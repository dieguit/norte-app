import BigNumber from 'bignumber.js'
import type { SavingContribution } from '@/db/schema'
import type { SavingsPlaceTransfer } from '@/db/schema'

export type CurrencyCode = 'ARS' | 'USD'

export interface SavingsPlaceSummary {
  id: string
  name: string
  balances: Record<CurrencyCode, string>
  hasMovements: boolean
}

export type SavingsMovement =
  | {
      kind: 'contribution'
      id: string
      placeId: string
      placeName: string
      amount: string
      currency: CurrencyCode
      createdAt: string
    }
  | {
      kind: 'transfer'
      id: string
      fromPlaceId: string
      fromPlaceName: string
      toPlaceId: string
      toPlaceName: string
      amount: string
      currency: CurrencyCode
      createdAt: string
    }

export interface SavingsPlacesWorkspace {
  places: SavingsPlaceSummary[]
  movements: SavingsMovement[]
}

export function normalizeSavingsPlaceName(name: string): string {
  return name.trim().toLocaleLowerCase('es-AR')
}

export function calculateSavingsPlacesWorkspace(input: {
  places: Array<{ id: string; name: string }>
  contributions: Pick<SavingContribution, 'id' | 'placeId' | 'amount' | 'currency' | 'createdAt'>[]
  transfers: (Pick<SavingsPlaceTransfer, 'id' | 'fromPlaceId' | 'toPlaceId' | 'amount' | 'currency' | 'createdAt'> & {
    fromPlaceName: string
    toPlaceName: string
  })[]
}): SavingsPlacesWorkspace {
  const { places, contributions, transfers } = input

  const placeMap = new Map(places.map((p) => [p.id, p.name]))

  const balances = new Map<string, Record<CurrencyCode, BigNumber>>()
  for (const place of places) {
    balances.set(place.id, { ARS: new BigNumber(0), USD: new BigNumber(0) })
  }

  for (const c of contributions) {
    const placeBalances = balances.get(c.placeId)
    if (placeBalances) {
      placeBalances[c.currency as CurrencyCode] = placeBalances[c.currency as CurrencyCode].plus(
        c.amount,
      )
    }
  }

  for (const t of transfers) {
    const fromBalances = balances.get(t.fromPlaceId)
    const toBalances = balances.get(t.toPlaceId)
    if (fromBalances) {
      fromBalances[t.currency as CurrencyCode] = fromBalances[t.currency as CurrencyCode].minus(
        t.amount,
      )
    }
    if (toBalances) {
      toBalances[t.currency as CurrencyCode] = toBalances[t.currency as CurrencyCode].plus(
        t.amount,
      )
    }
  }

  const placeSummaries: SavingsPlaceSummary[] = places
    .map((place) => {
      const placeBalances = balances.get(place.id)!
      return {
        id: place.id,
        name: place.name,
        balances: {
          ARS: placeBalances.ARS.toFixed(2),
          USD: placeBalances.USD.toFixed(2),
        },
        hasMovements: contributions.some((c) => c.placeId === place.id) ||
          transfers.some((t) => t.fromPlaceId === place.id || t.toPlaceId === place.id),
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'es-AR'))

  const contributionMovements: SavingsMovement[] = contributions.map((c) => ({
    kind: 'contribution' as const,
    id: c.id,
    placeId: c.placeId,
    placeName: placeMap.get(c.placeId) ?? '',
    amount: c.amount,
    currency: c.currency as CurrencyCode,
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : String(c.createdAt),
  }))

  const transferMovements: SavingsMovement[] = transfers.map((t) => ({
    kind: 'transfer' as const,
    id: t.id,
    fromPlaceId: t.fromPlaceId,
    fromPlaceName: t.fromPlaceName,
    toPlaceId: t.toPlaceId,
    toPlaceName: t.toPlaceName,
    amount: t.amount,
    currency: t.currency as CurrencyCode,
    createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : String(t.createdAt),
  }))

  const allMovements = [...contributionMovements, ...transferMovements]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 20)

  return {
    places: placeSummaries,
    movements: allMovements,
  }
}

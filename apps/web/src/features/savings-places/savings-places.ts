import BigNumber from 'bignumber.js'
import type { SavingContribution } from '@/db/schema'
import type { SavingsPlaceTransfer } from '@/db/schema'
import type { GoalCompletionWithdrawal } from '@/db/schema'
import type { CurrencyCode } from '../../lib/money'

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
      kind: 'completion'
      id: string
      goalId: string
      goalName: string
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

export function getSavingsPlaceEntries(
  movements: SavingsMovement[],
  placeId: string,
): SavingsMovement[] {
  return movements
    .filter((movement) =>
      movement.kind === 'contribution' || movement.kind === 'completion'
        ? movement.placeId === placeId
        : movement.toPlaceId === placeId,
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 20)
}

type SavingsPlacesInput = {
  places: Array<{ id: string; name: string }>
  contributions: Pick<SavingContribution, 'id' | 'placeId' | 'amount' | 'currency' | 'createdAt'>[]
  transfers: (Pick<SavingsPlaceTransfer, 'id' | 'fromPlaceId' | 'toPlaceId' | 'amount' | 'currency' | 'createdAt'> & {
    fromPlaceName: string
    toPlaceName: string
  })[]
  completionWithdrawals?: (Pick<GoalCompletionWithdrawal, 'id' | 'goalId' | 'placeId' | 'amount' | 'currency' | 'createdAt'> & {
    goalName: string
    placeName: string
  })[]
}

type Contribution = SavingsPlacesInput['contributions'][number]
type Transfer = SavingsPlacesInput['transfers'][number]
type CompletionWithdrawal = NonNullable<SavingsPlacesInput['completionWithdrawals']>[number]
type PlaceBalances = Record<CurrencyCode, BigNumber>

function createPlaceBalances(places: SavingsPlacesInput['places']) {
  const balances = new Map<string, PlaceBalances>()
  for (const place of places) {
    balances.set(place.id, { ARS: new BigNumber(0), USD: new BigNumber(0) })
  }
  return balances
}

function applyContributions(
  balances: Map<string, PlaceBalances>,
  contributions: Contribution[],
) {
  for (const contribution of contributions) {
    const placeBalances = balances.get(contribution.placeId)
    if (placeBalances) {
      const currency = contribution.currency as CurrencyCode
      placeBalances[currency] = placeBalances[currency].plus(contribution.amount)
    }
  }
}

function applyTransfers(balances: Map<string, PlaceBalances>, transfers: Transfer[]) {
  for (const transfer of transfers) {
    const fromBalances = balances.get(transfer.fromPlaceId)
    const toBalances = balances.get(transfer.toPlaceId)
    const currency = transfer.currency as CurrencyCode
    if (fromBalances) fromBalances[currency] = fromBalances[currency].minus(transfer.amount)
    if (toBalances) toBalances[currency] = toBalances[currency].plus(transfer.amount)
  }
}

function applyCompletionWithdrawals(
  balances: Map<string, PlaceBalances>,
  withdrawals: CompletionWithdrawal[],
) {
  for (const withdrawal of withdrawals) {
    const placeBalances = balances.get(withdrawal.placeId)
    if (placeBalances) {
      const currency = withdrawal.currency as CurrencyCode
      placeBalances[currency] = placeBalances[currency].minus(withdrawal.amount)
    }
  }
}

function buildPlaceSummaries(
  places: SavingsPlacesInput['places'],
  balances: Map<string, PlaceBalances>,
  contributions: Contribution[],
  transfers: Transfer[],
  withdrawals: CompletionWithdrawal[],
) {
  return places
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
          transfers.some((t) => t.fromPlaceId === place.id || t.toPlaceId === place.id) ||
          withdrawals.some((withdrawal) => withdrawal.placeId === place.id),
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'es-AR'))
}

function toMovementTimestamp(createdAt: Date | unknown) {
  return createdAt instanceof Date ? createdAt.toISOString() : String(createdAt)
}

function buildContributionMovements(
  contributions: Contribution[],
  placeMap: Map<string, string>,
): SavingsMovement[] {
  return contributions.map((contribution) => ({
    kind: 'contribution' as const,
    id: contribution.id,
    placeId: contribution.placeId,
    placeName: placeMap.get(contribution.placeId) ?? '',
    amount: contribution.amount,
    currency: contribution.currency as CurrencyCode,
    createdAt: toMovementTimestamp(contribution.createdAt),
  }))
}

function buildTransferMovements(transfers: Transfer[]): SavingsMovement[] {
  return transfers.map((transfer) => ({
    kind: 'transfer' as const,
    id: transfer.id,
    fromPlaceId: transfer.fromPlaceId,
    fromPlaceName: transfer.fromPlaceName,
    toPlaceId: transfer.toPlaceId,
    toPlaceName: transfer.toPlaceName,
    amount: transfer.amount,
    currency: transfer.currency as CurrencyCode,
    createdAt: toMovementTimestamp(transfer.createdAt),
  }))
}

function buildCompletionMovements(withdrawals: CompletionWithdrawal[]): SavingsMovement[] {
  return withdrawals.map((withdrawal) => ({
    kind: 'completion' as const,
    id: withdrawal.id,
    goalId: withdrawal.goalId,
    goalName: withdrawal.goalName,
    placeId: withdrawal.placeId,
    placeName: withdrawal.placeName,
    amount: withdrawal.amount,
    currency: withdrawal.currency as CurrencyCode,
    createdAt: toMovementTimestamp(withdrawal.createdAt),
  }))
}

export function calculateSavingsPlacesWorkspace(input: SavingsPlacesInput): SavingsPlacesWorkspace {
  const { places, contributions, transfers, completionWithdrawals = [] } = input

  const placeMap = new Map(places.map((p) => [p.id, p.name]))
  const balances = createPlaceBalances(places)
  applyContributions(balances, contributions)
  applyTransfers(balances, transfers)
  applyCompletionWithdrawals(balances, completionWithdrawals)

  const allMovements = [
    ...buildContributionMovements(contributions, placeMap),
    ...buildTransferMovements(transfers),
    ...buildCompletionMovements(completionWithdrawals),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return {
    places: buildPlaceSummaries(places, balances, contributions, transfers, completionWithdrawals),
    movements: allMovements,
  }
}

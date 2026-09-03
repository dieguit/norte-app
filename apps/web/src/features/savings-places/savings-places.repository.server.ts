import '@tanstack/react-start/server-only'
import { and, eq } from 'drizzle-orm'
import BigNumber from 'bignumber.js'
import { db } from '../../db/client'
import { savingsPlaceTransfers, savingsPlaces } from '../../db/schema'
import { normalizeSavingsPlaceName, calculateSavingsPlacesWorkspace } from './savings-places'
import type { SavingsPlacesWorkspace } from './savings-places'
import type { SavingsPlaceSelection } from './savings-places.schema'

export async function lockOwnedSavingsPlaces(tx: any, userId: string, placeIds: string[]): Promise<void> {
  for (const placeId of placeIds) {
    const [place] = await tx
      .select()
      .from(savingsPlaces)
      .where(and(eq(savingsPlaces.id, placeId), eq(savingsPlaces.userId, userId)))
      .for('update')
    if (!place) throw new Error('Lugar de ahorro no encontrado.')
  }
}

async function findOwnedSavingsPlace(userId: string, placeId: string) {
  return db.query.savingsPlaces.findFirst({
    where: (table, { and, eq }) => and(eq(table.id, placeId), eq(table.userId, userId)),
  })
}

export async function getSavingsPlacesWorkspaceState(userId: string): Promise<SavingsPlacesWorkspace> {
  const places = await db.query.savingsPlaces.findMany({
    where: (table, { eq }) => eq(table.userId, userId),
  })
  const placeIds = places.map((place) => place.id)

  const [contributions, transfers, goals] = await Promise.all([
    db.query.savingContributions.findMany({ where: (table, { eq }) => eq(table.userId, userId) }),
    db.query.savingsPlaceTransfers.findMany({ where: (table, { eq }) => eq(table.userId, userId) }),
    db.query.financialGoals.findMany({ where: (table, { eq }) => eq(table.userId, userId) }),
  ])

  const placeMap = new Map(places.map((p) => [p.id, p.name]))
  const goalMap = new Map(goals.map((goal) => [goal.id, goal.name]))
  const goalIds = goals.map((goal) => goal.id)
  const completionWithdrawals =
    placeIds.length > 0 && goalIds.length > 0
      ? await db.query.goalCompletionWithdrawals.findMany({
          where: (table, { and, inArray }) =>
            and(inArray(table.placeId, placeIds), inArray(table.goalId, goalIds)),
        })
      : []

  const transfersWithNames = transfers.map((t) => ({
    ...t,
    fromPlaceName: placeMap.get(t.fromPlaceId) ?? '',
    toPlaceName: placeMap.get(t.toPlaceId) ?? '',
  }))

  const completionWithdrawalsWithNames = completionWithdrawals
    .filter((withdrawal) => goalMap.has(withdrawal.goalId) && placeMap.has(withdrawal.placeId))
    .map((withdrawal) => ({
      ...withdrawal,
      goalName: goalMap.get(withdrawal.goalId)!,
      placeName: placeMap.get(withdrawal.placeId)!,
    }))

  return calculateSavingsPlacesWorkspace({
    places,
    contributions,
    transfers: transfersWithNames,
    completionWithdrawals: completionWithdrawalsWithNames,
  })
}

export async function createSavingsPlaceInRepository(
  userId: string,
  name: string,
): Promise<{ placeId: string }> {
  const place = await findOrCreateSavingsPlace(db, userId, name)
  return { placeId: place.id }
}

async function findOrCreateSavingsPlace(executor: any, userId: string, name: string) {
  const trimmed = name.trim()
  const normalizedName = normalizeSavingsPlaceName(trimmed)

  await executor
    .insert(savingsPlaces)
    .values({ userId, name: trimmed, normalizedName })
    .onConflictDoNothing()

  const place = await executor.query.savingsPlaces.findFirst({
    where: (table: any, { and, eq }: any) =>
      and(eq(table.userId, userId), eq(table.normalizedName, normalizedName)),
  })
  if (!place) throw new Error('No se pudo crear el lugar de ahorro.')
  return { id: place.id, name: place.name }
}

export async function renameSavingsPlaceInRepository(
  userId: string,
  placeId: string,
  name: string,
): Promise<void> {
  const trimmed = name.trim()
  const normalizedName = normalizeSavingsPlaceName(trimmed)

  const existing = await findOwnedSavingsPlace(userId, placeId)
  if (!existing) throw new Error('Lugar de ahorro no encontrado.')

  const nameTaken = await db.query.savingsPlaces.findFirst({
    where: (table, { and, eq }) =>
      and(eq(table.userId, userId), eq(table.normalizedName, normalizedName)),
  })

  if (nameTaken && nameTaken.id !== placeId) {
    throw new Error('Ya tenés un lugar con ese nombre.')
  }

  await db.update(savingsPlaces).set({ name: trimmed, normalizedName }).where(
    and(eq(savingsPlaces.id, placeId), eq(savingsPlaces.userId, userId)),
  )
}

async function hasSavingsPlaceMovements(placeId: string) {
  const hasContributions = await db.query.savingContributions.findFirst({
    where: (table, { eq }) => eq(table.placeId, placeId),
  })
  if (hasContributions) return true

  const hasCompletionWithdrawals = await db.query.goalCompletionWithdrawals.findFirst({
    where: (table, { eq }) => eq(table.placeId, placeId),
  })
  if (hasCompletionWithdrawals) return true

  const hasTransfers = await db.query.savingsPlaceTransfers.findFirst({
    where: (table, { or, eq }) =>
      or(eq(table.fromPlaceId, placeId), eq(table.toPlaceId, placeId)),
  })
  return Boolean(hasTransfers)
}

export async function deleteSavingsPlaceInRepository(
  userId: string,
  placeId: string,
): Promise<void> {
  const existing = await findOwnedSavingsPlace(userId, placeId)
  if (!existing) throw new Error('Lugar de ahorro no encontrado.')

  if (await hasSavingsPlaceMovements(placeId)) {
    throw new Error('No podés eliminar un lugar que tiene movimientos.')
  }

  await db.delete(savingsPlaces).where(
    and(eq(savingsPlaces.id, placeId), eq(savingsPlaces.userId, userId)),
  )
}

export async function resolveSavingsPlaceWithExecutor(
  executor: any,
  userId: string,
  selection: SavingsPlaceSelection,
): Promise<{ id: string; name: string }> {
  if (selection.kind === 'existing') {
    const place = await executor.query.savingsPlaces.findFirst({
      where: (table: any, { and, eq }: any) =>
        and(eq(table.id, selection.placeId), eq(table.userId, userId)),
    })
    if (!place) throw new Error('Lugar de ahorro no encontrado.')
    return { id: place.id, name: place.name }
  }

  return findOrCreateSavingsPlace(executor, userId, selection.name)
}

async function getTransferMovementData(
  tx: any,
  userId: string,
  fromPlaceId: string,
  currency: 'ARS' | 'USD',
) {
  const contributions = await tx.query.savingContributions.findMany({
    where: (table: any, { eq }: any) => eq(table.userId, userId),
  })
  const outgoingTransfers = await tx.query.savingsPlaceTransfers.findMany({
    where: (table: any, { eq }: any) => eq(table.userId, userId),
  })
  const goals = await tx.query.financialGoals.findMany({
    where: (table: any, { eq }: any) => eq(table.userId, userId),
  })
  const goalIds = goals.map((goal: any) => goal.id)
  const ownedGoalIds = new Set<string>(goalIds)
  const completionWithdrawals = goalIds.length > 0
    ? await tx.query.goalCompletionWithdrawals.findMany({
        where: (table: any, { and, eq, inArray }: any) =>
          and(
            eq(table.placeId, fromPlaceId),
            eq(table.currency, currency),
            inArray(table.goalId, goalIds),
          ),
      })
    : []

  return { contributions, outgoingTransfers, ownedGoalIds, completionWithdrawals }
}

function calculateContributionBalance(
  fromPlaceId: string,
  currency: 'ARS' | 'USD',
  contributions: any[],
) {
  let balance = new BigNumber(0)
  for (const contribution of contributions) {
    if (contribution.placeId === fromPlaceId && contribution.currency === currency) {
      balance = balance.plus(contribution.amount)
    }
  }
  return balance
}

function calculateTransferBalance(
  fromPlaceId: string,
  currency: 'ARS' | 'USD',
  transfers: any[],
) {
  let balance = new BigNumber(0)
  for (const transfer of transfers) {
    if (transfer.currency !== currency) continue
    const incoming = Number(transfer.toPlaceId === fromPlaceId)
    const outgoing = Number(transfer.fromPlaceId === fromPlaceId)
    balance = balance.plus(new BigNumber(transfer.amount).times(incoming - outgoing))
  }
  return balance
}

function calculateWithdrawalBalance(
  ownedGoalIds: Set<string>,
  completionWithdrawals: any[],
) {
  let balance = new BigNumber(0)
  for (const withdrawal of completionWithdrawals) {
    if (ownedGoalIds.has(withdrawal.goalId)) {
      balance = balance.minus(withdrawal.amount)
    }
  }
  return balance
}

function calculateSourceBalance({
  fromPlaceId,
  currency,
  contributions,
  outgoingTransfers,
  ownedGoalIds,
  completionWithdrawals,
}: {
  fromPlaceId: string
  currency: 'ARS' | 'USD'
  contributions: any[]
  outgoingTransfers: any[]
  ownedGoalIds: Set<string>
  completionWithdrawals: any[]
}) {
  return calculateContributionBalance(fromPlaceId, currency, contributions)
    .plus(calculateTransferBalance(fromPlaceId, currency, outgoingTransfers))
    .plus(calculateWithdrawalBalance(ownedGoalIds, completionWithdrawals))
}

export async function transferSavingsInRepository(input: {
  userId: string
  fromPlaceId: string
  toPlaceId: string
  currency: 'ARS' | 'USD'
  amount: string
}): Promise<{ transferId: string }> {
  const { userId, fromPlaceId, toPlaceId, currency, amount } = input

  return db.transaction(async (tx) => {
    await lockOwnedSavingsPlaces(tx, userId, [fromPlaceId, toPlaceId].sort())

    const movementData = await getTransferMovementData(tx, userId, fromPlaceId, currency)
    const sourceBalance = calculateSourceBalance({ fromPlaceId, currency, ...movementData })
    const transferAmount = new BigNumber(amount)
    if (sourceBalance.isLessThan(transferAmount)) {
      throw new Error('No tenés saldo suficiente en ese lugar.')
    }

    const [transfer] = await tx
      .insert(savingsPlaceTransfers)
      .values({
        userId,
        fromPlaceId,
        toPlaceId,
        currency,
        amount: transferAmount.toFixed(2),
      })
      .returning({ id: savingsPlaceTransfers.id })

    return { transferId: transfer.id }
  })
}

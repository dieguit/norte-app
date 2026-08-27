import '@tanstack/react-start/server-only'
import { eq } from 'drizzle-orm'
import { db } from '../../db/client'
import { savingsPlaceTransfers, savingsPlaces } from '../../db/schema'
import { normalizeSavingsPlaceName, calculateSavingsPlacesWorkspace } from './savings-places'
import type { SavingsPlacesWorkspace } from './savings-places'
import type { SavingsPlaceSelection } from './savings-places.schema'

export async function getSavingsPlacesWorkspaceState(userId: string): Promise<SavingsPlacesWorkspace> {
  const [places, contributions, transfers] = await Promise.all([
    db.query.savingsPlaces.findMany({ where: (table, { eq }) => eq(table.userId, userId) }),
    db.query.savingContributions.findMany({ where: (table, { eq }) => eq(table.userId, userId) }),
    db.query.savingsPlaceTransfers.findMany({ where: (table, { eq }) => eq(table.userId, userId) }),
  ])

  const placeMap = new Map(places.map((p) => [p.id, p.name]))

  const transfersWithNames = transfers.map((t) => ({
    ...t,
    fromPlaceName: placeMap.get(t.fromPlaceId) ?? '',
    toPlaceName: placeMap.get(t.toPlaceId) ?? '',
  }))

  return calculateSavingsPlacesWorkspace({
    places,
    contributions,
    transfers: transfersWithNames,
  })
}

export async function createSavingsPlaceInRepository(
  userId: string,
  name: string,
): Promise<{ placeId: string }> {
  const trimmed = name.trim()
  const normalizedName = normalizeSavingsPlaceName(trimmed)

  await db
    .insert(savingsPlaces)
    .values({ userId, name: trimmed, normalizedName })
    .onConflictDoNothing()

  const existing = await db.query.savingsPlaces.findFirst({
    where: (table, { and, eq }) => and(eq(table.userId, userId), eq(table.normalizedName, normalizedName)),
  })

  if (!existing) throw new Error('No se pudo crear el lugar de ahorro.')
  return { placeId: existing.id }
}

export async function renameSavingsPlaceInRepository(
  userId: string,
  placeId: string,
  name: string,
): Promise<void> {
  const trimmed = name.trim()
  const normalizedName = normalizeSavingsPlaceName(trimmed)

  const existing = await db.query.savingsPlaces.findFirst({
    where: (table, { and, eq }) => and(eq(table.id, placeId), eq(table.userId, userId)),
  })
  if (!existing) throw new Error('Lugar de ahorro no encontrado.')

  const nameTaken = await db.query.savingsPlaces.findFirst({
    where: (table, { and, eq }) =>
      and(eq(table.userId, userId), eq(table.normalizedName, normalizedName)),
  })

  if (nameTaken && nameTaken.id !== placeId) {
    throw new Error('Ya tenés un lugar con ese nombre.')
  }

  await db.update(savingsPlaces).set({ name: trimmed, normalizedName }).where(eq(savingsPlaces.id, placeId))
}

export async function deleteSavingsPlaceInRepository(
  userId: string,
  placeId: string,
): Promise<void> {
  const existing = await db.query.savingsPlaces.findFirst({
    where: (table, { and, eq }) => and(eq(table.id, placeId), eq(table.userId, userId)),
  })
  if (!existing) throw new Error('Lugar de ahorro no encontrado.')

  const hasContributions = await db.query.savingContributions.findFirst({
    where: (table, { eq }) => eq(table.placeId, placeId),
  })
  if (hasContributions) {
    throw new Error('No podés eliminar un lugar que tiene movimientos.')
  }

  const hasOutgoing = await db.query.savingsPlaceTransfers.findFirst({
    where: (table, { or, eq }) =>
      or(eq(table.fromPlaceId, placeId), eq(table.toPlaceId, placeId)),
  })
  if (hasOutgoing) {
    throw new Error('No podés eliminar un lugar que tiene movimientos.')
  }

  await db.delete(savingsPlaces).where(eq(savingsPlaces.id, placeId))
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

  const trimmed = selection.name.trim()
  const normalizedName = normalizeSavingsPlaceName(trimmed)

  await executor
    .insert(savingsPlaces)
    .values({ userId, name: trimmed, normalizedName })
    .onConflictDoNothing()

  const created = await executor.query.savingsPlaces.findFirst({
    where: (table: any, { and, eq }: any) =>
      and(eq(table.userId, userId), eq(table.normalizedName, normalizedName)),
  })

  if (!created) throw new Error('No se pudo crear el lugar de ahorro.')
  return { id: created.id, name: created.name }
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
    const [placeA, placeB] = await Promise.all(
      [fromPlaceId, toPlaceId]
        .sort()
        .map((id) =>
          tx.query.savingsPlaces.findFirst({
            where: (table: any, { and, eq }: any) =>
              and(eq(table.id, id), eq(table.userId, userId)),
          }),
        ),
    )

    if (!placeA || !placeB) {
      throw new Error('Lugar de ahorro no encontrado.')
    }

    const contributions = await tx.query.savingContributions.findMany({
      where: (table: any, { eq }: any) => eq(table.userId, userId),
    })

    const outgoingTransfers = await tx.query.savingsPlaceTransfers.findMany({
      where: (table: any, { eq }: any) => eq(table.userId, userId),
    })

    let sourceBalance = '0'
    for (const c of contributions) {
      if (c.placeId === fromPlaceId && c.currency === currency) {
        sourceBalance = String(Number(sourceBalance) + Number(c.amount))
      }
    }
    for (const t of outgoingTransfers) {
      if (t.fromPlaceId === fromPlaceId && t.currency === currency) {
        sourceBalance = String(Number(sourceBalance) - Number(t.amount))
      }
      if (t.toPlaceId === fromPlaceId && t.currency === currency) {
        sourceBalance = String(Number(sourceBalance) + Number(t.amount))
      }
    }

    if (Number(sourceBalance) < Number(amount)) {
      throw new Error('No tenés saldo suficiente en ese lugar.')
    }

    const [transfer] = await tx
      .insert(savingsPlaceTransfers)
      .values({
        userId,
        fromPlaceId,
        toPlaceId,
        currency,
        amount,
      })
      .returning({ id: savingsPlaceTransfers.id })

    return { transferId: transfer.id }
  })
}

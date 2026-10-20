import { and, eq } from 'drizzle-orm';
import type { Executor, Transaction } from '../database/database.types';
import { savingsPlaces } from '../profile/profile.schema';

export type SavingsPlaceSelection =
  { kind: 'existing'; placeId: string } | { kind: 'new'; name: string };

export async function lockOwnedSavingsPlaces(
  tx: Transaction,
  userId: string,
  placeIds: string[],
): Promise<void> {
  for (const placeId of placeIds) {
    const [place] = await tx
      .select({ id: savingsPlaces.id })
      .from(savingsPlaces)
      .where(
        and(eq(savingsPlaces.id, placeId), eq(savingsPlaces.userId, userId)),
      )
      .for('update');
    if (!place) throw new Error('Lugar de ahorro no encontrado.');
  }
}

export async function findOrCreateSavingsPlace(
  executor: Executor,
  userId: string,
  name: string,
): Promise<{ id: string; name: string } | null> {
  const trimmed = name.trim();
  const normalizedName = trimmed.toLocaleLowerCase('es-AR');
  await executor
    .insert(savingsPlaces)
    .values({ userId, name: trimmed, normalizedName })
    .onConflictDoNothing();
  const place = await executor.query.savingsPlaces.findFirst({
    where: and(
      eq(savingsPlaces.userId, userId),
      eq(savingsPlaces.normalizedName, normalizedName),
    ),
  });
  return place ? { id: place.id, name: place.name } : null;
}

export async function resolveSavingsPlace(
  executor: Executor,
  userId: string,
  selection: SavingsPlaceSelection,
): Promise<{ id: string; name: string }> {
  if (selection.kind === 'existing') {
    const place = await executor.query.savingsPlaces.findFirst({
      where: and(
        eq(savingsPlaces.id, selection.placeId),
        eq(savingsPlaces.userId, userId),
      ),
    });
    if (!place) throw new Error('Lugar de ahorro no encontrado.');
    return { id: place.id, name: place.name };
  }
  const place = await findOrCreateSavingsPlace(
    executor,
    userId,
    selection.name,
  );
  if (!place) throw new Error('No se pudo crear el lugar de ahorro.');
  return place;
}

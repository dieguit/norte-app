import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray, or } from 'drizzle-orm';
import BigNumber from 'bignumber.js';
import { DATABASE_CONNECTION } from '../database/database.constants';
import type { Database } from '../database/database.types';
import {
  financialGoals,
  goalCompletionWithdrawals,
  savingContributions,
  savingsPlaceTransfers,
  savingsPlaces,
} from '../profile/profile.schema';
import { normalizeMoneyAmount } from '../money';
import {
  findOrCreateSavingsPlace,
  lockOwnedSavingsPlaces,
} from './savings-places.data';

const missing = () => new NotFoundException('Lugar de ahorro no encontrado.');

@Injectable()
export class SavingsPlacesService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async create(userId: string, name: string) {
    const place = await findOrCreateSavingsPlace(this.db, userId, name);
    if (!place)
      throw new BadRequestException('No se pudo crear el lugar de ahorro.');
    return { placeId: place.id };
  }

  private async requireOwned(userId: string, id: string) {
    const owned = await this.db.query.savingsPlaces.findFirst({
      where: and(eq(savingsPlaces.id, id), eq(savingsPlaces.userId, userId)),
    });
    if (!owned) throw missing();
    return owned;
  }

  async rename(userId: string, id: string, name: string) {
    await this.requireOwned(userId, id);
    const normalizedName = name.trim().toLocaleLowerCase('es-AR');
    const collision = await this.db.query.savingsPlaces.findFirst({
      where: and(
        eq(savingsPlaces.userId, userId),
        eq(savingsPlaces.normalizedName, normalizedName),
      ),
    });
    if (collision && collision.id !== id)
      throw new ConflictException('Ya tenés un lugar con ese nombre.');
    await this.db
      .update(savingsPlaces)
      .set({ name: name.trim(), normalizedName })
      .where(and(eq(savingsPlaces.id, id), eq(savingsPlaces.userId, userId)));
  }

  async delete(userId: string, id: string) {
    await this.requireOwned(userId, id);
    const [contribution, withdrawal, transfer] = await Promise.all([
      this.db.query.savingContributions.findFirst({
        where: eq(savingContributions.placeId, id),
      }),
      this.db.query.goalCompletionWithdrawals.findFirst({
        where: eq(goalCompletionWithdrawals.placeId, id),
      }),
      this.db.query.savingsPlaceTransfers.findFirst({
        where: or(
          eq(savingsPlaceTransfers.fromPlaceId, id),
          eq(savingsPlaceTransfers.toPlaceId, id),
        ),
      }),
    ]);
    if (contribution || withdrawal || transfer)
      throw new ConflictException(
        'No podés eliminar un lugar que tiene movimientos.',
      );
    try {
      await this.db
        .delete(savingsPlaces)
        .where(and(eq(savingsPlaces.id, id), eq(savingsPlaces.userId, userId)));
    } catch (error) {
      if ((error as { code?: string }).code === '23503')
        throw new ConflictException(
          'No podés eliminar un lugar que tiene movimientos.',
        );
      throw error;
    }
  }

  async transfer(
    userId: string,
    input: {
      fromPlaceId: string;
      toPlaceId: string;
      currency: 'ARS' | 'USD';
      amount: string;
    },
  ) {
    const amount = normalizeMoneyAmount(input.amount);
    return this.db.transaction(async (tx) => {
      try {
        await lockOwnedSavingsPlaces(
          tx,
          userId,
          [input.fromPlaceId, input.toPlaceId].sort(),
        );
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === 'Lugar de ahorro no encontrado.'
        )
          throw missing();
        throw error;
      }
      const [contributions, transfers, goals] = await Promise.all([
        tx.query.savingContributions.findMany({
          where: eq(savingContributions.userId, userId),
        }),
        tx.query.savingsPlaceTransfers.findMany({
          where: eq(savingsPlaceTransfers.userId, userId),
        }),
        tx.query.financialGoals.findMany({
          where: eq(financialGoals.userId, userId),
          columns: { id: true },
        }),
      ]);
      const ownedPlaces = await tx.query.savingsPlaces.findMany({
        where: eq(savingsPlaces.userId, userId),
        columns: { id: true },
      });
      const ownedPlaceIds = new Set(ownedPlaces.map((place) => place.id));
      const goalIds = goals.map((goal) => goal.id);
      const withdrawals = goalIds.length
        ? await tx.query.goalCompletionWithdrawals.findMany({
            where: and(
              eq(goalCompletionWithdrawals.placeId, input.fromPlaceId),
              eq(goalCompletionWithdrawals.currency, input.currency),
              inArray(goalCompletionWithdrawals.goalId, goalIds),
            ),
          })
        : [];
      const balance = contributions
        .filter(
          (row) =>
            row.placeId === input.fromPlaceId &&
            row.currency === input.currency,
        )
        .reduce((sum, row) => sum.plus(row.amount), new BigNumber(0))
        .plus(
          transfers
            .filter(
              (row) =>
                row.currency === input.currency &&
                ownedPlaceIds.has(row.fromPlaceId) &&
                ownedPlaceIds.has(row.toPlaceId),
            )
            .reduce(
              (sum, row) =>
                sum.plus(
                  new BigNumber(row.amount).times(
                    Number(row.toPlaceId === input.fromPlaceId) -
                      Number(row.fromPlaceId === input.fromPlaceId),
                  ),
                ),
              new BigNumber(0),
            ),
        )
        .minus(
          withdrawals
            .filter((row) => goalIds.includes(row.goalId))
            .reduce((sum, row) => sum.plus(row.amount), new BigNumber(0)),
        );
      if (balance.isLessThan(amount))
        throw new BadRequestException(
          'No tenés saldo suficiente en ese lugar.',
        );
      const [transfer] = await tx
        .insert(savingsPlaceTransfers)
        .values({
          userId,
          fromPlaceId: input.fromPlaceId,
          toPlaceId: input.toPlaceId,
          currency: input.currency,
          amount,
        })
        .returning({ id: savingsPlaceTransfers.id });
      return { transferId: transfer.id };
    });
  }
}

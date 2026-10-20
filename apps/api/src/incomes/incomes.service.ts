import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import {
  IncomeMutationResponseSchema,
  type IncomeDraft,
} from '@repo/shared-types';
import { DATABASE_CONNECTION } from '../database/database.constants';
import type { Database, Transaction } from '../database/database.types';
import { incomeSources, incomes } from '../profile/profile.schema';
import { normalizeMoneyAmount } from '../money';

function serializeIncome(income: typeof incomes.$inferSelect) {
  return IncomeMutationResponseSchema.parse({
    ...income,
    createdAt: income.createdAt.toISOString(),
    updatedAt: income.updatedAt.toISOString(),
  });
}

@Injectable()
export class IncomesService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  private async resolveSource(
    tx: Transaction,
    userId: string,
    source: IncomeDraft['source'],
  ) {
    if (source.kind !== 'custom')
      return { sourceKind: source.kind, sourceId: null };
    if ('sourceId' in source) {
      const owned = await tx.query.incomeSources.findFirst({
        where: and(
          eq(incomeSources.id, source.sourceId),
          eq(incomeSources.userId, userId),
        ),
      });
      if (!owned)
        throw new BadRequestException('Fuente de ingreso no encontrada.');
      return { sourceKind: 'custom', sourceId: owned.id };
    }
    const name = source.name.trim();
    const normalizedName = name.toLocaleLowerCase('es-AR');
    await tx
      .insert(incomeSources)
      .values({ userId, name, normalizedName })
      .onConflictDoNothing();
    const owned = await tx.query.incomeSources.findFirst({
      where: and(
        eq(incomeSources.userId, userId),
        eq(incomeSources.normalizedName, normalizedName),
      ),
    });
    if (!owned)
      throw new BadRequestException('No pudimos crear la fuente de ingreso.');
    return { sourceKind: 'custom', sourceId: owned.id };
  }

  private async values(tx: Transaction, userId: string, draft: IncomeDraft) {
    const source = await this.resolveSource(tx, userId, draft.source);
    return {
      userId,
      ...source,
      concept: draft.concept,
      amount: normalizeMoneyAmount(draft.amount),
      currency: draft.currency,
      recurring: draft.recurring,
    };
  }

  async insert(
    tx: Transaction,
    userId: string,
    draft: IncomeDraft,
    effectiveMonth: string,
  ): Promise<typeof incomes.$inferSelect> {
    const values = await this.values(tx, userId, draft);
    const [income] = await tx
      .insert(incomes)
      .values({
        ...values,
        effectiveMonth: `${effectiveMonth}-01`,
      })
      .returning();
    return income;
  }

  create(userId: string, input: { draft: IncomeDraft }) {
    return this.db.transaction(async (tx) =>
      serializeIncome(
        await this.insert(tx, userId, input.draft, input.draft.effectiveMonth),
      ),
    );
  }

  update(userId: string, id: string, input: { draft: IncomeDraft }) {
    return this.db.transaction(async (tx) => {
      const existing = await tx.query.incomes.findFirst({
        where: and(eq(incomes.id, id), eq(incomes.userId, userId)),
      });
      if (!existing) throw new NotFoundException('Ingreso no encontrado.');
      const [income] = await tx
        .update(incomes)
        .set({
          ...(await this.values(tx, userId, input.draft)),
          effectiveMonth: `${input.draft.effectiveMonth}-01`,
        })
        .where(and(eq(incomes.id, id), eq(incomes.userId, userId)))
        .returning();
      return serializeIncome(income);
    });
  }

  async delete(userId: string, id: string) {
    const [income] = await this.db
      .delete(incomes)
      .where(and(eq(incomes.id, id), eq(incomes.userId, userId)))
      .returning({ id: incomes.id });
    if (!income) throw new NotFoundException('Ingreso no encontrado.');
  }
}

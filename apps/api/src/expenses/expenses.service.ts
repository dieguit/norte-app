import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import {
  ExpenseMutationResponseSchema,
  type ExpenseDraft,
} from '@repo/shared-types';
import { DATABASE_CONNECTION } from '../database/database.constants';
import type { Database } from '../database/database.types';
import { expenseSources, expenses } from '../profile/profile.schema';
import { normalizeMoneyAmount } from '../money';

function serializeExpense(expense: typeof expenses.$inferSelect) {
  return ExpenseMutationResponseSchema.parse({
    id: expense.id,
    sourceKind: expense.sourceKind,
    sourceId: expense.sourceId,
    concept: expense.concept,
    amount: expense.amount,
    currency: expense.currency,
    recurring: expense.recurring,
    effectiveMonth: expense.effectiveMonth,
    endMonth: expense.endMonth,
  });
}

@Injectable()
export class ExpensesService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  private async values(tx: any, userId: string, draft: ExpenseDraft) {
    let source: { sourceKind: string; sourceId: string | null };
    if (draft.source.kind !== 'custom') {
      source = { sourceKind: draft.source.kind, sourceId: null };
    } else if ('sourceId' in draft.source) {
      const owned = await tx.query.expenseSources.findFirst({
        where: and(
          eq(expenseSources.id, draft.source.sourceId),
          eq(expenseSources.userId, userId),
        ),
      });
      if (!owned)
        throw new BadRequestException('Concepto de gasto no encontrado.');
      source = { sourceKind: 'custom', sourceId: owned.id };
    } else {
      const name = draft.source.name.trim();
      const normalizedName = name.toLocaleLowerCase('es-AR');
      await tx
        .insert(expenseSources)
        .values({ userId, name, normalizedName })
        .onConflictDoNothing();
      const owned = await tx.query.expenseSources.findFirst({
        where: and(
          eq(expenseSources.userId, userId),
          eq(expenseSources.normalizedName, normalizedName),
        ),
      });
      if (!owned)
        throw new BadRequestException('No pudimos crear el concepto de gasto.');
      source = { sourceKind: 'custom', sourceId: owned.id };
    }
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
    tx: any,
    userId: string,
    draft: ExpenseDraft,
    effectiveMonth: string,
  ) {
    const [expense] = await tx
      .insert(expenses)
      .values({
        ...(await this.values(tx, userId, draft)),
        effectiveMonth: `${effectiveMonth}-01`,
        endMonth: null,
      })
      .returning();
    return expense;
  }

  create(
    userId: string,
    input: { draft: ExpenseDraft; effectiveMonth: string },
  ) {
    return this.db.transaction(async (tx) =>
      serializeExpense(
        await this.insert(tx, userId, input.draft, input.effectiveMonth),
      ),
    );
  }

  update(
    userId: string,
    id: string,
    input: { draft: ExpenseDraft; effectiveMonth: string },
  ) {
    return this.db.transaction(async (tx) => {
      const existing = await tx.query.expenses.findFirst({
        where: and(eq(expenses.id, id), eq(expenses.userId, userId)),
      });
      if (!existing) throw new NotFoundException('Gasto no encontrado.');
      const values = await this.values(tx, userId, input.draft);
      if (
        existing.recurring &&
        existing.effectiveMonth.slice(0, 7) < input.effectiveMonth
      ) {
        await tx
          .update(expenses)
          .set({ endMonth: `${input.effectiveMonth}-01` })
          .where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
        const [replacement] = await tx
          .insert(expenses)
          .values({
            ...values,
            effectiveMonth: `${input.effectiveMonth}-01`,
            endMonth: null,
          })
          .returning();
        return serializeExpense(replacement);
      }
      const [updated] = await tx
        .update(expenses)
        .set({
          ...values,
          effectiveMonth: `${input.effectiveMonth}-01`,
          endMonth: input.draft.recurring ? existing.endMonth : null,
        })
        .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
        .returning();
      return serializeExpense(updated);
    });
  }

  delete(userId: string, id: string, effectiveMonth: string) {
    return this.db.transaction(async (tx) => {
      const existing = await tx.query.expenses.findFirst({
        where: and(eq(expenses.id, id), eq(expenses.userId, userId)),
      });
      if (!existing) throw new NotFoundException('Gasto no encontrado.');
      if (
        existing.recurring &&
        existing.effectiveMonth.slice(0, 7) < effectiveMonth
      ) {
        await tx
          .update(expenses)
          .set({ endMonth: `${effectiveMonth}-01` })
          .where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
      } else {
        await tx
          .delete(expenses)
          .where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
      }
    });
  }
}

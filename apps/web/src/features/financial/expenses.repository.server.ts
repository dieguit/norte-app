import '@tanstack/react-start/server-only'
import { and, eq } from 'drizzle-orm'
import { db } from '../../db/client'
import { expenses, expenseSources } from '../../db/schema'
import type { ExpensesWorkspace } from './expenses'
import type { ExpenseDraft } from './expenses.schema'

export async function getExpensesWorkspaceState(userId: string): Promise<ExpensesWorkspace | null> {
  const profile = await db.query.financialProfiles.findFirst({
    where: (table, { eq }) => eq(table.userId, userId),
  })
  if (!profile) return null

  const [sources, expenseRows] = await Promise.all([
    db.query.expenseSources.findMany({ where: (table, { eq }) => eq(table.userId, userId) }),
    db.query.expenses.findMany({ where: (table, { eq }) => eq(table.userId, userId) }),
  ])
  const sourcesById = new Map(sources.map((source) => [source.id, source.name]))

  return {
    sources,
    expenses: expenseRows.map((expense) => ({
      id: expense.id,
      sourceKind: expense.sourceKind,
      sourceId: expense.sourceId,
      sourceName: expense.sourceId ? (sourcesById.get(expense.sourceId) ?? 'Concepto eliminado') : expense.sourceKind,
      concept: expense.concept,
      amount: expense.amount,
      currency: expense.currency as 'ARS' | 'USD',
      recurring: expense.recurring,
      effectiveMonth: expense.effectiveMonth,
      endMonth: expense.endMonth,
    })),
  }
}

async function resolveSource(tx: any, userId: string, source: ExpenseDraft['source']) {
  if (source.kind !== 'custom') return { sourceKind: source.kind, sourceId: null }

  if ('sourceId' in source) {
    const existing = await tx.query.expenseSources.findFirst({
      where: (table: any, { and, eq }: any) => and(eq(table.id, source.sourceId), eq(table.userId, userId)),
    })
    if (!existing) throw new Error('Concepto de gasto no encontrado.')
    return { sourceKind: 'custom' as const, sourceId: existing.id }
  }

  const name = source.name.trim()
  const normalizedName = name.toLocaleLowerCase('es-AR')
  await tx
    .insert(expenseSources)
    .values({ userId, name, normalizedName })
    .onConflictDoNothing()
  const created = await tx.query.expenseSources.findFirst({
    where: (table: any, { and, eq }: any) =>
      and(eq(table.userId, userId), eq(table.normalizedName, normalizedName)),
  })
  if (!created) throw new Error('No pudimos crear el concepto de gasto.')
  return { sourceKind: 'custom' as const, sourceId: created.id }
}

function expenseValues(
  userId: string,
  draft: ExpenseDraft,
  source: { sourceKind: string; sourceId: string | null },
) {
  return {
    userId,
    sourceKind: source.sourceKind,
    sourceId: source.sourceId,
    concept: draft.concept,
    amount: draft.amount,
    currency: draft.currency,
    recurring: draft.recurring,
  }
}

export async function insertExpenseWithExecutor(
  tx: any,
  userId: string,
  draft: ExpenseDraft,
  effectiveMonth: string,
) {
  const source = await resolveSource(tx, userId, draft.source)
  const [expense] = await tx
    .insert(expenses)
    .values({
      ...expenseValues(userId, draft, source),
      effectiveMonth: `${effectiveMonth}-01`,
      endMonth: null,
    })
    .returning()
  return expense
}

export async function createExpenseInRepository(
  userId: string,
  draft: ExpenseDraft,
  effectiveMonth: string,
) {
  return db.transaction(async (tx) => {
    return insertExpenseWithExecutor(tx, userId, draft, effectiveMonth)
  })
}

export async function updateExpenseInRepository(
  userId: string,
  expenseId: string,
  effectiveMonth: string,
  draft: ExpenseDraft,
) {
  return db.transaction(async (tx) => {
    const existing = await tx.query.expenses.findFirst({
      where: (table: any, { and, eq }: any) => and(eq(table.id, expenseId), eq(table.userId, userId)),
    })
    if (!existing) throw new Error('Gasto no encontrado.')
    const source = await resolveSource(tx, userId, draft.source)

    if (existing.recurring && existing.effectiveMonth.slice(0, 7) < effectiveMonth) {
      await tx
        .update(expenses)
        .set({ endMonth: `${effectiveMonth}-01` })
        .where(and(eq(expenses.id, expenseId), eq(expenses.userId, userId)))
      const [replacement] = await tx
        .insert(expenses)
        .values({
          ...expenseValues(userId, draft, source),
          effectiveMonth: `${effectiveMonth}-01`,
          endMonth: null,
        })
        .returning()
      return replacement
    }

    const [updated] = await tx
      .update(expenses)
      .set({
        ...expenseValues(userId, draft, source),
        effectiveMonth: `${effectiveMonth}-01`,
        endMonth: draft.recurring ? existing.endMonth : null,
      })
      .where(and(eq(expenses.id, expenseId), eq(expenses.userId, userId)))
      .returning()
    return updated
  })
}

export async function deleteExpenseInRepository(
  userId: string,
  expenseId: string,
  effectiveMonth: string,
) {
  return db.transaction(async (tx) => {
    const existing = await tx.query.expenses.findFirst({
      where: (table: any, { and, eq }: any) => and(eq(table.id, expenseId), eq(table.userId, userId)),
    })
    if (!existing) throw new Error('Gasto no encontrado.')

    if (existing.recurring && existing.effectiveMonth.slice(0, 7) < effectiveMonth) {
      await tx
        .update(expenses)
        .set({ endMonth: `${effectiveMonth}-01` })
        .where(and(eq(expenses.id, expenseId), eq(expenses.userId, userId)))
      return
    }

    await tx
      .delete(expenses)
      .where(and(eq(expenses.id, expenseId), eq(expenses.userId, userId)))
  })
}

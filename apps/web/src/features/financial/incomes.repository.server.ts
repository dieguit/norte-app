import '@tanstack/react-start/server-only'
import { and, eq } from 'drizzle-orm'
import { db } from '../../db/client'
import { incomes, incomeSources } from '../../db/schema'
import type { IncomesWorkspace } from './incomes'
import type { IncomeDraft } from './incomes.schema'

export async function getIncomesWorkspaceState(userId: string): Promise<IncomesWorkspace | null> {
  const profile = await db.query.financialProfiles.findFirst({
    where: (table, { eq }) => eq(table.userId, userId),
  })
  if (!profile) return null

  const [sources, incomeRows] = await Promise.all([
    db.query.incomeSources.findMany({ where: (table, { eq }) => eq(table.userId, userId) }),
    db.query.incomes.findMany({ where: (table, { eq }) => eq(table.userId, userId) }),
  ])
  const sourcesById = new Map(sources.map((source) => [source.id, source.name]))

  return {
    sources,
    incomes: incomeRows.map((income) => ({
      id: income.id,
      sourceKind: income.sourceKind,
      sourceId: income.sourceId,
      sourceName: income.sourceId ? (sourcesById.get(income.sourceId) ?? 'Fuente eliminada') : income.sourceKind,
      amount: income.amount,
      currency: income.currency as 'ARS' | 'USD',
      recurring: income.recurring,
      effectiveMonth: income.effectiveMonth,
    })),
  }
}

async function resolveSource(tx: any, userId: string, source: IncomeDraft['source']) {
  if (source.kind !== 'custom') return { sourceKind: source.kind, sourceId: null }

  if ('sourceId' in source) {
    const existing = await tx.query.incomeSources.findFirst({
      where: (table: any, { and, eq }: any) => and(eq(table.id, source.sourceId), eq(table.userId, userId)),
    })
    if (!existing) throw new Error('Fuente de ingreso no encontrada.')
    return { sourceKind: 'custom' as const, sourceId: existing.id }
  }

  const name = source.name.trim()
  const normalizedName = name.toLocaleLowerCase('es-AR')
  await tx
    .insert(incomeSources)
    .values({ userId, name, normalizedName })
    .onConflictDoNothing()
  const created = await tx.query.incomeSources.findFirst({
    where: (table: any, { and, eq }: any) =>
      and(eq(table.userId, userId), eq(table.normalizedName, normalizedName)),
  })
  if (!created) throw new Error('No pudimos crear la fuente de ingreso.')
  return { sourceKind: 'custom' as const, sourceId: created.id }
}

function incomeValues(
  userId: string,
  draft: IncomeDraft,
  source: { sourceKind: string; sourceId: string | null },
) {
  return {
    userId,
    sourceKind: source.sourceKind,
    sourceId: source.sourceId,
    amount: draft.amount,
    currency: draft.currency,
    recurring: draft.recurring,
  }
}

export async function insertIncomeWithExecutor(
  tx: any,
  userId: string,
  draft: IncomeDraft,
  effectiveMonth: string,
) {
  const source = await resolveSource(tx, userId, draft.source)
  const [income] = await tx
    .insert(incomes)
    .values({
      ...incomeValues(userId, draft, source),
      effectiveMonth: `${effectiveMonth}-01`,
    })
    .returning()
  return income
}

export async function createIncomeInRepository(userId: string, draft: IncomeDraft) {
  return db.transaction(async (tx) => {
    return insertIncomeWithExecutor(tx, userId, draft, draft.effectiveMonth)
  })
}

export async function updateIncomeInRepository(userId: string, incomeId: string, draft: IncomeDraft) {
  return db.transaction(async (tx) => {
    const existing = await tx.query.incomes.findFirst({
      where: (table: any, { and, eq }: any) => and(eq(table.id, incomeId), eq(table.userId, userId)),
    })
    if (!existing) throw new Error('Ingreso no encontrado.')
    const source = await resolveSource(tx, userId, draft.source)
    const [income] = await tx
      .update(incomes)
      .set({
        ...incomeValues(userId, draft, source),
        effectiveMonth: `${draft.effectiveMonth}-01`,
      })
      .where(and(eq(incomes.id, incomeId), eq(incomes.userId, userId)))
      .returning()
    return income
  })
}

export async function deleteIncomeInRepository(userId: string, incomeId: string) {
  const [income] = await db
    .delete(incomes)
    .where(and(eq(incomes.id, incomeId), eq(incomes.userId, userId)))
    .returning({ id: incomes.id })
  if (!income) throw new Error('Ingreso no encontrado.')
}

import { eq, sql } from 'drizzle-orm';
import type { Executor } from '../../database/database.types';
import { benefitBrands } from './schema';
import type { IngestSource } from './types';

export function normalizeBrand(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\p{P}\s]+|[\p{P}\s]+$/gu, '');
}

export async function upsertBrand(
  db: Executor,
  source: IngestSource,
  name: string | null,
  sourceId: string | null,
): Promise<string | null> {
  if (!name) return null;
  const normalized = normalizeBrand(name);
  const [bySource] = sourceId
    ? await db
        .select()
        .from(benefitBrands)
        .where(
          sql`${benefitBrands.sourceIds} @> ${JSON.stringify({ [source]: [sourceId] })}::jsonb`,
        )
        .limit(1)
    : [];
  const existing =
    bySource ??
    (
      await db
        .select()
        .from(benefitBrands)
        .where(eq(benefitBrands.normalized, normalized))
        .limit(1)
    )[0];
  if (existing) {
    if (sourceId && !existing.sourceIds[source]?.includes(sourceId))
      await db
        .update(benefitBrands)
        .set({
          sourceIds: {
            ...existing.sourceIds,
            [source]: [...(existing.sourceIds[source] ?? []), sourceId],
          },
        })
        .where(eq(benefitBrands.id, existing.id));
    return existing.id;
  }
  const [brand] = await db
    .insert(benefitBrands)
    .values({
      name,
      normalized,
      sourceIds: sourceId ? { [source]: [sourceId] } : {},
    })
    .returning();
  return brand.id;
}

import { eq, or, sql } from 'drizzle-orm';
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

export class BrandIdentityConflict extends Error {}

export function resolveBrandIdentity(
  rows: (typeof benefitBrands.$inferSelect)[],
  source: IngestSource,
  normalized: string,
  sourceId: string | null,
) {
  const matches = rows.filter(
    (row) =>
      row.normalized === normalized ||
      row.aliases.some((alias) => normalizeBrand(alias) === normalized) ||
      (sourceId !== null && row.sourceIds[source]?.includes(sourceId)),
  );
  if (matches.length > 1)
    throw new BrandIdentityConflict('Ambiguous brand name or source identity');
  return matches[0];
}

export async function upsertBrand(
  db: Executor,
  source: IngestSource,
  name: string | null,
  sourceId: string | null,
): Promise<string | null> {
  if (!name) return null;
  const normalized = normalizeBrand(name);
  const rows = await db
    .select()
    .from(benefitBrands)
    .where(
      or(
        eq(benefitBrands.normalized, normalized),
        sql`cardinality(${benefitBrands.aliases}) > 0`,
        sourceId
          ? sql`${benefitBrands.sourceIds} @> ${JSON.stringify({ [source]: [sourceId] })}::jsonb`
          : undefined,
      ),
    );
  const existing = resolveBrandIdentity(rows, source, normalized, sourceId);
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

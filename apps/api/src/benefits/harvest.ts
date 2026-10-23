import { createHash } from 'node:crypto';
import {
  BENEFIT_CAP_PERIODS,
  BENEFIT_CATEGORIES,
  BENEFIT_KINDS,
  BenefitCategorySchema,
} from '@repo/shared-types';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { todayInArgentina } from '../argentina-time';
import type { Database } from '../database/database.types';
import { benefits } from './benefits.schema';
import {
  CATALOG,
  candidateInstruments,
  type Instrument,
  type Provider,
  type Source,
} from './catalog';

const FETCH_TIMEOUT_MS = 15_000;
const MAX_CHARS = 60_000;
const USER_AGENT = 'Mozilla/5.0 (compatible; NorteBenefitsBot/1.0)';
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const ExtractedBenefitSchema = z.object({
  title: z.string().min(1),
  merchant: z.string().min(1).nullable(),
  category: BenefitCategorySchema,
  kind: z.enum(BENEFIT_KINDS),
  value: z.number().positive(),
  maxAmount: z.number().positive().nullable(),
  maxAmountPeriod: z.enum(BENEFIT_CAP_PERIODS).nullable(),
  weekdays: z.array(z.number().int().min(0).max(6)).min(1).nullable(),
  validFrom: day.nullable(),
  validTo: day.nullable(),
  instrumentSlugs: z.array(z.string()).min(1),
  conditions: z.string().nullable(),
});
export type ExtractedBenefit = z.infer<typeof ExtractedBenefitSchema>;
export const ExtractionSchema = z.object({
  benefits: z.array(ExtractedBenefitSchema),
});

export type Extract = (prompt: string) => Promise<unknown>;

export type SourceResult = {
  provider: string;
  url: string;
  status: 'ok' | 'failed';
  extracted: number;
  inserted: number;
  error?: string;
  benefits: ExtractedBenefit[];
};

// ponytail: regex stripping; switch to a real HTML parser if sources need table structure preserved.
export function htmlToText(html: string): string {
  return html
    .replace(
      /<(script|style|noscript|svg|nav|header|footer)\b[\s\S]*?<\/\1>/gi,
      ' ',
    )
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export async function fetchSource(
  source: Source,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const response = await fetchImpl(source.url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: source.strategy === 'json' ? 'application/json' : 'text/html',
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = await response.text();
  return (source.strategy === 'json' ? body : htmlToText(body)).slice(
    0,
    MAX_CHARS,
  );
}

export function buildPrompt(
  source: Source,
  candidates: Instrument[],
  today: string,
): string {
  return `Hoy es ${today} (hora de Argentina). Extraé los beneficios vigentes o futuros del contenido.

Instrucciones de la fuente:
${source.instructions}

Instrumentos posibles (usá sólo estos slugs en instrumentSlugs):
${candidates.map((i) => `- ${i.slug}: ${i.label}`).join('\n')}

Categorías: ${BENEFIT_CATEGORIES.join(', ')}

Reglas:
- Un item por beneficio. Ignorá los vencidos.
- kind: discount (% de descuento en el acto), cashback (% de reintegro), installments (cuotas sin interés; value = cantidad de cuotas), nxm (2x1, 3x2; value = N).
- value: número (20 para 20%).
- maxAmount: tope en ARS como número, o null. maxAmountPeriod: transaction | day | week | month, o null.
- weekdays: 0=domingo … 6=sábado; null si aplica todos los días.
- validFrom / validTo: YYYY-MM-DD o null. Resolvé expresiones como "todos los miércoles de octubre" con la fecha de hoy.
- instrumentSlugs: sólo los instrumentos que cumplen las condiciones (si dice "sólo crédito", no incluyas débito).
- conditions: resumen corto de otras condiciones (mínimo de compra, pagando con MODO, online), o null.
- Nunca inventes datos. Si no hay beneficios, devolvé benefits: [].

Contenido:
"""
{{CONTENT}}
"""`;
}

export function postProcess(
  raw: unknown,
  candidateSlugs: Set<string>,
  today: string,
): ExtractedBenefit[] {
  const items = z.object({ benefits: z.array(z.unknown()) }).safeParse(raw);
  if (!items.success) return [];
  return items.data.benefits.flatMap((item) => {
    const parsed = ExtractedBenefitSchema.safeParse(item);
    if (!parsed.success) return [];
    const b = parsed.data;
    if (!b.instrumentSlugs.every((slug) => candidateSlugs.has(slug))) return [];
    if (b.validTo && b.validTo < today) return [];
    return [
      {
        ...b,
        maxAmountPeriod: b.maxAmount === null ? null : b.maxAmountPeriod,
      },
    ];
  });
}

export function fingerprint(providerSlug: string, b: ExtractedBenefit): string {
  const key = [
    providerSlug,
    b.merchant,
    b.category,
    b.kind,
    b.value,
    b.weekdays,
    b.validTo,
    [...b.instrumentSlugs].sort(),
  ];
  return createHash('sha256').update(JSON.stringify(key)).digest('hex');
}

async function upsert(
  db: Database,
  provider: Provider,
  url: string,
  items: ExtractedBenefit[],
  now: Date,
): Promise<number> {
  let inserted = 0;
  for (const b of items) {
    const [row] = await db
      .insert(benefits)
      .values({
        ...b,
        providerSlug: provider.slug,
        sourceUrl: url,
        fingerprint: fingerprint(provider.slug, b),
        firstSeenAt: now,
        lastSeenAt: now,
      })
      .onConflictDoUpdate({
        target: benefits.fingerprint,
        set: {
          lastSeenAt: now,
          sourceUrl: url,
          title: b.title,
          conditions: b.conditions,
          maxAmount: b.maxAmount,
          maxAmountPeriod: b.maxAmountPeriod,
        },
      })
      .returning({ inserted: sql<boolean>`(xmax = 0)` });
    if (row?.inserted) inserted++;
  }
  return inserted;
}

export async function runHarvest(
  db: Database,
  extract: Extract,
  providers: Provider[] = CATALOG,
  now = new Date(),
  options: { dryRun?: boolean; fetchImpl?: typeof fetch } = {},
): Promise<SourceResult[]> {
  const today = todayInArgentina(now).today;
  const results: SourceResult[] = [];
  for (const provider of providers) {
    const candidates = candidateInstruments(provider);
    const slugs = new Set(candidates.map((i) => i.slug));
    for (const source of provider.sources) {
      const base = { provider: provider.slug, url: source.url };
      try {
        const content = await fetchSource(source, options.fetchImpl);
        const prompt = buildPrompt(source, candidates, today).replace(
          '{{CONTENT}}',
          content,
        );
        const items = postProcess(await extract(prompt), slugs, today);
        const inserted = options.dryRun
          ? 0
          : await upsert(db, provider, source.url, items, now);
        results.push({
          ...base,
          status: 'ok',
          extracted: items.length,
          inserted,
          benefits: items,
        });
      } catch (error) {
        results.push({
          ...base,
          status: 'failed',
          extracted: 0,
          inserted: 0,
          error: String(error),
          benefits: [],
        });
      }
    }
  }
  return results;
}

import { createHash } from 'node:crypto';
import {
  CampaignTermsSchema,
  type CampaignOffer,
  type Requirement,
} from '@repo/shared-types';
import { z } from 'zod';
import type {
  Adapter,
  AdapterAnomaly,
  AdapterRun,
  NormalizedListing,
} from './types';

const rowSchema = z
  .object({
    id: z.union([z.number().int(), z.string().min(1)]),
    idMarca: z.union([z.number().int(), z.string().min(1)]).nullable(),
    titulo: z.string().min(1),
    subtitulo: z.string().min(1),
    promocion: z.string(),
    leyendaDiasAplicacion: z.string(),
    fechaHasta: z.string(),
    modeloAtencion: z.object({ nombre: z.string() }),
    haberes: z.boolean(),
    pagoQR: z.boolean(),
    pagoNFC: z.boolean(),
    mediosDePago: z.array(z.string()),
  })
  .passthrough();
const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
const dayNames = [
  'domingo',
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
];
function days(text: string): number[] | null | undefined {
  const value = normalize(text);
  if (value === 'todos los dias') return null;
  const range = value.split(' a ');
  if (range.length === 2) {
    const start = dayNames.indexOf(range[0]!);
    const end = dayNames.indexOf(range[1]!);
    if (start < 0 || end < 0) return undefined;
    return Array.from(
      { length: ((end - start + 7) % 7) + 1 },
      (_, i) => (start + i) % 7,
    );
  }
  const result = value.split(/\s*,\s*| y /).map((v) => dayNames.indexOf(v));
  return result.every((v) => v >= 0) ? [...new Set(result)] : undefined;
}
function offers(text: string): CampaignOffer[] | null {
  const value = normalize(text);
  const match =
    /^(?:(\d+)% de ahorro(?: y (hasta )?(\d+) cuotas sin interes)?|hasta (\d+) cuotas sin interes)$/.exec(
      value,
    );
  if (!match) return null;
  const result: CampaignOffer[] = [];
  if (match[1])
    result.push({
      kind: 'percent',
      percentageBps: Number(match[1]) * 100,
      mode: 'unspecified',
    });
  if (match[3] || match[4])
    result.push({
      kind: 'installments',
      count: Number(match[3] ?? match[4]),
      upTo: !!(match[2] || match[4]),
    });
  return result;
}
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
const tierCodes: Record<string, string[] | null> = {
  Cross: null,
  Masivo: ['masivo'],
  Eminent: ['eminent', 'eminent-black'],
  'Eminent Black': ['eminent-black'],
};
// These are the catalog's explicit payment logos, not inferred tier/card-product names.
const logos: Record<
  string,
  { network: 'visa' | 'mastercard' | 'amex'; types?: ['debit'] }
> = {
  'TarjetaMasterCard.png': { network: 'mastercard' },
  'Master_Black.png': { network: 'mastercard' },
  'TarjetaVisa.png': { network: 'visa' },
  'Visa_Black.png': { network: 'visa' },
  'TarjetaAmericanExpress.png': { network: 'amex' },
  'Amex_Black.png': { network: 'amex' },
  'Vdebito80x80azul.png': { network: 'visa', types: ['debit'] },
};
type Row = z.infer<typeof rowSchema>;
type AddAnomaly = (kind: AdapterAnomaly['kind'], detail: string) => void;

function eligibility(row: Row, add: AddAnomaly) {
  const codes = tierCodes[row.modeloAtencion.nombre];
  const unresolved: string[] = [];
  if (codes === undefined) {
    add('unknown_tier_signal', row.modeloAtencion.nombre);
    unresolved.push(
      `Nivel Galicia sin confirmar: ${row.modeloAtencion.nombre}`,
    );
  }
  if (row.haberes) unresolved.push('Requiere cobrar el sueldo en Galicia');
  const cards: Requirement[] = row.mediosDePago.map((logo) => {
    const selector = logos[logo];
    if (!selector) unresolved.push(`Medio de pago sin confirmar: ${logo}`);
    return { card: { issuerProviderSlugs: ['galicia'], ...selector } };
  });
  const requirements: Requirement[] = [
    cards.length
      ? { anyOf: cards }
      : { card: { issuerProviderSlugs: ['galicia'] } },
  ];
  if (codes)
    requirements.push({
      providerFact: { providerSlug: 'galicia', key: 'tier', values: codes },
    });
  return { codes, requirements, unresolved };
}

function parseTerms(
  row: Row,
  add: AddAnomaly,
  facts: ReturnType<typeof eligibility>,
  offer: CampaignOffer[] | null,
  weekdays: number[] | null | undefined,
) {
  if (!offer || weekdays === undefined) return null;
  const { requirements, unresolved } = facts;
  const candidate = CampaignTermsSchema.safeParse({
    offers: offer,
    eligibility: { allOf: requirements },
    eligibilityCompleteness: unresolved.length ? 'incomplete' : 'complete',
    unresolved,
    capState: 'unknown',
    caps: [],
    minimumSpendMinor: null,
    validity: {
      from: null,
      to: /^\d{4}-\d{2}-\d{2}T00:00:00$/.test(row.fechaHasta)
        ? row.fechaHasta.slice(0, 10)
        : row.fechaHasta,
      weekdays,
    },
    channels: [...(row.pagoQR ? ['qr'] : []), ...(row.pagoNFC ? ['nfc'] : [])],
    where: null,
    legalText: null,
    warnings: ['Tope y compra mínima sin confirmar'],
  });
  if (!candidate.success) {
    add('shape_changed', candidate.error.message);
    return null;
  }
  return candidate.data;
}

const identitySchema = z.object({
  id: z.union([z.number().int(), z.string().min(1)]),
});

function invalidListing(raw: unknown): NormalizedListing | null {
  const identity = identitySchema.safeParse(raw);
  if (!identity.success) return null;
  const externalId = String(identity.data.id);
  const title = z.object({ titulo: z.string().min(1) }).safeParse(raw);
  return {
    source: 'galicia',
    externalId,
    bankSlugs: ['galicia'],
    title: title.success
      ? title.data.titulo
      : `Promoción Galicia ${externalId}`,
    brandName: null,
    sourceBrandId: null,
    rawCategories: [],
    tiers: null,
    rawTierSignal: null,
    terms: null,
    unpublishableReason:
      'El registro de Galicia tiene una estructura no reconocida',
    verify: {
      url: 'https://www.galicia.ar/personas/buscador-de-promociones',
      hint: title.success
        ? `Buscá «${title.data.titulo}»`
        : `Consultá la promoción ${externalId} en Galicia`,
    },
    listingHash: createHash('sha256').update(stable(raw)).digest('hex'),
    raw: { listing: raw, detail: null },
    detailFetchedAt: null,
    detailStale: false,
  };
}

function mapRow(
  raw: unknown,
  anomalies: AdapterAnomaly[],
): NormalizedListing | null {
  const parsed = rowSchema.safeParse(raw);
  if (!parsed.success) {
    anomalies.push({ kind: 'shape_changed', detail: parsed.error.message });
    return invalidListing(raw);
  }
  const row = parsed.data;
  const externalId = String(row.id);
  const add: AddAnomaly = (kind, detail) => {
    anomalies.push({ kind, detail, externalId });
  };
  const offer = offers(row.promocion);
  const weekdays = days(row.leyendaDiasAplicacion);
  if (!offer) add('unparsed_offer', row.promocion);
  if (weekdays === undefined) add('unparsed_days', row.leyendaDiasAplicacion);
  const facts = eligibility(row, add);
  const terms = parseTerms(row, add, facts, offer, weekdays);
  const { codes } = facts;
  return {
    source: 'galicia',
    externalId,
    bankSlugs: ['galicia'],
    title: row.titulo,
    brandName: row.titulo,
    sourceBrandId: row.idMarca === null ? null : String(row.idMarca),
    rawCategories: [`galicia:${row.subtitulo}`],
    tiers: codes ? { bankSlug: 'galicia', codes } : null,
    rawTierSignal: row.modeloAtencion.nombre,
    terms,
    unpublishableReason: terms
      ? null
      : 'No se pudieron interpretar los términos de Galicia',
    verify: {
      url: 'https://www.galicia.ar/personas/buscador-de-promociones',
      hint: `Buscá «${row.titulo}»`,
    },
    listingHash: createHash('sha256').update(stable(raw)).digest('hex'),
    raw: { listing: raw, detail: null },
    detailFetchedAt: null,
    detailStale: false,
  };
}

function collectRows(run: AdapterRun, list: unknown[], totalSize: number) {
  run.totalReported = totalSize;
  run.rawRowCount = list.length;
  for (const raw of list) {
    const id = identitySchema.safeParse(raw);
    if (id.success) run.observedExternalIds.push(String(id.data.id));
    const listing = mapRow(raw, run.anomalies);
    if (listing) run.listings.push(listing);
  }
  run.complete =
    list.length === totalSize &&
    run.anomalies.length === 0 &&
    run.listings.every((listing) => listing.terms !== null);
  run.outcome = run.complete ? 'ok' : 'partial';
}

export const galiciaAdapter: Adapter = {
  source: 'galicia',
  async run(ctx) {
    const run: AdapterRun = {
      source: 'galicia',
      bankSlug: 'galicia',
      startedAt: ctx.now,
      completedAt: ctx.now,
      outcome: 'failed',
      complete: false,
      totalReported: null,
      rawRowCount: 0,
      observedExternalIds: [],
      listings: [],
      anomalies: [],
      error: null,
    };
    try {
      const response = await ctx.fetchImpl(
        'https://loyalty.bff.bancogalicia.com.ar/api/portal/personalizacion/v1/promociones/catalogo?criterioDeOrden=Cuotas&page=1&pageSize=3000',
        { signal: AbortSignal.timeout(ctx.pacing?.timeoutMs ?? 30_000) },
      );
      if (!response.ok) throw new Error(`Galicia HTTP ${response.status}`);
      const body: unknown = await response.json();
      const envelope = z
        .object({
          data: z.object({
            totalSize: z.number().int().nonnegative(),
            list: z.array(z.unknown()),
          }),
        })
        .safeParse(body);
      if (!envelope.success) {
        run.anomalies.push({
          kind: 'shape_changed',
          detail: envelope.error.message,
        });
        return [run];
      }
      const { list, totalSize } = envelope.data.data;
      collectRows(run, list, totalSize);
    } catch (error) {
      run.error = error instanceof Error ? error.message : String(error);
    } finally {
      run.completedAt = new Date();
    }
    return [run];
  },
};

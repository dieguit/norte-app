import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CampaignTermsSchema } from '@repo/shared-types';
import { describe, expect, it, vi } from 'vitest';
import { galiciaAdapter } from './galicia';

const fixture = JSON.parse(
  readFileSync(
    resolve(
      __dirname,
      '../../../test/fixtures/benefits-v3/galicia/catalog.json',
    ),
    'utf8',
  ),
);
async function run(body: unknown = fixture) {
  const fetchImpl = vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response(JSON.stringify(body)));
  const [result] = await galiciaAdapter.run(
    {
      fetchImpl,
      now: new Date('2026-10-30T12:00:00Z'),
      knownDetails: new Map(),
    },
    [],
  );
  return { result: result!, fetchImpl };
}
function one(changes: Record<string, unknown>) {
  return {
    data: { totalSize: 1, list: [{ ...fixture.data.list[0], ...changes }] },
  };
}
describe('Galicia own catalog', () => {
  it('maps real records, all offer templates and all observed day/logo/tier variants', async () => {
    const { result, fetchImpl } = await run();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0]![0]).toContain('pageSize=3000');
    expect(fetchImpl.mock.calls[0]![1]?.signal).toBeInstanceOf(AbortSignal);
    expect(result).toMatchObject({
      outcome: 'ok',
      complete: true,
      bankSlug: 'galicia',
      rawRowCount: 40,
      totalReported: 40,
      anomalies: [],
    });
    expect(result.observedExternalIds).toHaveLength(40);
    for (const listing of result.listings) {
      expect(CampaignTermsSchema.safeParse(listing.terms).success).toBe(true);
      expect(listing.terms).toMatchObject({
        capState: 'unknown',
        caps: [],
        minimumSpendMinor: null,
        warnings: ['Tope y compra mínima sin confirmar'],
      });
      expect(listing.terms!.validity.to).toBe(
        (listing.raw.listing as { fechaHasta: string }).fechaHasta.slice(0, 10),
      );
    }
    expect(
      new Set(
        result.listings.map((l) =>
          l
            .terms!.offers.map((o) =>
              o.kind === 'percent' ? 'percent' : `installments:${o.upTo}`,
            )
            .join('+'),
        ),
      ),
    ).toEqual(
      new Set([
        'percent',
        'installments:true',
        'percent+installments:true',
        'percent+installments:false',
      ]),
    );
    const beauty = result.listings.filter((l) => l.sourceBrandId === '3713');
    expect(
      beauty.some(
        (l) =>
          l.tiers?.codes[0] === 'masivo' &&
          l.terms!.offers.some(
            (o) => o.kind === 'percent' && o.percentageBps === 1000,
          ),
      ),
    ).toBe(true);
    expect(
      beauty.some(
        (l) =>
          l.tiers?.codes[0] === 'eminent' &&
          l.terms!.offers.some(
            (o) => o.kind === 'percent' && o.percentageBps === 1500,
          ),
      ),
    ).toBe(true);
  });
  it.each([
    ['Cross', null],
    ['Masivo', ['masivo']],
    ['Eminent', ['eminent', 'eminent-black']],
    ['Eminent Black', ['eminent-black']],
  ])('binds %s to the correct eligibility fact', async (nombre, codes) => {
    const { result } = await run(
      one({ modeloAtencion: { nombre, exclusivo: false } }),
    );
    const listing = result.listings[0]!;
    expect(listing.tiers).toEqual(
      codes ? { bankSlug: 'galicia', codes } : null,
    );
    if (codes)
      expect(listing.terms!.eligibility).toMatchObject({
        allOf: expect.arrayContaining([
          {
            providerFact: {
              providerSlug: 'galicia',
              key: 'tier',
              values: codes,
            },
          },
        ]),
      });
  });
  it.each([
    ['  Lúnes  a   Miércoles ', [1, 2, 3]],
    ['Lunes, Martes y Domingo', [1, 2, 0]],
    ['Sábado y Domingo', [6, 0]],
    ['Viernes', [5]],
    ['Todos los días', null],
  ])('parses days %s', async (leyendaDiasAplicacion, expected) => {
    const { result } = await run(one({ leyendaDiasAplicacion }));
    expect(result.listings[0]!.terms!.validity.weekdays).toEqual(expected);
  });
  it('never treats an unknown segment as universally eligible', async () => {
    const { result } = await run(
      one({ haberes: false, modeloAtencion: { nombre: 'Nuevo' } }),
    );
    expect(result.listings[0]!.terms).toMatchObject({
      eligibilityCompleteness: 'incomplete',
      unresolved: ['Nivel Galicia sin confirmar: Nuevo'],
    });
    expect(result.anomalies).toEqual([
      {
        kind: 'unknown_tier_signal',
        detail: 'Nuevo',
        externalId: String(fixture.data.list[0].id),
      },
    ]);
  });
  it('keeps a salary requirement incomplete even for a known tier', async () => {
    const { result } = await run(
      one({ haberes: true, modeloAtencion: { nombre: 'Cross' } }),
    );
    expect(result.listings[0]!.terms).toMatchObject({
      eligibilityCompleteness: 'incomplete',
      unresolved: ['Requiere cobrar el sueldo en Galicia'],
    });
    expect(result.anomalies).toEqual([]);
  });
  it('preserves inclusive Argentina calendar dates without timezone conversion', async () => {
    const { result } = await run(one({ fechaHasta: '2028-02-29T00:00:00' }));
    expect(result.listings[0]!.terms!.validity).toMatchObject({
      from: null,
      to: '2028-02-29',
    });
  });
  it('keeps salary and unknown tiers unresolved; maps QR/NFC', async () => {
    const { result } = await run(
      one({
        haberes: true,
        modeloAtencion: { nombre: 'Nuevo' },
        pagoQR: true,
        pagoNFC: true,
      }),
    );
    expect(result.listings[0]!.terms).toMatchObject({
      eligibilityCompleteness: 'incomplete',
      unresolved: expect.arrayContaining([
        'Requiere cobrar el sueldo en Galicia',
      ]),
      channels: ['qr', 'nfc'],
    });
    expect(result.anomalies[0]!.kind).toBe('unknown_tier_signal');
  });
  it.each([
    ['promocion', 'unparsed_offer'],
    ['leyendaDiasAplicacion', 'unparsed_days'],
  ])('preserves observed ids for invalid %s', async (field, kind) => {
    const { result } = await run(one({ [field]: 'unknown' }));
    expect(result.listings[0]!.terms).toBeNull();
    expect(result).toMatchObject({ outcome: 'partial', complete: false });
    expect(result.observedExternalIds).toHaveLength(1);
    expect(result.anomalies[0]!.kind).toBe(kind);
  });
  it('fails closed for changed envelopes and partial rows, preserving valid ids', async () => {
    expect((await run({ data: {} })).result).toMatchObject({
      outcome: 'failed',
      complete: false,
      anomalies: [{ kind: 'shape_changed', detail: expect.any(String) }],
    });
    const { result } = await run(one({ titulo: null }));
    expect(result).toMatchObject({
      outcome: 'partial',
      complete: false,
    });
    expect(result.observedExternalIds).toHaveLength(1);
    expect(result.listings[0]).toMatchObject({
      source: 'galicia',
      bankSlugs: ['galicia'],
      externalId: String(fixture.data.list[0].id),
      terms: null,
      unpublishableReason: expect.any(String),
      raw: { listing: expect.objectContaining({ titulo: null }), detail: null },
      verify: { hint: expect.any(String) },
    });
  });
  it('does not invent an identity for malformed rows', async () => {
    const { result } = await run(one({ id: null, titulo: null }));
    expect(result).toMatchObject({
      outcome: 'partial',
      complete: false,
      listings: [],
      observedExternalIds: [],
    });
    expect(result.anomalies[0]!.kind).toBe('shape_changed');
  });
  it('rejects invalid calendar dates and mismatched totals', async () => {
    expect(
      (await run(one({ fechaHasta: '2026-02-30T00:00:00' }))).result.complete,
    ).toBe(false);
    expect(
      (await run({ data: { ...fixture.data, totalSize: 9999 } })).result,
    ).toMatchObject({ outcome: 'partial', complete: false });
  });
  it('hashes record content independently of key order', async () => {
    const original = one({});
    const reversed = {
      data: {
        totalSize: 1,
        list: [
          Object.fromEntries(Object.entries(original.data.list[0]).reverse()),
        ],
      },
    };
    expect((await run(original)).result.listings[0]!.listingHash).toBe(
      (await run(reversed)).result.listings[0]!.listingHash,
    );
  });
  it('uses explicit payment logos without inventing card types', async () => {
    const { result } = await run(
      one({ mediosDePago: ['TarjetaMasterCard.png', 'Vdebito80x80azul.png'] }),
    );
    expect(result.listings[0]!.terms!.eligibility).toMatchObject({
      allOf: expect.arrayContaining([
        {
          anyOf: [
            {
              card: { issuerProviderSlugs: ['galicia'], network: 'mastercard' },
            },
            {
              card: {
                issuerProviderSlugs: ['galicia'],
                network: 'visa',
                types: ['debit'],
              },
            },
          ],
        },
      ]),
    });
    const unknown = await run(one({ mediosDePago: ['NewLogo.png'] }));
    expect(unknown.result.listings[0]!.terms!.eligibilityCompleteness).toBe(
      'incomplete',
    );
  });
  it('handles HTTP failures', async () => {
    const [result] = await galiciaAdapter.run(
      {
        fetchImpl: vi
          .fn<typeof fetch>()
          .mockResolvedValue(new Response('', { status: 503 })),
        now: new Date(),
        knownDetails: new Map(),
      },
      [],
    );
    expect(result).toMatchObject({
      complete: false,
      outcome: 'failed',
      error: 'Galicia HTTP 503',
    });
  });
  const sample = '/tmp/opencode/benefits-spike/galicia.json';
  it.skipIf(!existsSync(sample))(
    'validates every record in the optional full real sample',
    async () => {
      const { result } = await run(JSON.parse(readFileSync(sample, 'utf8')));
      expect(result.rawRowCount).toBe(2244);
      expect(result.listings).toHaveLength(2244);
      expect(result.anomalies).toEqual([]);
      for (const listing of result.listings)
        expect(CampaignTermsSchema.safeParse(listing.terms).success).toBe(true);
    },
  );
});

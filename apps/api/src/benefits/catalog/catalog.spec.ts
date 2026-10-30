import { CARD_NETWORKS } from '@repo/shared-types';
import {
  CATALOG,
  INSTRUMENTS,
  resolveCandidateInstruments,
  type Provider,
} from './index';

describe('benefits catalog', () => {
  const all = CATALOG.flatMap((p) => p.instruments);
  const sources = CATALOG.flatMap((p) => p.sources);
  const provider = (slug: string) => CATALOG.find((p) => p.slug === slug)!;

  it('contains exactly the 17 providers with globally unique identifiers', () => {
    expect(CATALOG.map((p) => p.slug).sort()).toEqual(
      [
        'galicia',
        'macro',
        'santander',
        'bbva',
        'brubank',
        'modo',
        'naranjax',
        'personalpay',
        'uala',
        'mercadopago',
        'ypf',
        'shell',
        'meli',
        'uber',
        'pedidosya',
        'visa',
        'mastercard',
      ].sort(),
    );
    expect(new Set(CATALOG.map((p) => p.slug)).size).toBe(CATALOG.length);
    expect(new Set(all.map((i) => i.slug)).size).toBe(all.length);
    expect(new Set(sources.map((s) => s.id)).size).toBe(sources.length);
    expect(INSTRUMENTS.size).toBe(all.length);
  });

  it('has official HTTPS evidence and valid networks for every instrument', () => {
    expect(CARD_NETWORKS).toEqual(expect.arrayContaining(['amex', 'cabal']));
    for (const instrument of all) {
      expect(new URL(instrument.evidenceUrl).protocol).toBe('https:');
      if (instrument.network)
        expect(CARD_NETWORKS).toContain(instrument.network);
      if (instrument.type === 'membership')
        expect(instrument.usage).toBeDefined();
      else expect(instrument.issuerCountry).toBe('AR');
    }
    expect(INSTRUMENTS.get('galicia-eminent-visa-credito')).toMatchObject({
      tier: 'eminent',
      segment: 'eminent',
    });
  });

  it('enables only active sources and documents pending or blocked ones', () => {
    for (const p of CATALOG) {
      expect(p.sources.length).toBeGreaterThan(0);
      expect(resolveCandidateInstruments(p).length).toBeGreaterThan(0);
      for (const source of p.sources) {
        expect(source.id).toBeTruthy();
        expect(new URL(source.url).protocol).toBe('https:');
        if (source.enabled) expect(source.status).toBe('active');
        if (source.autoPublish) expect(source.enabled).toBe(true);
        if (source.status === 'blocked' || source.status.startsWith('pending_'))
          expect(source.note).toBeTruthy();
      }
    }
  });

  it('network providers have no own instruments and target only their network cards', () => {
    for (const p of CATALOG.filter((p) => p.kind === 'network')) {
      expect(p.instruments).toEqual([]);
      expect(
        resolveCandidateInstruments(p).every(
          (i) =>
            i.type !== 'membership' &&
            p.appliesTo &&
            'network' in p.appliesTo &&
            i.network === p.appliesTo.network,
        ),
      ).toBe(true);
    }
    const slugs = resolveCandidateInstruments(provider('visa')).map(
      (i) => i.slug,
    );
    expect(slugs).toContain('galicia-visa-debito');
    expect(slugs).toContain('santander-visa-debito');
    expect(slugs).not.toContain('galicia-mastercard-credito');
  });

  it('MODO targets bank cards and itself but no other memberships', () => {
    const candidates = resolveCandidateInstruments(provider('modo'));
    expect(candidates.map((i) => i.slug)).toEqual(
      expect.arrayContaining([
        'modo',
        'galicia-visa-debito',
        'santander-visa-credito',
      ]),
    );
    expect(
      candidates.filter((i) => i.type === 'membership').map((i) => i.slug),
    ).toEqual(['modo']);
  });

  it('uses the supplied catalog, preserves own instruments and deduplicates by slug', () => {
    const own = provider('galicia').instruments[0]!;
    const p: Provider = {
      slug: 'test',
      name: 'Test',
      kind: 'network',
      instruments: [own],
      sources: [],
      appliesTo: { network: 'visa' },
    };
    expect(
      resolveCandidateInstruments(p, [provider('galicia')]).map((i) => i.slug),
    ).toEqual([
      'galicia-visa-credito',
      'galicia-visa-debito',
      'galicia-eminent-visa-credito',
    ]);
    expect(
      resolveCandidateInstruments({ ...p, appliesTo: undefined }, CATALOG),
    ).toEqual([own]);
  });
});

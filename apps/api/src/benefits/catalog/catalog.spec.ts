import { CARD_NETWORKS } from '@repo/shared-types';
import { CATALOG, INSTRUMENTS, candidateInstruments, type Source } from './index';

describe('benefits catalog', () => {
  const all = CATALOG.flatMap((p) => p.instruments);

  it('has globally unique provider and instrument slugs', () => {
    expect(new Set(CATALOG.map((p) => p.slug)).size).toBe(CATALOG.length);
    expect(new Set(all.map((i) => i.slug)).size).toBe(all.length);
    expect(INSTRUMENTS.size).toBe(all.length);
  });

  it('every provider has a source and something to target', () => {
    for (const p of CATALOG) {
      expect(p.sources.length).toBeGreaterThan(0);
      expect(candidateInstruments(p).length).toBeGreaterThan(0);
      const firstSource: Source = p.sources[0]!;
      expect(firstSource.url).toBeDefined();
    }
  });

  it('network providers target other providers instruments of that network', () => {
    const visa = CATALOG.find((p) => p.slug === 'visa')!;
    const slugs = candidateInstruments(visa).map((i) => i.slug);
    expect(slugs).toContain('galicia-visa-credito');
    expect(slugs).not.toContain('galicia-mastercard-credito');
    for (const i of all) if (i.network) expect(CARD_NETWORKS).toContain(i.network);
  });
});


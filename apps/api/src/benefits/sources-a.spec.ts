import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CATALOG, resolveCandidateInstruments } from './catalog';
import { postProcess } from './harvest';

const fixtures = join(__dirname, '../../test/fixtures/benefits');

async function replay(sourceId: string) {
  const provider = CATALOG.find((p) =>
    p.sources.some((s) => s.id === sourceId),
  )!;
  const source = provider.sources.find((s) => s.id === sourceId)!;
  const content = await readFile(join(fixtures, `${sourceId}.body`), 'utf8');
  const raw = JSON.parse(
    await readFile(join(fixtures, `${sourceId}.llm.json`), 'utf8'),
  );
  return postProcess(raw, {
    provider,
    source,
    content,
    today: '2026-10-30',
    candidates: resolveCandidateInstruments(provider),
  });
}

describe('recorded JSON sources batch A', () => {
  it('keeps Galicia teaser restrictions unresolved rather than guaranteed', async () => {
    const result = await replay('galicia-promociones');
    expect(result.candidates).toHaveLength(6);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].reason).toContain('recurrence');
    const jumbo = result.candidates.find((c) =>
      c.snapshot.merchant?.toLowerCase().includes('jumbo'),
    )!.snapshot.rules;
    expect(jumbo.offer).toEqual({ type: 'discount', percentageBps: 2000 });
    expect(jumbo.validity.weekdays).toEqual([2, 4]);
    expect(jumbo.eligibilityCompleteness).toBe('incomplete');
    expect(jumbo.capState).toBe('unknown');
  });
  it('preserves MODO campaign caps and BBVA Mastercard eligibility', async () => {
    const result = await replay('modo-otras');
    expect(result.candidates).toHaveLength(7);
    expect(result.rejected).toMatchObject([
      { reason: 'Error: expired' },
      { reason: 'Error: expired' },
      { reason: 'Error: missing evidence: caps' },
    ]);
    const naldo = result.candidates.find((c) =>
      c.snapshot.merchant?.includes('Naldo'),
    )!.snapshot.rules;
    expect(naldo.caps).toEqual([
      { amountMinor: 2000000, period: 'campaign', scope: 'person' },
    ]);
    const farmacity = result.candidates.find((c) =>
      c.snapshot.merchant?.includes('Farmacity'),
    )!.snapshot.rules;
    expect(farmacity.eligibility).toEqual({
      allOf: [
        { membership: { instrumentSlug: 'modo' } },
        {
          card: {
            issuerProviderSlugs: ['bbva'],
            network: 'mastercard',
            types: ['credit'],
          },
        },
      ],
    });
    expect(farmacity.caps[0]).toEqual({
      amountMinor: 1500000,
      period: 'month',
      scope: 'person',
    });
  });
  it('preserves MODO supermarket caps and unknown issuers', async () => {
    const result = await replay('modo-supermercados');
    expect(result.candidates).toHaveLength(9);
    expect(result.rejected).toMatchObject([{ reason: 'Error: expired' }]);
    const changomas = result.candidates.find((c) =>
      c.snapshot.merchant?.includes('Chango'),
    )!.snapshot.rules;
    expect(changomas.caps).toEqual([
      { amountMinor: 1200000, period: 'week', scope: 'person' },
    ]);
    expect(changomas.eligibilityCompleteness).toBe('incomplete');
    expect(changomas.unresolved.join(' ')).toContain('Comafi');
    const anonima = result.candidates.find((c) =>
      c.snapshot.merchant?.includes('Anónima'),
    )!.snapshot.rules;
    expect(anonima.minimumSpendMinor).toBe(5000000);
    expect(anonima.caps).toEqual([
      { amountMinor: 1500000, period: 'month', scope: 'bank' },
    ]);
    expect(anonima.validity.weekdays).toEqual([5, 6]);
  });
  it('keeps Visa eligibility network-wide, not tied to a bank', async () => {
    const result = await replay('visa-offers');
    expect(result.candidates).toHaveLength(2);
    expect(result.rejected).toEqual([]);
    const coto = result.candidates.find((c) =>
      c.snapshot.merchant?.toLowerCase().includes('coto'),
    )!.snapshot.rules;
    expect(coto.eligibility).toEqual({
      card: { network: 'visa', types: ['debit'] },
    });
    expect(coto.offer).toEqual({ type: 'discount', percentageBps: 3000 });
    expect(coto.validity.weekdays).toEqual([4]);
  });
});

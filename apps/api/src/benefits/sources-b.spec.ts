import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CATALOG, resolveCandidateInstruments } from './catalog';
import { htmlToText, postProcess } from './harvest';

const fixtureDir = join(__dirname, '../../test/fixtures/benefits');

async function replay(sourceId: string) {
  const provider = CATALOG.find((p) =>
    p.sources.some((s) => s.id === sourceId),
  )!;
  const source = provider.sources.find((s) => s.id === sourceId)!;
  const rawBody = await readFile(join(fixtureDir, `${sourceId}.body`), 'utf8');
  const raw: unknown = JSON.parse(
    await readFile(join(fixtureDir, `${sourceId}.llm.json`), 'utf8'),
  );
  return postProcess(raw, {
    provider,
    source,
    rawBody,
    content: source.strategy === 'fetch' ? htmlToText(rawBody) : rawBody,
    candidates: resolveCandidateInstruments(provider),
    today: '2026-10-30',
  });
}

describe('recorded batch B sources', () => {
  it('retains Macro MODO requirements as unresolved and converts UTC validity', async () => {
    const result = await replay('macro-beneficios');
    expect(result.rejected).toMatchObject([{ reason: 'Error: expired' }]);
    expect(result.candidates).toHaveLength(19);
    expect(result.candidates[0].snapshot).toMatchObject({
      merchant: 'La Anónima',
      rules: {
        eligibilityCompleteness: 'incomplete',
        offer: { type: 'cashback', percentageBps: 2000 },
        capState: 'unknown',
        validity: { to: '2026-10-31', weekdays: [5, 6] },
        requiredActions: ['modo'],
      },
    });
    expect(result.candidates[1].snapshot.rules.validity.weekdays).toEqual([
      4, 5, 6,
    ]);
  });

  it('keeps the Selecta index incomplete rather than inventing card levels', async () => {
    const result = await replay('macro-selecta-beneficios');
    expect(result.rejected).toEqual([]);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].snapshot.rules).toMatchObject({
      eligibility: {
        card: { issuerProviderSlugs: ['macro'], segments: ['selecta'] },
      },
      eligibilityCompleteness: 'incomplete',
      offer: { type: 'installments', installments: 6 },
      capState: 'unknown',
    });
  });

  it('distinguishes Ualá credit, prepaid and Contactless without inventing terms', async () => {
    const result = await replay('uala-promociones');
    expect(result.rejected).toEqual([]);
    expect(result.candidates).toHaveLength(9);
    const samples = result.candidates.map((c) => c.snapshot);
    expect(samples[0].rules.offer).toEqual({
      type: 'cashback',
      percentageBps: 1000,
    });
    expect(samples[1].rules.channels.allowed).toContain('contactless');
    expect(samples[2]).toMatchObject({
      merchant: 'PedidosYa Mascotas',
      rules: {
        eligibility: {
          card: {
            instrumentSlugs: ['uala-mastercard-credito'],
            types: ['credit'],
          },
        },
        offer: { type: 'cashback', percentageBps: 2500 },
        eligibilityCompleteness: 'incomplete',
      },
    });
  });

  it('retains Brubank plan and payment restrictions', async () => {
    const result = await replay('brubank-beneficios');
    expect(result.rejected).toEqual([]);
    expect(result.candidates).toHaveLength(3);
    expect(result.candidates[0].snapshot.rules.eligibility).toEqual({
      allOf: [
        {
          providerFact: {
            providerSlug: 'brubank',
            key: 'plan',
            values: ['Ultra'],
          },
        },
        { card: { issuerProviderSlugs: ['brubank'], types: ['credit'] } },
      ],
    });
    expect(result.candidates[2].snapshot.rules).toMatchObject({
      offer: { type: 'discount', percentageBps: 3000 },
      capState: 'none',
      validity: { weekdays: [4] },
      eligibilityCompleteness: 'incomplete',
    });
  });

  it('retains Personal Pay centavos, weekly caps and loyalty level', async () => {
    const result = await replay('personalpay-beneficios');
    expect(result.rejected).toEqual([]);
    expect(result.candidates).toHaveLength(3);
    expect(result.candidates[0].snapshot.rules).toMatchObject({
      offer: { type: 'cashback', percentageBps: 1000 },
      caps: [{ amountMinor: 300000, period: 'week', scope: null }],
      minimumSpendMinor: 5000,
      eligibilityCompleteness: 'incomplete',
    });
    expect(result.candidates[1].snapshot.rules.caps[0].amountMinor).toBe(
      30000000,
    );
    expect(result.candidates[2].snapshot.rules).toMatchObject({
      eligibility: {
        allOf: [
          { membership: { instrumentSlug: 'personalpay-billetera' } },
          {
            providerFact: {
              providerSlug: 'personalpay',
              key: 'loyaltyLevel',
              values: ['LVL01'],
            },
          },
        ],
      },
      caps: [{ amountMinor: 75000, period: 'month', scope: null }],
    });
  });
});

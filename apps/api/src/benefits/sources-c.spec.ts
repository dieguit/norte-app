import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { BenefitCategorySchema, BenefitRulesSchema } from '@repo/shared-types';
import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { PROTECTABLE_FIELDS } from './benefits.types';
import { CATALOG, resolveCandidateInstruments } from './catalog';
import { htmlToText, postProcess } from './harvest';

const fixtureDir = join(__dirname, '../../test/fixtures/benefits');

async function replay(id: string) {
  const provider = CATALOG.find((p) => p.sources.some((s) => s.id === id))!;
  const source = provider.sources.find((s) => s.id === id)!;
  const body = await readFile(join(fixtureDir, `${id}.body`), 'utf8');
  const raw = JSON.parse(
    await readFile(join(fixtureDir, `${id}.llm.json`), 'utf8'),
  );
  return postProcess(raw, {
    provider,
    source,
    rawBody: body,
    content: htmlToText(body),
    today: '2026-10-30',
    candidates: resolveCandidateInstruments(provider),
  });
}

describe('membership source recordings', () => {
  it.each([
    ['naranjax-plan-turbo', 2500, 950000, 400000, 4000000],
    ['naranjax-plan-epico', 3000, 1200000, 500000, 5000000],
  ] as const)(
    'replays %s without mixing plans',
    async (id, bps, weekly, services, travel) => {
      const result = await replay(id);
      expect(result.rejected).toEqual([]);
      expect(result.candidates).toHaveLength(3);
      const rules = result.candidates.map((c) => c.snapshot.rules);
      for (const rule of rules) {
        expect(rule.recurrence).toBe('ongoing');
        expect(rule.offer).toEqual({ type: 'cashback', percentageBps: bps });
        expect(JSON.stringify(rule.eligibility)).toContain(id);
      }
      expect(rules[0]).toMatchObject({
        eligibility: {
          allOf: [
            { membership: { instrumentSlug: id } },
            {
              card: {
                issuerProviderSlugs: ['naranjax'],
                types: ['credit', 'debit'],
              },
            },
          ],
        },
        eligibilityCompleteness: 'incomplete',
        caps: [{ amountMinor: weekly, period: 'week', scope: 'account' }],
        validity: { weekdays: [2] },
      });
      expect(rules[1]).toMatchObject({
        eligibility: { membership: { instrumentSlug: id } },
        caps: [{ amountMinor: services, period: 'month' }],
        channels: { allowed: ['app'], excluded: ['debito_automatico'] },
      });
      expect(rules[1].requiredActions.join(' ')).toMatch(/resumen/);
      expect(rules[2]).toMatchObject({
        eligibility: {
          allOf: [
            { membership: { instrumentSlug: id } },
            {
              anyOf: [
                {
                  card: {
                    issuerProviderSlugs: ['naranjax'],
                    types: ['credit'],
                  },
                },
                {
                  card: {
                    issuerProviderSlugs: ['naranjax'],
                    network: 'visa',
                    types: ['debit'],
                  },
                },
              ],
            },
          ],
        },
        caps: [{ amountMinor: travel, period: 'month' }],
      });
    },
  );

  it.each(['ypf-serviclub', 'meli-plus'])(
    'does not invent perks from weak %s content',
    async (id) => {
      expect(await replay(id)).toEqual({ candidates: [], rejected: [] });
      const source = CATALOG.flatMap((p) => p.sources).find(
        (s) => s.id === id,
      )!;
      expect(source.enabled).toBe(false);
      expect(source.autoPublish).toBe(false);
    },
  );

  it('replays Uber One as ongoing perks, not guaranteed cash discounts', async () => {
    const result = await replay('uber-one');
    expect(result.rejected).toEqual([]);
    expect(result.candidates).toHaveLength(4);
    for (const {
      snapshot: { rules },
    } of result.candidates) {
      expect(rules).toMatchObject({
        eligibility: { membership: { instrumentSlug: 'uber-one' } },
        recurrence: 'ongoing',
        capState: 'unknown',
        caps: [],
        offer: { type: 'other' },
      });
    }
    const [delivery, service, credits] = result.candidates.map(
      (c) => c.snapshot.rules,
    );
    expect(delivery.minimumSpendMinor).toBeNull();
    expect(delivery.requiredActions.join(' ')).toContain(
      'ciudades seleccionadas',
    );
    expect(service.requiredActions.join(' ')).toContain('impuestos, propinas');
    expect(credits.offer).toMatchObject({
      description: expect.stringContaining('15%'),
    });
    expect(credits.requiredActions.join(' ')).toContain('60 días');
    expect(credits.stackable).toBe('no');
  });
});

it('validates every manual perk with the add command schema without running its DB entrypoint', async () => {
  const script = await readFile(join(__dirname, 'review.script.ts'), 'utf8');
  // The CLI schema is private; evaluate its declarations, never its DB entrypoint.
  const declarations = script.slice(
    script.indexOf('const fields ='),
    script.indexOf('type Database ='),
  );
  const schema = runInNewContext(`${declarations}\naddSchema`, {
    z,
    BenefitCategorySchema,
    BenefitRulesSchema,
    CATALOG,
    PROTECTABLE_FIELDS,
  }) as z.ZodType;
  const dir = join(__dirname, 'manual/perks');
  const files = (await readdir(dir)).filter((name) => name.endsWith('.json'));
  expect(files.length).toBeGreaterThan(0);
  const terms = (
    await readFile(join(fixtureDir, 'shell-box.body'), 'utf8')
  ).replace(/\s+/g, ' ');
  for (const name of files) {
    const input = JSON.parse(await readFile(join(dir, name), 'utf8'));
    expect(schema.safeParse(input).success, name).toBe(true);
    expect(input.rules.recurrence).toBe('ongoing');
    expect(input.evidence.sourceUrl).toMatch(/^https:\/\//);
    if (input.publisherProviderSlug === 'shell')
      for (const { quote } of input.evidence.quotes)
        expect(terms).toContain(quote.replace(/\s+/g, ' '));
  }
});

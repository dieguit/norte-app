import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { runHarvest, postProcess, htmlToText, buildPrompt } from './harvest';
import type { HarvestOptions } from './benefits.types';
import {
  CATALOG,
  resolveCandidateInstruments,
  type Provider,
  type Source,
} from './catalog';

const source: Source = {
  id: 'test',
  url: 'https://example.test/promos',
  strategy: 'json',
  instructions: 'official',
  enabled: true,
  autoPublish: false,
  status: 'active',
  coverage: 'full',
};
const provider: Provider = {
  slug: 'modo',
  name: 'MODO',
  kind: 'wallet',
  instruments: [
    {
      slug: 'card',
      type: 'credit',
      label: 'Card',
      evidenceUrl: 'https://example.test',
    },
  ],
  sources: [source],
};
const rules = {
  eligibility: { card: { instrumentSlugs: ['card'] } },
  eligibilityCompleteness: 'complete',
  unresolved: [],
  offer: { type: 'discount', percentageBps: 2000 },
  currency: 'ARS',
  minimumSpendMinor: null,
  capState: 'unknown',
  caps: [],
  validity: { from: null, to: '2026-12-31', weekdays: null, monthDays: null },
  channels: { allowed: [], excluded: [] },
  requiredActions: [],
  stackable: 'unknown',
  recurrence: 'campaign',
};
const item = (over: Record<string, unknown> = {}) => ({
  title: '20% Coto',
  merchant: ' Coto ',
  category: 'supermercado',
  upstreamId: 'campaign1',
  detailUrl: null,
  termsUrl: null,
  rulesJson: JSON.stringify(rules),
  quotes: ['eligibility', 'offer', 'validity'].map((field) => ({
    field,
    quote: '20%',
  })),
  ...over,
});
const content = '{"benefits":[{"id":"campaign1","benefit":"20% Coto"}]}';
const options = (over: Partial<HarvestOptions> = {}): HarvestOptions => ({
  providers: [provider],
  includeDisabled: false,
  policies: new Map(),
  now: new Date('2026-10-30T12:00:00Z'),
  extract: vi.fn().mockResolvedValue({ benefits: [item()] }),
  fetchImpl: vi
    .fn()
    .mockImplementation(() => Promise.resolve(new Response(content))),
  ...over,
});
const context = {
  provider,
  source,
  candidates: provider.instruments,
  content,
  today: '2026-10-30',
  providers: [provider],
};

describe('harvest', () => {
  it('chunks every sibling promo collection without dropping records', async () => {
    const offers = [{ id: 'campaign1', benefit: '20% Coto' }];
    const cashback = [{ id: 'campaign2', benefit: '20% Coto' }];
    const chunks: { records: unknown[] }[] = [];
    const extract = vi.fn(async (prompt: string) => {
      chunks.push(JSON.parse(prompt.split('Contenido:\n')[1]));
      return { benefits: [item()] };
    });
    const [result] = await runHarvest(
      options({
        extract,
        fetchImpl: vi
          .fn()
          .mockResolvedValue(
            new Response(JSON.stringify({ offers, cashback })),
          ),
      }),
    );
    expect(chunks.flatMap((c) => c.records)).toEqual(
      expect.arrayContaining([...offers, ...cashback]),
    );
    expect(chunks.flatMap((c) => c.records)).toHaveLength(2);
    expect(result).toMatchObject({
      outcome: 'ok',
      complete: true,
      truncated: false,
    });
  });
  it('keeps sibling array elements without promos as context', async () => {
    const body = {
      sections: [
        { title: 'A', items: [{ benefit: '20% Coto' }] },
        { title: 'Legal', text: 'Exclusiones: X' },
      ],
    };
    const prompts: string[] = [];
    const [result] = await runHarvest(
      options({
        extract: vi.fn(async (prompt: string) => {
          prompts.push(prompt);
          return { benefits: [item()] };
        }),
        fetchImpl: vi
          .fn()
          .mockResolvedValue(new Response(JSON.stringify(body))),
      }),
    );
    expect(prompts.join('\n')).toContain('Exclusiones: X');
    expect(result.diagnostics).not.toContain('json shape ambiguous');
  });
  it('marks dropped shared terms partial and reports their path', async () => {
    const body = {
      provider: {
        terms: 'Condiciones legales. '.repeat(100),
        offers: [{ benefit: '20% Coto' }],
      },
    };
    const [result] = await runHarvest(
      options({
        extract: null,
        fetchImpl: vi
          .fn()
          .mockResolvedValue(new Response(JSON.stringify(body))),
      }),
    );
    expect(result).toMatchObject({ outcome: 'partial', complete: false });
    expect(result.diagnostics).toContain(
      'json context dropped: $.provider.terms',
    );
  });
  it('marks JSON without recognizable promo collections ambiguous', async () => {
    const [result] = await runHarvest(
      options({
        extract: null,
        fetchImpl: vi
          .fn()
          .mockResolvedValue(new Response('{"records":[{"title":"Listing"}]}')),
      }),
    );
    expect(result).toMatchObject({ outcome: 'partial', complete: false });
    expect(result.diagnostics).toContain('json shape ambiguous');
  });
  it.each([
    ['modo-destacados', 10],
    ['galicia-promociones', 26],
    ['personalpay-beneficios', 85],
  ])(
    'preserves whole records in %s without an LLM',
    async (sourceId, count) => {
      const fixtureDir = join(__dirname, '../../test/fixtures/benefits');
      const raw = JSON.parse(
        await readFile(join(fixtureDir, `${sourceId}.body`), 'utf8'),
      );
      const chunks: {
        path: string;
        records: any[];
        context: Record<string, unknown>;
      }[] = [];
      const extract = vi.fn(async (prompt: string) => {
        const chunk = prompt.split('Contenido:\n')[1];
        expect(chunk.length).toBeLessThanOrEqual(60000);
        chunks.push(JSON.parse(chunk));
        return { benefits: [] };
      });
      const [result] = await runHarvest(
        options({
          fixtureDir,
          extract,
          providers: [{ ...provider, sources: [{ ...source, id: sourceId }] }],
        }),
      );
      const records = chunks.flatMap((chunk) => chunk.records);
      expect(records).toHaveLength(count);
      expect(result.truncated).toBe(false);
      if (sourceId === 'modo-destacados') {
        expect(records).toEqual(raw.slots[0].cards);
        expect(chunks[0].context['$.slots.0']).toMatchObject({
          slot_id: raw.slots[0].slot_id,
          slot_title: raw.slots[0].slot_title,
        });
        for (const record of records) {
          expect(record.card.benefit).toBeDefined();
          expect(record.benefit.conditions.schedule).toBeDefined();
        }
      } else if (sourceId === 'personalpay-beneficios') {
        expect(records).toEqual(
          raw.pageProps.onDemandProps.initialBenefits.data.benefits,
        );
      } else {
        expect(records).toEqual(
          Object.entries(raw[':items']).map(([key, record]) => ({
            key,
            record,
          })),
        );
      }
    },
  );
  it('does not confuse CDN, analytics or reCAPTCHA assets with challenges', async () => {
    const body = `<script src="https://cdnjs.cloudflare.com/app.js"></script><script src="https://static.cloudflareinsights.com/beacon.js"></script><script src="/cdn-cgi/challenge-platform/scripts/precursor/main.js?ray=test"></script><div class="grecaptcha-badge"></div><form id="login"><input type="password"></form><p>${'Beneficios disponibles para clientes. '.repeat(100)}</p>`;
    const [result] = await runHarvest(
      options({
        extract: null,
        providers: [
          { ...provider, sources: [{ ...source, strategy: 'fetch' }] },
        ],
        fetchImpl: vi.fn().mockResolvedValue(new Response(body)),
      }),
    );
    expect(result.outcome).toBe('ok');
  });
  it.each([
    '<h1>Just a moment...</h1><p>Checking your browser</p>',
    '<p>Accedé a tu cuenta</p><form id="login"><input type="password"></form>',
    '<script>window._cf_chl_opt = {};</script>',
    '<script src="/cdn-cgi/challenge-platform/h/b/orchestrate/chl_page/v1"></script>',
  ])('blocks visible challenges and short login pages', async (body) => {
    const [result] = await runHarvest(
      options({
        extract: null,
        providers: [
          { ...provider, sources: [{ ...source, strategy: 'fetch' }] },
        ],
        fetchImpl: vi.fn().mockResolvedValue(new Response(body)),
      }),
    );
    expect(result.outcome).toBe('blocked');
    expect(result.diagnostics).toContain('challenge/login detected');
  });
  it('marks empty extraction partial and incomplete', async () => {
    const [result] = await runHarvest(
      options({ extract: vi.fn().mockResolvedValue({ benefits: [] }) }),
    );
    expect(result).toMatchObject({ outcome: 'partial', complete: false });
    expect(result.diagnostics).toContain('empty extraction');
  });
  it('blocks private redirects before fetching their target', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response('', {
        status: 302,
        headers: { location: 'http://127.0.0.1/private' },
      }),
    );
    const [result] = await runHarvest(options({ fetchImpl }));
    expect(result.outcome).toBe('blocked');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][1].redirect).toBe('manual');
  });
  it('blocks redirects to another domain sharing the public suffix', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response('', {
        status: 302,
        headers: { location: 'https://attacker.test/promos' },
      }),
    );
    const [result] = await runHarvest(options({ fetchImpl }));
    expect(result.outcome).toBe('blocked');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it('follows allowed redirects and bounds redirect chains', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('', { status: 302, headers: { location: '/next' } }),
      )
      .mockResolvedValueOnce(new Response(content));
    expect((await runHarvest(options({ fetchImpl })))[0].outcome).toBe('ok');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const loop = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(
          new Response('', { status: 302, headers: { location: '/loop' } }),
        ),
      );
    expect((await runHarvest(options({ fetchImpl: loop })))[0].outcome).toBe(
      'blocked',
    );
    expect(loop).toHaveBeenCalledTimes(6);
  });
  it('blocks cross-host redirects and tiny app shells', async () => {
    const response = new Response(content);
    Object.defineProperty(response, 'url', {
      value: 'https://login.example.test/login',
    });
    const [redirect] = await runHarvest(
      options({ fetchImpl: vi.fn().mockResolvedValue(response) }),
    );
    expect(redirect.outcome).toBe('blocked');
    const [shell] = await runHarvest(
      options({
        providers: [
          { ...provider, sources: [{ ...source, strategy: 'fetch' }] },
        ],
        fetchImpl: vi
          .fn()
          .mockResolvedValue(new Response('<div id="root"></div>')),
      }),
    );
    expect(shell.outcome).toBe('blocked');
  });
  it('retries a network failure once and rejects malformed JSON', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(new Response(content));
    expect((await runHarvest(options({ fetchImpl })))[0].outcome).toBe('ok');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(
      (
        await runHarvest(
          options({
            fetchImpl: vi.fn().mockResolvedValue(new Response('not json')),
          }),
        )
      )[0].outcome,
    ).toBe('failed');
  });
  it.each([
    ['challenge', '<html>Just a moment...</html>', 200, 'fetch'],
    ['JSON error', '{"error":"denied"}', 200, 'json'],
    ['403', '{}', 403, 'json'],
  ])('blocks %s', async (_name, body, status, strategy) => {
    const [r] = await runHarvest(
      options({
        providers: [
          {
            ...provider,
            sources: [{ ...source, strategy: strategy as Source['strategy'] }],
          },
        ],
        fetchImpl: vi.fn().mockResolvedValue(new Response(body, { status })),
      }),
    );
    expect(r.outcome).toBe('blocked');
    expect(r.complete).toBe(false);
    expect(r.llm).toBe(false);
  });
  it('retries 503 once', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response(content));
    const [r] = await runHarvest(options({ fetchImpl }));
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(r.outcome).toBe('ok');
    expect(r.candidates).toHaveLength(1);
  });
  it('bounds chunks and reports truncation', async () => {
    const extract = vi.fn().mockResolvedValue({ benefits: [] });
    const [r] = await runHarvest(
      options({
        extract,
        providers: [
          { ...provider, sources: [{ ...source, strategy: 'fetch' }] },
        ],
        fetchImpl: vi
          .fn()
          .mockResolvedValue(new Response(`<p>${'x'.repeat(250000)}</p>`)),
      }),
    );
    expect(r).toMatchObject({
      outcome: 'partial',
      complete: false,
      truncated: true,
    });
    expect(extract).toHaveBeenCalledTimes(4);
  });
  it('no-llm performs only checks', async () => {
    const [r] = await runHarvest(options({ extract: null }));
    expect(r).toMatchObject({ outcome: 'ok', llm: false, candidates: [] });
  });
  it('chunks JSON into valid documents containing whole records and small context', async () => {
    const records = Array.from({ length: 40 }, (_, id) => ({
      id,
      description: 'x'.repeat(2500),
    }));
    const chunks: { records: { id: number }[]; context: unknown }[] = [];
    const extract = vi.fn(async (prompt: string) => {
      const text = prompt.split('Contenido:\n')[1];
      expect(text.length).toBeLessThanOrEqual(60000);
      const chunk = JSON.parse(text);
      expect(chunk.records.length).toBeLessThanOrEqual(15);
      chunks.push(chunk);
      return { benefits: [] };
    });
    const [result] = await runHarvest(
      options({
        extract,
        fetchImpl: vi
          .fn()
          .mockResolvedValue(
            new Response(
              JSON.stringify({ currency: 'ARS', benefits: records }),
            ),
          ),
      }),
    );
    expect(chunks.flatMap((c) => c.records.map((r) => r.id))).toEqual(
      records.map((r) => r.id),
    );
    expect(chunks[0].context).toMatchObject({ $: { currency: 'ARS' } });
    expect(result.truncated).toBe(false);
    expect(extract).toHaveBeenCalledTimes(3);
  });
  it('marks JSON beyond eight chunks partial and incomplete', async () => {
    const extract = vi.fn().mockResolvedValue({ benefits: [] });
    const records = Array.from({ length: 130 }, (_, id) => ({
      id,
      title: 'campaign',
    }));
    const [result] = await runHarvest(
      options({
        extract,
        fetchImpl: vi
          .fn()
          .mockResolvedValue(new Response(JSON.stringify({ records }))),
      }),
    );
    expect(extract).toHaveBeenCalledTimes(8);
    expect(result).toMatchObject({
      outcome: 'partial',
      complete: false,
      truncated: true,
    });
  });
  it('saves and replays a fixture without network', async () => {
    const dir = await mkdtemp('/tmp/opencode/benefits-');
    try {
      await runHarvest(options({ saveFixtureDir: dir }));
      expect(await readFile(join(dir, 'test.body'), 'utf8')).toBe(content);
      const fetchImpl = vi.fn();
      const [r] = await runHarvest(options({ fixtureDir: dir, fetchImpl }));
      expect(fetchImpl).not.toHaveBeenCalled();
      expect(r.provenance).toBe('fixture');
      expect(r.candidates).toHaveLength(1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
  it('reads manual text and rejects traversal', async () => {
    const manual = { ...source, strategy: 'file' as const, url: 'sample.txt' };
    const [r] = await runHarvest(
      options({ providers: [{ ...provider, sources: [manual] }] }),
    );
    expect(r.outcome).toBe('ok');
    const [bad] = await runHarvest(
      options({
        providers: [
          { ...provider, sources: [{ ...manual, url: '../harvest.ts' }] },
        ],
      }),
    );
    expect(bad.outcome).toBe('failed');
    expect(bad.diagnostics.join()).toContain('traversal');
  });
  it('applies policy overrides, source filter and includeDisabled', async () => {
    expect(
      await runHarvest(
        options({ policies: new Map([['test', { enabled: false }]]) }),
      ),
    ).toEqual([]);
    expect(await runHarvest(options({ sourceIds: ['other'] }))).toEqual([]);
    expect(
      await runHarvest(
        options({
          includeDisabled: true,
          policies: new Map([['test', { enabled: false }]]),
        }),
      ),
    ).toHaveLength(1);
  });
  it('retains campaigns in each MODO slot and deduplicates within a source', async () => {
    const results = await runHarvest(
      options({
        extract: vi.fn().mockResolvedValue({ benefits: [item(), item()] }),
        providers: [
          { ...provider, sources: [source, { ...source, id: 'slot2' }] },
        ],
      }),
    );
    expect(results.map((r) => r.candidates.length)).toEqual([1, 1]);
  });
  it('fails oversized bodies and unsupported URLs', async () => {
    const [large] = await runHarvest(
      options({
        fetchImpl: vi
          .fn()
          .mockResolvedValue(
            new Response('x', { headers: { 'content-length': '4000000' } }),
          ),
      }),
    );
    expect(large.diagnostics.join()).toContain('too large');
    const [bad] = await runHarvest(
      options({
        providers: [
          { ...provider, sources: [{ ...source, url: 'ftp://example.test' }] },
        ],
      }),
    );
    expect(bad.outcome).toBe('blocked');
  });
});
describe('postProcess', () => {
  it('replays recorded MODO output and normalizes only optional nulls', async () => {
    const fixtureDir = join(__dirname, '../../test/fixtures/benefits');
    const raw = JSON.parse(
      await readFile(join(fixtureDir, 'modo-destacados.llm.json'), 'utf8'),
    );
    const content = await readFile(
      join(fixtureDir, 'modo-destacados.body'),
      'utf8',
    );
    const provider = CATALOG.find((p) => p.slug === 'modo')!;
    const source = provider.sources.find((s) => s.id === 'modo-destacados')!;
    const ctx = {
      provider,
      source,
      content,
      today: '2026-10-30',
      candidates: resolveCandidateInstruments(provider),
    };
    const recorded = postProcess(raw, ctx);
    expect(recorded.rejected).toMatchObject([{ reason: 'Error: expired' }]);
    expect(recorded.candidates).toHaveLength(9);
    const sample = raw.benefits[0];
    const rules = JSON.parse(sample.rulesJson);
    Object.assign(rules.eligibility.allOf[1].card, {
      network: null,
      instrumentSlugs: null,
      issuerProviderSlugs: null,
      excludedIssuerProviderSlugs: null,
      productLevels: null,
      segments: null,
      issuerCountries: null,
    });
    rules.caps[0].sharedCapGroupId = null;
    rules.minimumSpendMinor = null;
    rules.caps[0].amountMinor = null;
    rules.unresolved = [
      {
        field: 'issuerProviderSlugs',
        reason: 'bancos participantes no identificados',
      },
    ];
    const normalized = postProcess(
      { benefits: [{ ...sample, rulesJson: JSON.stringify(rules) }] },
      ctx,
    );
    expect(normalized.rejected).toEqual([]);
    const actual = normalized.candidates[0].snapshot.rules;
    expect(actual.eligibility).toEqual({
      allOf: [
        { membership: { instrumentSlug: 'modo' } },
        { card: { types: ['credit', 'debit'] } },
      ],
    });
    expect(actual.caps[0]).not.toHaveProperty('sharedCapGroupId');
    expect(actual.caps[0].amountMinor).toBeNull();
    expect(actual.minimumSpendMinor).toBeNull();
    expect(actual.unresolved).toEqual([
      'issuerProviderSlugs: bancos participantes no identificados',
    ]);
    expect(actual.validity.monthDays).toBeNull();
    rules.eligibility.allOf[1].card = { types: null };
    expect(
      postProcess(
        { benefits: [{ ...sample, rulesJson: JSON.stringify(rules) }] },
        ctx,
      ).rejected[0].reason,
    ).toContain('CardSelector vacío');
    expect(buildPrompt(source, ctx.candidates, ctx.today)).toContain(
      'nunca {card:{}}',
    );
  });
  it.each([
    { field: 'issuerProviderSlugs', reason: 42 },
    { field: 'issuerProviderSlugs', reason: '' },
    { field: 'issuerProviderSlugs', reason: 'unknown', extra: true },
  ])(
    'rejects unresolved objects that cannot be normalized losslessly',
    (unresolved) => {
      const rulesJson = JSON.stringify({ ...rules, unresolved: [unresolved] });
      expect(
        postProcess({ benefits: [item({ rulesJson })] }, context).rejected[0]
          .reason,
      ).toContain('unresolved');
    },
  );
  it.each([
    [[], 'missing evidence: eligibility'],
    [[{ field: 'eligibility', quote: '20%' }], 'missing evidence: offer'],
    [[{ field: 'madeUp', quote: '20%' }], 'unknown evidence field'],
    [
      ['eligibility', 'offer'].map((field) => ({ field, quote: '20%' })),
      'missing evidence: validity',
    ],
  ])('rejects missing or unrecognized evidence %j', (quotes, reason) => {
    expect(
      postProcess({ benefits: [item({ quotes })] }, context).rejected[0].reason,
    ).toContain(reason);
  });
  it('requires cap evidence to claim there is no cap', () => {
    const rulesJson = JSON.stringify({ ...rules, capState: 'none', caps: [] });
    expect(
      postProcess({ benefits: [item({ rulesJson })] }, context).rejected[0]
        .reason,
    ).toContain('missing evidence: caps');
  });
  it('requires cap evidence for known caps', () => {
    const rulesJson = JSON.stringify({
      ...rules,
      capState: 'known',
      caps: [{ amountMinor: 10000, period: 'month', scope: null }],
    });
    expect(
      postProcess({ benefits: [item({ rulesJson })] }, context).rejected[0]
        .reason,
    ).toContain('missing evidence: caps');
  });
  it.each([
    [
      'unknown slug',
      { ...rules, eligibility: { card: { instrumentSlugs: ['missing'] } } },
    ],
    [
      'card as membership',
      { ...rules, eligibility: { membership: { instrumentSlug: 'card' } } },
    ],
    [
      'expired',
      { ...rules, validity: { ...rules.validity, to: '2026-01-01' } },
    ],
    [
      'unknown issuer',
      { ...rules, eligibility: { card: { issuerProviderSlugs: ['missing'] } } },
    ],
    [
      'fact type',
      {
        ...rules,
        eligibility: {
          providerFact: {
            providerSlug: 'modo',
            key: 'salaryAccount',
            values: ['yes'],
          },
        },
      },
    ],
  ])('rejects %s', (_name, badRules) => {
    expect(
      postProcess(
        { benefits: [item({ rulesJson: JSON.stringify(badRules) })] },
        context,
      ).rejected,
    ).toHaveLength(1);
  });
  it('rejects non-verbatim quotes, deep trees and oversized rules', () => {
    expect(
      postProcess(
        { benefits: [item({ quotes: [{ field: 'offer', quote: '30%' }] })] },
        context,
      ).rejected,
    ).toHaveLength(1);
    let eligibility: unknown = rules.eligibility;
    for (let i = 0; i < 6; i++) eligibility = { allOf: [eligibility] };
    expect(
      postProcess(
        {
          benefits: [
            item({ rulesJson: JSON.stringify({ ...rules, eligibility }) }),
          ],
        },
        context,
      ).rejected[0].reason,
    ).toContain('deep');
    expect(
      postProcess(
        { benefits: [item({ rulesJson: ' '.repeat(20001) })] },
        context,
      ).rejected[0].reason,
    ).toContain('too large');
  });
  it('namespaces upstream identities and fingerprints normalized merchant', () => {
    expect(
      postProcess({ benefits: [item()] }, context).candidates[0].identityKey,
    ).toBe('modo:campaign1');
    const a = postProcess({ benefits: [item({ upstreamId: null })] }, context)
      .candidates[0];
    const b = postProcess(
      {
        benefits: [
          item({ upstreamId: null, merchant: 'coto', title: 'Different' }),
        ],
      },
      context,
    ).candidates[0];
    expect(a.identityKey).toMatch(/^fp:[a-f0-9]{64}$/);
    expect(a.identityKey).toBe(b.identityKey);
    expect(a.contentHash).not.toBe(b.contentHash);
  });
  it('normalizes quote whitespace', () => {
    expect(
      postProcess(
        {
          benefits: [
            item({
              quotes: ['eligibility', 'offer', 'validity'].map((field) => ({
                field,
                quote: '20%   Coto',
              })),
            }),
          ],
        },
        context,
      ).candidates,
    ).toHaveLength(1);
  });
});
it('strips scripts and includes all instrument metadata in prompt', () => {
  expect(htmlToText('<script>bad</script><p>20% &amp; más</p>')).toBe(
    '20% & más',
  );
  expect(buildPrompt(source, provider.instruments, '2026-10-30')).toContain(
    'rulesJson',
  );
});

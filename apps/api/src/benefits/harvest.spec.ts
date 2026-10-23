import {
  ExtractedBenefitSchema,
  ExtractionSchema,
  buildPrompt,
  fetchSource,
  fingerprint,
  htmlToText,
  postProcess,
  type ExtractedBenefit,
} from './harvest';

const benefit = (over: Partial<ExtractedBenefit> = {}): ExtractedBenefit => ({
  title: '20% en Coto',
  merchant: 'Coto',
  category: 'supermercado',
  kind: 'discount',
  value: 20,
  maxAmount: 15000,
  maxAmountPeriod: 'month',
  weekdays: [3],
  validFrom: null,
  validTo: '2026-12-31',
  instrumentSlugs: ['galicia-visa-credito'],
  conditions: null,
  ...over,
});
const candidates = new Set(['galicia-visa-credito', 'galicia-visa-debito']);

describe('htmlToText', () => {
  it('drops scripts, styles and nav, keeps text', () => {
    expect(
      htmlToText(
        '<nav>menu</nav><script>x()</script><style>a{}</style><p>20% en&nbsp;Coto &amp; más</p>',
      ),
    ).toBe('20% en Coto & más');
  });
});

describe('postProcess', () => {
  it('keeps valid items and drops invalid ones individually', () => {
    const raw = {
      benefits: [
        benefit(),
        benefit({ instrumentSlugs: ['santander-visa-credito'] }),
        benefit({ weekdays: [7] }),
        benefit({ category: 'casino' as never }),
        benefit({ validTo: '2026-10-01' }),
        { nonsense: true },
      ],
    };
    expect(postProcess(raw, candidates, '2026-10-21')).toEqual([benefit()]);
  });
  it('returns [] for unparseable output', () => {
    expect(postProcess('oops', candidates, '2026-10-21')).toEqual([]);
  });
  it('clears a cap period when there is no cap', () => {
    expect(
      postProcess(
        { benefits: [benefit({ maxAmount: null })] },
        candidates,
        '2026-10-21',
      )[0].maxAmountPeriod,
    ).toBeNull();
  });
});

describe('fingerprint', () => {
  it('is stable regardless of slug order and ignores wording fields', () => {
    const a = fingerprint(
      'galicia',
      benefit({
        instrumentSlugs: ['galicia-visa-credito', 'galicia-visa-debito'],
      }),
    );
    const b = fingerprint(
      'galicia',
      benefit({
        instrumentSlugs: ['galicia-visa-debito', 'galicia-visa-credito'],
        title: 'Otro texto',
        conditions: 'x',
      }),
    );
    expect(a).toBe(b);
    expect(fingerprint('galicia', benefit({ value: 25 }))).not.toBe(a);
  });
});

describe('buildPrompt', () => {
  it('includes instructions, candidate slugs, categories and today', () => {
    const prompt = buildPrompt(
      { url: 'u', strategy: 'fetch', instructions: 'Mirá la grilla' },
      [
        {
          slug: 'galicia-visa-credito',
          label: 'Galicia Visa crédito',
          type: 'credit',
        },
      ],
      '2026-10-21',
    );
    expect(prompt).toContain('Mirá la grilla');
    expect(prompt).toContain('galicia-visa-credito: Galicia Visa crédito');
    expect(prompt).toContain('supermercado');
    expect(prompt).toContain('2026-10-21');
  });
});

describe('fetchSource', () => {
  it('fetches html and strips tags', async () => {
    const fetchImpl = () =>
      Promise.resolve(new Response('<h1>Title</h1><p>20% off</p>'));
    const text = await fetchSource(
      { url: 'http://test', strategy: 'fetch', instructions: '' },
      fetchImpl,
    );
    expect(text).toBe('Title 20% off');
  });

  it('fetches json as raw text', async () => {
    const fetchImpl = () => Promise.resolve(new Response('{"raw": true}'));
    const text = await fetchSource(
      { url: 'http://test', strategy: 'json', instructions: '' },
      fetchImpl,
    );
    expect(text).toBe('{"raw": true}');
  });
});

describe('ExtractionSchema and ExtractedBenefitSchema', () => {
  it('validates a benefit extraction payload', () => {
    const valid = ExtractionSchema.safeParse({ benefits: [benefit()] });
    expect(valid.success).toBe(true);
    const item = ExtractedBenefitSchema.safeParse(benefit());
    expect(item.success).toBe(true);
  });
});

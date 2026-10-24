import { describe, expect, it, vi } from 'vitest';
import { ExtractionOutputSchema, postProcess } from '../../benefits/harvest';
import { extractWith } from './benefits-extractor-agent';

describe('benefits extractor agent extractWith', () => {
  it('passes ExtractionOutputSchema to structuredOutput so invalid items do not reject the whole response', async () => {
    let passedSchema: unknown;
    const mockAgent = {
      generate: vi
        .fn()
        .mockImplementation(
          (
            _prompt: string,
            options?: { structuredOutput?: { schema?: unknown } },
          ) => {
            passedSchema = options?.structuredOutput?.schema;
            const rawResponse = {
              benefits: [
                {
                  title: '20% en Coto',
                  merchant: 'Coto',
                  category: 'supermercado',
                  kind: 'discount',
                  value: 20,
                  maxAmount: null,
                  maxAmountPeriod: null,
                  weekdays: [3],
                  validFrom: null,
                  validTo: '2026-12-31',
                  instrumentSlugs: ['galicia-visa-credito'],
                  conditions: null,
                },
                {
                  title: 'Promo inválida',
                  merchant: null,
                  category: 'categoria_inexistente',
                  kind: 'tipo_inexistente',
                  value: 0,
                  maxAmount: null,
                  maxAmountPeriod: null,
                  weekdays: [7],
                  validFrom: null,
                  validTo: '2027-02-31',
                  instrumentSlugs: ['galicia-visa-credito'],
                  conditions: null,
                },
              ],
            };
            // Structured output validates the LLM response against the passed schema
            const parsed = (
              passedSchema as typeof ExtractionOutputSchema
            ).parse(rawResponse);
            return Promise.resolve({ object: parsed });
          },
        ),
    };

    const extract = extractWith(mockAgent);
    const result = await extract('extract prompt');

    expect(passedSchema).toBe(ExtractionOutputSchema);

    const candidates = new Set(['galicia-visa-credito']);
    const processed = postProcess(result, candidates, '2026-10-21');
    expect(processed).toHaveLength(1);
    expect(processed[0].title).toBe('20% en Coto');
  });
});

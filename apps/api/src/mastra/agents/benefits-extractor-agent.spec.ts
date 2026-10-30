import { describe, expect, it, vi } from 'vitest';
import { ExtractionOutputSchema } from '../../benefits/harvest';
import { extractWith } from './benefits-extractor-agent';

describe('extractWith', () => {
  it('uses the non-recursive output schema and returns the generated object', async () => {
    const object = {
      benefits: [
        {
          title: 'Promo',
          merchant: null,
          category: 'unknown',
          upstreamId: null,
          detailUrl: null,
          termsUrl: null,
          rulesJson: '{}',
          quotes: [],
        },
      ],
    };
    expect(ExtractionOutputSchema.parse(object)).toEqual(object);
    const generate = vi.fn().mockResolvedValue({ object });
    expect(await extractWith({ generate } as never)('prompt')).toEqual(object);
    expect(generate).toHaveBeenCalledWith('prompt', {
      structuredOutput: { schema: ExtractionOutputSchema },
    });
  });
});

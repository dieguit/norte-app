import { describe, expect, it } from 'vitest';
import { resolveModel, modelAlias } from './llm.config';

const env = {
  LLM_BASE_URL: 'http://localhost:20128/v1',
  LLM_API_KEY: 'route-key',
  OPENAI_API_KEY: 'openai-key',
};

describe('resolveModel', () => {
  it('keeps slash-containing OmniRoute IDs intact', () => {
    expect(
      resolveModel({ model: 'omniroute-gpt-6-luna', effort: 'low' }, env),
    ).toEqual({
      model: {
        providerId: 'omniroute',
        modelId: 'openai/gpt-6-luna',
        url: env.LLM_BASE_URL,
        apiKey: env.LLM_API_KEY,
      },
      providerOptions: { omniroute: { reasoningEffort: 'low' } },
    });
    expect(modelAlias('agy/gemini-3.8-flash-low')).toBe('agy-flash-low');
  });

  it('uses the native OpenAI router and provider options', () => {
    expect(
      resolveModel({ model: 'openai-gpt-6-luna', effort: 'minimal' }, env),
    ).toEqual({
      model: { id: 'openai/gpt-6-luna', apiKey: env.OPENAI_API_KEY },
      providerOptions: { openai: { reasoningEffort: 'minimal' } },
    });
    expect(
      resolveModel(
        { model: 'groq-gpt-oss-safeguard-20b' },
        { GROQ_API_KEY: 'g' },
      ),
    ).toEqual({
      model: { id: 'groq/openai/gpt-oss-safeguard-20b', apiKey: 'g' },
    });
  });

  it('rejects unknown aliases and missing credentials', () => {
    expect(() => resolveModel({ model: 'missing' }, env)).toThrow('Unknown');
    expect(() => resolveModel({ model: 'openai-gpt-6-luna' }, {})).toThrow(
      'OPENAI_API_KEY',
    );
    expect(() => resolveModel({ model: 'agy-flash-low' }, {})).toThrow(
      'LLM_API_KEY',
    );
    expect(() =>
      resolveModel({ model: 'agy-flash-low' }, { LLM_API_KEY: 'key' }),
    ).toThrow('LLM_BASE_URL');
  });
});

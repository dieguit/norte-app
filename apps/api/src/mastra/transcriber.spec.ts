import { describe, expect, it } from 'vitest';
import { createTranscriber } from './transcriber';

describe('createTranscriber', () => {
  it('is disabled instead of throwing when its provider is not configured', () => {
    expect(createTranscriber({})).toBeUndefined();
  });

  it('is enabled when its provider is configured', () => {
    expect(
      createTranscriber({
        LLM_BASE_URL: 'http://llm.test/v1',
        LLM_API_KEY: 'k',
      }),
    ).toBeTypeOf('function');
  });
});

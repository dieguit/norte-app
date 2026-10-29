import { describe, expect, it } from 'vitest';
import { sources, sourcesText } from '.';

describe('sources', () => {
  it('inlines every source body with its title', () => {
    const text = sourcesText();
    for (const source of sources) {
      expect(text).toContain(`titulo="${source.title}"`);
      expect(text).toContain(source.body.trim());
    }
  });
});

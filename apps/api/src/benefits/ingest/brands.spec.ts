import { describe, expect, it } from 'vitest';
import { normalizeBrand } from './brands';

describe('brand normalization', () => {
  it('matches accents, case, whitespace and edge punctuation, never fuzzy', () => {
    expect(normalizeBrand(' ¡CAFÉ   Norte! ')).toBe('cafe norte');
    expect(normalizeBrand('Norte S.A.')).not.toBe(normalizeBrand('Norte SA'));
  });
});

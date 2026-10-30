import { describe, expect, it } from 'vitest';
import {
  BrandIdentityConflict,
  normalizeBrand,
  resolveBrandIdentity,
} from './brands';

describe('brand normalization', () => {
  it('matches accents, case, whitespace and edge punctuation, never fuzzy', () => {
    expect(normalizeBrand(' ¡CAFÉ   Norte! ')).toBe('cafe norte');
    expect(normalizeBrand('Norte S.A.')).not.toBe(normalizeBrand('Norte SA'));
  });
  const brand = (
    id: string,
    name: string,
    aliases: string[] = [],
    sourceIds = {},
  ) => ({ id, name, normalized: normalizeBrand(name), aliases, sourceIds });
  it('resolves normalized aliases without fuzzy matching', () => {
    const merged = brand('1', 'Destination', ['¡CAFÉ Norte!']);
    expect(
      resolveBrandIdentity([merged], 'playdigital', 'cafe norte', null),
    ).toBe(merged);
    expect(
      resolveBrandIdentity([merged], 'playdigital', 'cafe', null),
    ).toBeUndefined();
  });
  it('rejects ambiguous aliases and source identity conflicts', () => {
    const a = brand('1', 'A', ['Old'], { playdigital: ['42'] });
    const b = brand('2', 'Old');
    expect(() =>
      resolveBrandIdentity([a, b], 'playdigital', 'old', null),
    ).toThrow(BrandIdentityConflict);
    expect(() =>
      resolveBrandIdentity([a, b], 'playdigital', 'old', '42'),
    ).toThrow(BrandIdentityConflict);
  });
});

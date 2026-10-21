import { describe, expect, it } from 'vitest';
import { sources, sourcesIndex } from '../sources';
import { createSourceTools } from './source-tools';

describe('sources', () => {
  it('has unique slugs', () => {
    const slugs = sources.map((source) => source.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('renders one index line per source', () => {
    expect(sourcesIndex().split('\n')).toHaveLength(sources.length);
    expect(sourcesIndex()).toContain('fondo-de-emergencia: ');
  });

  it('reads a source by slug', async () => {
    const { readSource } = createSourceTools();
    const result = await readSource.execute!({ slug: 'fondo-de-emergencia' } as never, {} as never);
    expect(result).toMatchObject({ title: expect.any(String), body: expect.any(String) });
  });

  it('lists valid slugs for unknown ones', async () => {
    const { readSource } = createSourceTools();
    await expect(
      readSource.execute!({ slug: 'nope' } as never, {} as never),
    ).resolves.toEqual({
      error: 'Fuente inexistente.',
      validSlugs: sources.map((source) => source.slug),
    });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assertFixtureTarget, createFixtureDatabase } from './fixture-database';

const { query, end, pool, drizzle } = vi.hoisted(() => ({
  query: vi.fn(),
  end: vi.fn(),
  pool: vi.fn(),
  drizzle: vi.fn(),
}));
vi.mock('pg', () => ({
  Pool: class {
    query = query;
    end = end;
    constructor(options: unknown) {
      pool(options);
    }
  },
}));
vi.mock('drizzle-orm/node-postgres', () => ({ drizzle }));

const url = 'postgres://fixture:private@postgres-e2e:5432/norte_test';
const compose = { DATABASE_URL: url, E2E_COMPOSE: '1' };

describe('test-only fixture database', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    query.mockResolvedValue({ rows: [{ name: 'norte_test' }] });
    end.mockResolvedValue(undefined);
  });

  it('accepts only the private Compose target without direct opt-in', () => {
    expect(assertFixtureTarget(compose)).toBe(url);
    expect(
      assertFixtureTarget({
        ...compose,
        DATABASE_URL: url.replace('postgres:', 'postgresql:'),
      }),
    ).toBe(url.replace('postgres:', 'postgresql:'));
  });

  it('accepts an explicitly attested disposable direct target', () => {
    const direct = url.replace('postgres-e2e:5432', 'localhost:5434');
    expect(
      assertFixtureTarget({
        DATABASE_URL: direct,
        E2E_ALLOW_DISPOSABLE_DATABASE: '1',
        E2E_DISPOSABLE_DATABASE_URL: direct,
      }),
    ).toBe(direct);
  });

  it('rejects a direct URL that could inherit a configured host', () => {
    const implicitHost = 'postgres:///norte_test';
    expect(() => assertFixtureTarget({
      DATABASE_URL: implicitHost,
      E2E_ALLOW_DISPOSABLE_DATABASE: '1',
      E2E_DISPOSABLE_DATABASE_URL: implicitHost,
    })).toThrow('Refusing');
  });

  it.each([
    {},
    { DATABASE_URL: url },
    { ...compose, DATABASE_URL: url.replace('postgres-e2e', 'arbitrary-host') },
    { ...compose, DATABASE_URL: url.replace(':5432/', ':5434/') },
    { DATABASE_URL: url.replace('postgres-e2e', 'localhost') },
    {
      DATABASE_URL: url,
      E2E_ALLOW_DISPOSABLE_DATABASE: '1',
      E2E_DISPOSABLE_DATABASE_URL: `${url}/other`,
    },
    { ...compose, DATABASE_URL: url.replace('/norte_test', '/norte') },
    { ...compose, DATABASE_URL: url.replace('postgres:', 'https:') },
    { ...compose, DATABASE_URL: `${url}?options=unsafe` },
    { ...compose, DATABASE_URL: `${url}#fragment` },
    { ...compose, DATABASE_URL: `${url}?` },
    { ...compose, DATABASE_URL: `${url}#` },
    { ...compose, DATABASE_URL: 'not-a-url-private' },
  ])(
    'rejects unauthorized targets before opening any connection %#',
    async (env) => {
      expect(() => assertFixtureTarget(env)).toThrow('Refusing');
      await expect(createFixtureDatabase(env)).rejects.toThrow('Refusing');
      expect(pool).not.toHaveBeenCalled();
      try {
        assertFixtureTarget(env);
      } catch (error) {
        expect(String(error)).not.toMatch(
          /private|arbitrary-host|options=unsafe/,
        );
      }
    },
  );

  it('checks the live database before exposing a usable fixture connection', async () => {
    drizzle.mockReturnValue({ fixture: true });
    const result = await createFixtureDatabase(compose);
    expect(result.db).toEqual({ fixture: true });
    expect(query).toHaveBeenCalledWith('select current_database() as name');
    expect(drizzle).toHaveBeenCalledOnce();
    expect(end).not.toHaveBeenCalled();
  });

  it.each(['norte', undefined])(
    'closes a mismatched live target before creating the ORM (%s)',
    async (name) => {
      query.mockResolvedValue({ rows: name ? [{ name }] : [] });
      await expect(createFixtureDatabase(compose)).rejects.toThrow('Refusing');
      expect(end).toHaveBeenCalledOnce();
      expect(drizzle).not.toHaveBeenCalled();
    },
  );

  it('closes failed connections and redacts driver diagnostics', async () => {
    query.mockRejectedValue(new Error(`connection failed: ${url}`));
    await expect(createFixtureDatabase(compose)).rejects.toThrow(
      'Unable to verify fixture database',
    );
    expect(end).toHaveBeenCalledOnce();
    expect(drizzle).not.toHaveBeenCalled();
  });
});

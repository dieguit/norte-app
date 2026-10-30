import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '../../database/database.types';
import type { AdapterContext, AdapterRun } from './types';
vi.mock('./store', () => ({
  loadKnownDetails: vi.fn(),
  saveDetail: vi.fn(),
  upsertBanks: vi.fn(),
  commitRun: vi.fn(),
}));
vi.mock('./galicia', () => ({
  galiciaAdapter: { source: 'galicia', run: vi.fn() },
}));
vi.mock('./playdigital', () => ({
  playdigitalAdapter: {
    source: 'playdigital',
    listBanks: vi.fn(),
    run: vi.fn(),
  },
}));
import * as store from './store';
import { galiciaAdapter } from './galicia';
import { playdigitalAdapter } from './playdigital';
import { runIngest } from './runner';

const db = {} as Database;
const emptyRun: AdapterRun = {
  source: 'galicia',
  bankSlug: 'galicia',
  startedAt: new Date(),
  completedAt: new Date(),
  outcome: 'partial',
  complete: false,
  rawRowCount: 0,
  totalReported: 10,
  observedExternalIds: [],
  listings: [],
  anomalies: [],
  error: null,
};
describe('runIngest', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(store.loadKnownDetails).mockResolvedValue(new Map());
    vi.mocked(galiciaAdapter.run).mockResolvedValue([emptyRun]);
    vi.mocked(playdigitalAdapter.listBanks!).mockResolvedValue([
      { slug: 'macro', name: 'Macro', playdigitalId: '1' },
      { slug: 'galicia', name: 'Galicia', playdigitalId: '2' },
    ]);
    vi.mocked(playdigitalAdapter.run).mockResolvedValue([]);
  });
  it('defaults to zero writes and shares cache/context through bank discovery and all banks', async () => {
    const cache = new Map();
    vi.mocked(store.loadKnownDetails).mockResolvedValue(cache);
    await runIngest(db, { source: 'all' });
    const ctx = vi.mocked(playdigitalAdapter.run).mock.calls[0]![0];
    expect(ctx).toBe(
      vi.mocked(playdigitalAdapter.listBanks!).mock.calls[0]![0],
    );
    expect(ctx.knownDetails).toBe(cache);
    expect(ctx.maxDetailFetches).toBe(200);
    expect(ctx.saveDetail).toBeUndefined();
    expect(vi.mocked(playdigitalAdapter.run).mock.calls[0]![1]).toHaveLength(2);
    expect(store.saveDetail).not.toHaveBeenCalled();
    expect(store.upsertBanks).not.toHaveBeenCalled();
    expect(store.commitRun).not.toHaveBeenCalled();
  });
  it('narrows banks and skips unrelated own catalogs', async () => {
    await runIngest(db, { source: 'all', bankSlugs: ['macro'] });
    expect(galiciaAdapter.run).not.toHaveBeenCalled();
    expect(
      vi
        .mocked(playdigitalAdapter.run)
        .mock.calls[0]![1].map((bank) => bank.slug),
    ).toEqual(['macro']);
  });
  it('upserts Galicia and supplies persistence only for commit', async () => {
    vi.mocked(galiciaAdapter.run).mockImplementation(
      async (ctx: AdapterContext) => {
        await ctx.saveDetail!('id', {
          fetchedAt: ctx.now,
          listingHash: 'hash',
          detail: {},
        });
        return [emptyRun];
      },
    );
    await runIngest(db, { source: 'galicia', dryRun: false });
    expect(store.upsertBanks).toHaveBeenCalledWith(db, [
      { slug: 'galicia', name: 'Galicia', playdigitalId: null },
    ]);
    expect(store.saveDetail).toHaveBeenCalledOnce();
    expect(store.commitRun).toHaveBeenCalledWith(
      db,
      emptyRun,
      expect.any(Date),
    );
  });
  it('isolates source failure', async () => {
    vi.mocked(galiciaAdapter.run).mockRejectedValue(new Error('offline'));
    const result = await runIngest(db, { source: 'all' });
    expect(result.runs[0]!.outcome).toBe('failed');
    expect(playdigitalAdapter.run).toHaveBeenCalledOnce();
  });
});

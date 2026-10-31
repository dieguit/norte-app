import { Logger } from '@nestjs/common';
import type { Pool } from 'pg';
import { beforeEach, expect, it, vi } from 'vitest';
import type { Database } from '../database/database.types';
import { BenefitsIngestCron } from './benefits-ingest.cron';
import { runIngest } from './ingest/runner';

vi.mock('./ingest/runner', () => ({ runIngest: vi.fn() }));
const db = {} as Database;
const query = vi.fn();
const release = vi.fn();
const connect = vi.fn(async () => ({ query, release }));
const cron = () => new BenefitsIngestCron(db, { connect } as unknown as Pool);

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  query.mockResolvedValue({ rows: [{ locked: true }] });
  vi.mocked(runIngest).mockResolvedValue({
    dryRun: false,
    runs: [],
    commits: [],
    errors: [],
  });
});

it('skips when another instance holds the session lock', async () => {
  query.mockResolvedValue({ rows: [{ locked: false }] });
  const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  await cron().tick();
  expect(runIngest).not.toHaveBeenCalled();
  expect(log).toHaveBeenCalledWith(expect.stringContaining('skipped'));
  expect(release).toHaveBeenCalled();
});

it('commits all sources and always unlocks after failure', async () => {
  const log = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  vi.mocked(runIngest).mockRejectedValue(new Error('broken'));
  await expect(cron().tick()).resolves.toBeUndefined();
  expect(runIngest).toHaveBeenCalledWith(db, {
    source: 'all',
    dryRun: false,
    maxDetails: 4000,
  });
  expect(query).toHaveBeenLastCalledWith(
    expect.stringContaining('pg_advisory_unlock'),
  );
  expect(log).toHaveBeenCalledWith(expect.stringContaining('broken'));
  expect(release).toHaveBeenCalled();
});

it('logs returned ingest failures', async () => {
  const log = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  vi.mocked(runIngest).mockResolvedValue({
    dryRun: false,
    runs: [],
    commits: [],
    errors: [{ source: 'galicia', error: 'commit failed' }],
  });
  await cron().tick();
  expect(log).toHaveBeenCalledWith(expect.stringContaining('commit failed'));
});

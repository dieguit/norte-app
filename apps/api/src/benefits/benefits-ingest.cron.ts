import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { Pool, PoolClient } from 'pg';
import {
  DATABASE_CONNECTION,
  DATABASE_POOL,
} from '../database/database.constants';
import type { Database } from '../database/database.types';
import { runIngest } from './ingest/runner';

@Injectable()
export class BenefitsIngestCron {
  private readonly logger = new Logger(BenefitsIngestCron.name);
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    @Inject(DATABASE_POOL) private readonly pool: Pool,
  ) {}

  @Cron('0 3 * * *', { timeZone: 'America/Argentina/Buenos_Aires' })
  async tick() {
    let client: PoolClient | undefined;
    let locked = false;
    let releaseError: Error | undefined;
    try {
      client = await this.pool.connect();
      const result = await client.query<{ locked: boolean }>(
        "select pg_try_advisory_lock(hashtext('benefits-ingest-run')) as locked",
      );
      locked = result.rows[0]?.locked === true;
      if (!locked) {
        this.logger.log(
          'Benefits ingest skipped: another instance holds the lock',
        );
        return;
      }
      const summary = await runIngest(this.db, {
        source: 'all',
        dryRun: false,
        maxDetails: 4000,
      });
      this.logSummary(summary);
    } catch (error) {
      this.logger.error(`Benefits ingest failed: ${String(error)}`);
    } finally {
      if (client && locked) {
        try {
          await client.query(
            "select pg_advisory_unlock(hashtext('benefits-ingest-run'))",
          );
        } catch (error) {
          releaseError =
            error instanceof Error ? error : new Error(String(error));
          this.logger.error(`Benefits ingest unlock failed: ${String(error)}`);
        }
      }
      client?.release(releaseError);
    }
  }

  private logSummary(summary: Awaited<ReturnType<typeof runIngest>>) {
    for (const run of summary.runs) {
      const message = JSON.stringify(run);
      if (run.outcome === 'failed') this.logger.error(message);
      else if (run.outcome !== 'ok' || !run.complete || run.anomalies)
        this.logger.warn(message);
      else this.logger.log(message);
    }
    for (const error of summary.errors)
      this.logger.error(JSON.stringify(error));
  }
}

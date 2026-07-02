import { Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_CONNECTION, DATABASE_POOL } from './database.constants';
import { databaseProviders } from './database.providers';

class DatabaseShutdownService implements OnApplicationShutdown {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown() {
    await this.pool.end();
  }
}

@Module({
  providers: [...databaseProviders, DatabaseShutdownService],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule {}

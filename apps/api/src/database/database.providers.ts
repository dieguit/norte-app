import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { DATABASE_CONNECTION, DATABASE_POOL } from './database.constants';
import { schema } from './schema';
import type { Database } from './database.types';
import type { Env } from '../config/env';

export const databaseProviders = [
  {
    provide: DATABASE_POOL,
    inject: [ConfigService],
    useFactory: (config: ConfigService<Env>): Pool => {
      const url = config.get<string>('DATABASE_URL');

      if (!url) {
        throw new Error('DATABASE_URL is required to start the API');
      }

      return new Pool({ connectionString: url });
    },
  },
  {
    provide: DATABASE_CONNECTION,
    inject: [DATABASE_POOL],
    useFactory: (pool: Pool): Database => drizzle(pool, { schema }),
  },
];

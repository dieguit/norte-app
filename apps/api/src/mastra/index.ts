import { Mastra } from '@mastra/core/mastra';
import { SimpleAuth } from '@mastra/core/server';
import { PostgresStore } from '@mastra/pg';
import type { Env } from '../config/env';
import { createWeatherAgent } from './agents/weather-agent';

export function createMastra(
  env: Pick<
    Env,
    | 'DATABASE_URL'
    | 'MASTRA_API_KEY'
    | 'LLM_BASE_URL'
    | 'LLM_API_KEY'
    | 'LLM_MODEL'
  >,
): Mastra {
  return new Mastra({
    agents: { weatherAgent: createWeatherAgent(env) },
    storage: new PostgresStore({
      id: 'mastra-storage',
      connectionString: env.DATABASE_URL,
      schemaName: 'mastra',
    }),
    server: {
      auth: new SimpleAuth({
        tokens: { [env.MASTRA_API_KEY]: { id: 'dev', name: 'Dev' } },
        // Mastra's default only protects /api/*; our prefix is /agents.
        protected: ['/agents/*'],
      }),
    },
  });
}

import type { ChannelConfig } from '@mastra/core/channels';
import { Mastra } from '@mastra/core/mastra';
import { SimpleAuth } from '@mastra/core/server';
import {
  MastraStorageExporter,
  Observability,
  SensitiveDataFilter,
} from '@mastra/observability';
import { PostgresStoreVNext } from '@mastra/pg';
import type { Env } from '../config/env';
import { createBenefitsExtractorAgent } from './agents/benefits-extractor-agent';
import { createNorteAgent } from './agents/norte-agent';
import type { LlmEnv } from '../config/llm.config';
import type { NorteServices } from './services';

export function createMastra(
  env: Pick<Env, 'DATABASE_URL' | 'MASTRA_API_KEY'> & LlmEnv,
  options: {
    services: NorteServices;
    webAppUrl?: string;
    channels?: ChannelConfig;
    main?: Parameters<typeof createNorteAgent>[1]['main'];
    domainModels?: Parameters<typeof createNorteAgent>[1]['domainModels'];
    guard?: Parameters<typeof createNorteAgent>[1]['guard'];
    scorers?: NonNullable<ConstructorParameters<typeof Mastra>[0]>['scorers'];
  },
): Mastra {
  return new Mastra({
    scorers: options.scorers,
    agents: {
      norteAgent: createNorteAgent(env, options),
      benefitsExtractor: createBenefitsExtractorAgent(env),
    },
    // ponytail: observability shares the app DB; point at a dedicated DB or ClickHouse if span volume grows.
    storage: new PostgresStoreVNext({
      id: 'mastra-storage',
      connectionString: env.DATABASE_URL,
      schemaName: 'mastra',
      observability: {
        connectionString: env.DATABASE_URL,
        schemaName: 'mastra',
      },
    }),
    observability: new Observability({
      configs: {
        default: {
          serviceName: 'norte-api',
          exporters: [new MastraStorageExporter()],
          spanOutputProcessors: [new SensitiveDataFilter()],
        },
      },
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

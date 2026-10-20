import {
  Inject,
  Injectable,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MASTRA, MastraModule } from '@mastra/nestjs';
import type { Mastra } from '@mastra/core/mastra';
import type { Env } from '../config/env';
import { createMastra } from './index';

@Injectable()
class MastraLifecycle implements OnApplicationShutdown {
  constructor(@Inject(MASTRA) private readonly mastra: Mastra) {}

  async onApplicationShutdown() {
    await this.mastra.shutdown();
  }
}

const mastraModule = MastraModule.registerAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService<Env, true>) => ({
    mastra: createMastra({
      DATABASE_URL: config.get('DATABASE_URL'),
      LLM_BASE_URL: config.get('LLM_BASE_URL'),
      LLM_API_KEY: config.get('LLM_API_KEY'),
      LLM_MODEL: config.get('LLM_MODEL'),
      MASTRA_API_KEY: config.get('MASTRA_API_KEY'),
    }),
    prefix: '/agents',
  }),
});

@Module({
  imports: [mastraModule],
  providers: [MastraLifecycle],
  exports: [mastraModule],
})
export class MastraIntegrationModule {}

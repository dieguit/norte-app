import {
  Inject,
  Injectable,
  Logger,
  Module,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MASTRA, MastraModule } from '@mastra/nestjs';
import type { Mastra } from '@mastra/core/mastra';
import type { Env } from '../config/env';
import {
  WHATSAPP_ADAPTER,
  type WhatsappAdapter,
} from '../whatsapp/whatsapp.adapter.provider';
import { createWhatsappChannel } from '../whatsapp/whatsapp-channel';
import { WhatsappLinksService } from '../whatsapp/whatsapp-links.service';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { createMastra } from './index';

@Injectable()
export class MastraLifecycle
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger('WhatsApp');

  constructor(
    @Inject(MASTRA) private readonly mastra: Mastra,
    @Inject(WHATSAPP_ADAPTER) private readonly whatsapp: WhatsappAdapter | null,
  ) {}

  // Mastra only auto-starts adapters exposing startGatewayListener; Baileys needs an explicit connect() once channel handlers are registered.
  async onApplicationBootstrap() {
    if (!this.whatsapp) return;
    try {
      await this.mastra.getAgent('norteAgent').getChannels()?.initialize(this.mastra);
      await this.whatsapp.connect();
    } catch (error) {
      this.logger.error(`WhatsApp connection failed: ${String(error)}`);
    }
  }

  async onApplicationShutdown() {
    await this.whatsapp?.disconnect();
    await this.mastra.shutdown();
  }
}

const mastraModule = MastraModule.registerAsync({
  imports: [WhatsappModule],
  inject: [ConfigService, WHATSAPP_ADAPTER, WhatsappLinksService],
  useFactory: (
    config: ConfigService<Env, true>,
    whatsapp: WhatsappAdapter | null,
    links: WhatsappLinksService,
  ) => ({
    mastra: createMastra(
      {
        DATABASE_URL: config.get('DATABASE_URL'),
        LLM_BASE_URL: config.get('LLM_BASE_URL'),
        LLM_API_KEY: config.get('LLM_API_KEY'),
        LLM_MODEL: config.get('LLM_MODEL'),
        MASTRA_API_KEY: config.get('MASTRA_API_KEY'),
      },
      whatsapp
        ? {
            channels: createWhatsappChannel({
              adapter: whatsapp,
              links,
              webAppUrl: config.getOrThrow('WEB_APP_URL'),
            }),
          }
        : {},
    ),
    prefix: '/agents',
  }),
});

@Module({
  imports: [mastraModule, WhatsappModule],
  providers: [MastraLifecycle],
  exports: [mastraModule],
})
export class MastraIntegrationModule {}

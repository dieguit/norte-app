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
  type ChatChannel,
} from '../whatsapp/whatsapp.adapter.provider';
import { createWhatsappChannel } from '../whatsapp/whatsapp-channel';
import { WhatsappLinksService } from '../whatsapp/whatsapp-links.service';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { ExpensesService } from '../expenses/expenses.service';
import { IncomesModule } from '../incomes/incomes.module';
import { IncomesService } from '../incomes/incomes.service';
import { FinancesModule } from '../finances/finances.module';
import { FinancesService } from '../finances/finances.service';
import { HomeModule } from '../home/home.module';
import { HomeService } from '../home/home.service';
import { GoalsModule } from '../goals/goals.module';
import { GoalsService } from '../goals/goals.service';
import { ContributionsModule } from '../contributions/contributions.module';
import { ContributionsService } from '../contributions/contributions.service';
import { createMastra } from './index';

@Injectable()
export class MastraLifecycle
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger('ChatChannel');

  constructor(
    @Inject(MASTRA) private readonly mastra: Mastra,
    @Inject(WHATSAPP_ADAPTER) private readonly channel: ChatChannel | null,
  ) {}

  // Baileys needs explicit connect() once channel handlers are registered; Telegram polling starts on initialize.
  async onApplicationBootstrap() {
    if (!this.channel) return;
    try {
      await this.mastra
        .getAgent('norteAgent')
        .getChannels()
        ?.initialize(this.mastra);
      await this.channel.adapter.connect?.();
    } catch (error) {
      this.logger.error(
        `Chat channel (${this.channel.key}) connection failed: ${String(error)}`,
      );
    }
  }

  async onApplicationShutdown() {
    await this.channel?.adapter.disconnect();
    await this.mastra.shutdown();
  }
}

const mastraModule = MastraModule.registerAsync({
  imports: [
    WhatsappModule,
    ExpensesModule,
    IncomesModule,
    FinancesModule,
    HomeModule,
    GoalsModule,
    ContributionsModule,
  ],
  inject: [
    ConfigService,
    WHATSAPP_ADAPTER,
    WhatsappLinksService,
    ExpensesService,
    IncomesService,
    FinancesService,
    HomeService,
    GoalsService,
    ContributionsService,
  ],
  useFactory: (
    config: ConfigService<Env, true>,
    channel: ChatChannel | null,
    links: WhatsappLinksService,
    expenses: ExpensesService,
    incomes: IncomesService,
    finances: FinancesService,
    home: HomeService,
    goals: GoalsService,
    contributions: ContributionsService,
  ) => {
    const webAppUrl = config.get('WEB_APP_URL', { infer: true });
    return {
      mastra: createMastra(
        {
          DATABASE_URL: config.get('DATABASE_URL'),
          LLM_BASE_URL: config.get('LLM_BASE_URL'),
          LLM_API_KEY: config.get('LLM_API_KEY'),
          LLM_MODEL: config.get('LLM_MODEL'),
          MASTRA_API_KEY: config.get('MASTRA_API_KEY'),
        },
        {
          services: { expenses, incomes, finances, home, goals, contributions },
          webAppUrl,
          ...(channel
            ? {
                channels: createWhatsappChannel({
                  channel,
                  links,
                  webAppUrl: config.getOrThrow('WEB_APP_URL'),
                }),
              }
            : {}),
        },
      ),
      prefix: '/agents',
    };
  },
});

@Module({
  imports: [mastraModule, WhatsappModule],
  providers: [MastraLifecycle],
  exports: [mastraModule],
})
export class MastraIntegrationModule {}

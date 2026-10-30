import { Logger, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env';
import { DATABASE_CONNECTION } from '../database/database.constants';
import type { Database } from '../database/database.types';
import { usePostgresAuthState } from './whatsapp-auth-state';

export const WHATSAPP_ADAPTER = 'WHATSAPP_ADAPTER';

export type ChatChannelAdapter = {
  openDM(id: string): Promise<string>;
  postMessage(threadId: string, message: string): Promise<unknown>;
  connect?(): Promise<void>;
  disconnect(): Promise<void>;
};

export type ChatChannel = {
  key: 'whatsapp' | 'telegram';
  adapter: ChatChannelAdapter;
};

export const whatsappAdapterProvider: Provider = {
  provide: WHATSAPP_ADAPTER,
  inject: [ConfigService, DATABASE_CONNECTION],
  useFactory: async (
    config: ConfigService<Env, true>,
    db: Database,
  ): Promise<ChatChannel | null> => {
    const channel = config.get('CHAT_CHANNEL', { infer: true });
    if (!channel) return null;

    if (channel === 'telegram') {
      const { createTelegramAdapter } = await import('@chat-adapter/telegram');
      return {
        key: 'telegram',
        adapter: createTelegramAdapter({
          mode: 'polling',
          botToken: config.getOrThrow('TELEGRAM_BOT_TOKEN'),
          userName: 'Norte',
        }),
      };
    }

    const { createBaileysAdapter } = await import('chat-adapter-baileys');
    const logger = new Logger('WhatsApp');
    const adapter = createBaileysAdapter({
      adapterName: 'whatsapp',
      userName: 'Norte',
      auth: await usePostgresAuthState(db),
      phoneNumber: config.getOrThrow('WHATSAPP_PHONE_NUMBER'),
      onPairingCode: (code) =>
        logger.log(
          `Ingresá este código en WhatsApp > Dispositivos vinculados > Vincular con número de teléfono: ${code}`,
        ),
    });
    return { key: 'whatsapp', adapter };
  },
};

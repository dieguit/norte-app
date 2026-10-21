import { Logger, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import QRCode from 'qrcode';
import type { BaileysAdapter } from 'chat-adapter-baileys';
import type { Env } from '../config/env';
import { DATABASE_CONNECTION } from '../database/database.constants';
import type { Database } from '../database/database.types';
import { usePostgresAuthState } from './whatsapp-auth-state';

export const WHATSAPP_ADAPTER = 'WHATSAPP_ADAPTER';
export type WhatsappAdapter = BaileysAdapter;

export const whatsappAdapterProvider: Provider = {
  provide: WHATSAPP_ADAPTER,
  inject: [ConfigService, DATABASE_CONNECTION],
  useFactory: async (
    config: ConfigService<Env, true>,
    db: Database,
  ): Promise<WhatsappAdapter | null> => {
    if (!config.get('WHATSAPP_ENABLED')) return null;
    const { createBaileysAdapter } = await import('chat-adapter-baileys');
    const logger = new Logger('WhatsApp');
    return createBaileysAdapter({
      adapterName: 'whatsapp',
      userName: 'Norte',
      auth: await usePostgresAuthState(db),
      onQR: async (qr) =>
        logger.log(
          `Escaneá este QR desde WhatsApp > Dispositivos vinculados:\n${await QRCode.toString(qr, { type: 'terminal', small: true })}`,
        ),
    });
  },
};

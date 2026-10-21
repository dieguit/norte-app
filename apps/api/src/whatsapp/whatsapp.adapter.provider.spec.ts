import { describe, expect, it } from 'vitest';
import type { FactoryProvider } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env';
import type { Database } from '../database/database.types';
import {
  whatsappAdapterProvider,
  type ChatChannel,
} from './whatsapp.adapter.provider';

describe('whatsappAdapterProvider', () => {
  const factory = (whatsappAdapterProvider as FactoryProvider).useFactory as (
    config: ConfigService<Env, true>,
    db: Database,
  ) => Promise<ChatChannel | null>;

  it('returns null when CHAT_CHANNEL is unset', async () => {
    const config = {
      get: (key: string) => (key === 'CHAT_CHANNEL' ? undefined : null),
    } as unknown as ConfigService<Env, true>;
    const db = {} as Database;

    const result = await factory(config, db);
    expect(result).toBeNull();
  });

  it('resolves telegram channel with openDM and disconnect', async () => {
    const config = {
      get: (key: string) => (key === 'CHAT_CHANNEL' ? 'telegram' : null),
      getOrThrow: (key: string) => {
        if (key === 'TELEGRAM_BOT_TOKEN') return '123456:fake-token';
        throw new Error(`Unexpected key: ${key}`);
      },
    } as unknown as ConfigService<Env, true>;
    const db = {} as Database;

    const result = await factory(config, db);
    expect(result).not.toBeNull();
    expect(result?.key).toBe('telegram');
    expect(typeof result?.adapter.openDM).toBe('function');
    expect(typeof result?.adapter.disconnect).toBe('function');
  });
});

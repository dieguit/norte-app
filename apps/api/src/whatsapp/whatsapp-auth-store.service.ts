import { Inject, Injectable } from '@nestjs/common';
import {
  BufferJSON,
  initAuthCreds,
  proto,
  type AuthenticationCreds,
  type AuthenticationState,
  type SignalDataSet,
  type SignalDataTypeMap,
} from '@whiskeysockets/baileys';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../database/database.constants';
import type { Database } from '../database/database.types';
import { whatsappAuthState } from './whatsapp.schema';

type StoredJson =
  Record<string, unknown> | unknown[] | string | number | boolean | null;

const CREDS_KEY = 'creds';

@Injectable()
export class WhatsappAuthStoreService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async createAuthState(): Promise<{
    state: AuthenticationState;
    saveCreds: () => Promise<void>;
  }> {
    const creds =
      (await this.read<AuthenticationCreds>(CREDS_KEY)) ?? initAuthCreds();

    return {
      state: {
        creds,
        keys: {
          get: async <T extends keyof SignalDataTypeMap>(
            type: T,
            ids: string[],
          ): Promise<{ [id: string]: SignalDataTypeMap[T] }> => {
            const data: { [id: string]: SignalDataTypeMap[T] } = {};

            await Promise.all(
              ids.map(async (id) => {
                let value = await this.read<SignalDataTypeMap[T]>(
                  this.signalKey(type, id),
                );

                if (type === 'app-state-sync-key' && value) {
                  value = proto.Message.AppStateSyncKeyData.fromObject(
                    value as proto.Message.IAppStateSyncKeyData,
                  ) as unknown as SignalDataTypeMap[T];
                }

                data[id] = value as SignalDataTypeMap[T];
              }),
            );

            return data;
          },
          set: async (data: SignalDataSet): Promise<void> => {
            const operations: Promise<void>[] = [];

            for (const [type, entries] of Object.entries(data)) {
              for (const [id, value] of Object.entries(entries ?? {})) {
                const key = this.signalKey(type, id);
                operations.push(
                  value ? this.write(key, value) : this.remove(key),
                );
              }
            }

            await Promise.all(operations);
          },
        },
      },
      saveCreds: async () => {
        await this.write(CREDS_KEY, creds);
      },
    };
  }

  private signalKey(type: string, id: string): string {
    return `signal:${type}:${id}`;
  }

  protected async read<T>(key: string): Promise<T | undefined> {
    const [row] = await this.db
      .select()
      .from(whatsappAuthState)
      .where(eq(whatsappAuthState.key, key))
      .limit(1);

    if (!row) {
      return undefined;
    }

    return this.deserialize<T>(row.value);
  }

  protected async write(key: string, value: unknown): Promise<void> {
    await this.db
      .insert(whatsappAuthState)
      .values({ key, value: this.serialize(value) })
      .onConflictDoUpdate({
        target: whatsappAuthState.key,
        set: {
          value: this.serialize(value),
          updatedAt: new Date(),
        },
      });
  }

  protected async remove(key: string): Promise<void> {
    await this.db
      .delete(whatsappAuthState)
      .where(eq(whatsappAuthState.key, key));
  }

  protected serialize(value: unknown): StoredJson {
    return JSON.parse(JSON.stringify(value, BufferJSON.replacer)) as StoredJson;
  }

  protected deserialize<T>(value: unknown): T {
    return JSON.parse(JSON.stringify(value), BufferJSON.reviver) as T;
  }
}

import { inArray } from 'drizzle-orm';
import type {
  AuthenticationCreds,
  AuthenticationState,
  SignalDataTypeMap,
} from 'baileys';
import type { Database } from '../database/database.types';
import { whatsappAuthState } from './whatsapp.schema';

export async function usePostgresAuthState(db: Database): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}> {
  const { BufferJSON, initAuthCreds, proto } = await import('baileys');
  const encode = (value: unknown): unknown =>
    JSON.parse(JSON.stringify(value, BufferJSON.replacer));
  const decode = <T>(value: unknown): T =>
    JSON.parse(JSON.stringify(value), BufferJSON.reviver) as T;

  const read = async (keys: string[]) => {
    if (keys.length === 0) return new Map<string, unknown>();
    const rows = await db
      .select()
      .from(whatsappAuthState)
      .where(inArray(whatsappAuthState.key, keys));
    return new Map(rows.map((row) => [row.key, row.value]));
  };

  const upsert = (key: string, value: unknown) => {
    const encoded = encode(value);
    return db
      .insert(whatsappAuthState)
      .values({ key, value: encoded })
      .onConflictDoUpdate({
        target: whatsappAuthState.key,
        set: { value: encoded },
      });
  };

  const stored = (await read(['creds'])).get('creds');
  const creds: AuthenticationCreds = stored
    ? decode<AuthenticationCreds>(stored)
    : initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async <T extends keyof SignalDataTypeMap>(
          type: T,
          ids: string[],
        ) => {
          const rows = await read(ids.map((id) => `${type}-${id}`));
          const result: { [id: string]: SignalDataTypeMap[T] } = {};
          for (const id of ids) {
            const raw = rows.get(`${type}-${id}`);
            if (raw === undefined) continue;
            let value = decode<SignalDataTypeMap[T]>(raw);
            if (type === 'app-state-sync-key') {
              value = proto.Message.AppStateSyncKeyData.fromObject(
                value as object,
              ) as unknown as SignalDataTypeMap[T];
            }
            result[id] = value;
          }
          return result;
        },
        set: async (data) => {
          const deletes: string[] = [];
          const writes: Array<[string, unknown]> = [];
          for (const [category, entries] of Object.entries(data)) {
            for (const [id, value] of Object.entries(entries ?? {})) {
              const key = `${category}-${id}`;
              if (value) writes.push([key, value]);
              else deletes.push(key);
            }
          }
          await db.transaction(async (tx) => {
            if (deletes.length)
              await tx
                .delete(whatsappAuthState)
                .where(inArray(whatsappAuthState.key, deletes));
            for (const [key, value] of writes) {
              const encoded = encode(value);
              await tx
                .insert(whatsappAuthState)
                .values({ key, value: encoded })
                .onConflictDoUpdate({
                  target: whatsappAuthState.key,
                  set: { value: encoded },
                });
            }
          });
        },
      },
    },
    saveCreds: async () => {
      await upsert('creds', creds);
    },
  };
}

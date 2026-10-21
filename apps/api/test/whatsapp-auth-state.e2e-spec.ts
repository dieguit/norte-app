import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { schema } from '../src/database/schema';
import { whatsappAuthState } from '../src/whatsapp/whatsapp.schema';
import { usePostgresAuthState } from '../src/whatsapp/whatsapp-auth-state';

const databaseUrl = process.env.DATABASE_URL;
const safe =
  databaseUrl &&
  new URL(databaseUrl).pathname.replace(/^\//, '') === 'norte_test';
if (databaseUrl && !safe)
  throw new Error('WhatsApp auth state test only permits norte_test');
const describeWhenSafe = safe ? describe : describe.skip;

describeWhenSafe('usePostgresAuthState', () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });

  beforeEach(async () => db.delete(whatsappAuthState));
  afterAll(async () => {
    await db.delete(whatsappAuthState);
    await pool.end();
  });

  it('creates fresh creds and persists them across loads', async () => {
    const first = await usePostgresAuthState(db);
    await first.saveCreds();
    const second = await usePostgresAuthState(db);
    expect(Buffer.isBuffer(second.state.creds.noiseKey.private)).toBe(true);
    expect(
      Buffer.from(second.state.creds.noiseKey.private).equals(
        first.state.creds.noiseKey.private,
      ),
    ).toBe(true);
    expect(second.state.creds.registrationId).toBe(
      first.state.creds.registrationId,
    );
  });

  it('round-trips signal keys with Buffers and deletes on null', async () => {
    const { state } = await usePostgresAuthState(db);
    const keyPair = {
      public: Buffer.from([1, 2, 3]),
      private: Buffer.from([4, 5, 6]),
    };
    await state.keys.set({ 'pre-key': { '1': keyPair, '2': keyPair } });

    const got = await state.keys.get('pre-key', ['1', '2', '3']);
    expect(Buffer.from(got['1'].public).equals(keyPair.public)).toBe(true);
    expect(Buffer.isBuffer(got['2'].private)).toBe(true);
    expect(got['3']).toBeUndefined();

    await state.keys.set({ 'pre-key': { '1': null } });
    const after = await state.keys.get('pre-key', ['1', '2']);
    expect(after['1']).toBeUndefined();
    expect(after['2']).toBeDefined();
  });
});

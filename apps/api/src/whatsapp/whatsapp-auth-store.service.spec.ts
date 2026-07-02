import { describe, expect, it } from 'vitest';
import { WhatsappAuthStoreService } from './whatsapp-auth-store.service';

describe('WhatsappAuthStoreService', () => {
  it('saves and reads credentials', async () => {
    const rows = new Map<string, unknown>();
    const service = new TestableWhatsappAuthStoreService(rows);

    const { state, saveCreds } = await service.createAuthState();
    state.creds.me = { id: '5491112345678:1@s.whatsapp.net', name: 'Norte' };

    await saveCreds();

    const restored = await service.createAuthState();
    expect(restored.state.creds.me).toEqual({
      id: '5491112345678:1@s.whatsapp.net',
      name: 'Norte',
    });
    expect(rows.get('creds')).toBeDefined();
  });

  it('saves and reads auth key rows', async () => {
    const rows = new Map<string, unknown>();
    const service = new TestableWhatsappAuthStoreService(rows);
    const { state } = await service.createAuthState();

    await state.keys.set({
      'pre-key': {
        abc: { public: Buffer.from('public'), private: Buffer.from('private') },
      },
    });

    await expect(state.keys.get('pre-key', ['abc'])).resolves.toEqual({
      abc: { public: Buffer.from('public'), private: Buffer.from('private') },
    });
    expect(rows.get('signal:pre-key:abc')).toBeDefined();
  });

  it('removes auth key rows when Baileys sets a key to null', async () => {
    const rows = new Map<string, unknown>();
    const service = new TestableWhatsappAuthStoreService(rows);
    const { state } = await service.createAuthState();

    await state.keys.set({
      'pre-key': {
        abc: { public: Buffer.from('public'), private: Buffer.from('private') },
      },
    });
    await state.keys.set({
      'pre-key': {
        abc: null,
      },
    });

    await expect(state.keys.get('pre-key', ['abc'])).resolves.toEqual({
      abc: undefined,
    });
    expect(rows.has('signal:pre-key:abc')).toBe(false);
  });
});

class TestableWhatsappAuthStoreService extends WhatsappAuthStoreService {
  constructor(private readonly rows: Map<string, unknown>) {
    super({} as never);
  }

  protected override async read<T>(key: string): Promise<T | undefined> {
    const value = this.rows.get(key);

    if (value === undefined) {
      return undefined;
    }

    return this.deserialize<T>(value);
  }

  protected override async write(key: string, value: unknown): Promise<void> {
    this.rows.set(key, this.serialize(value));
  }

  protected override async remove(key: string): Promise<void> {
    this.rows.delete(key);
  }
}

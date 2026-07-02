import { Test } from '@nestjs/testing';
import makeWASocket, { DisconnectReason } from '@whiskeysockets/baileys';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WhatsappAuthStoreService } from './whatsapp-auth-store.service';
import { WhatsappConnectionService } from './whatsapp-connection.service';
import { WhatsappMessageService } from './whatsapp-message.service';
import * as qrcode from 'qrcode-terminal';

vi.mock('@whiskeysockets/baileys', () => ({
  default: vi.fn(),
  DisconnectReason: { loggedOut: 401 },
  Browsers: { ubuntu: vi.fn((name: string) => ['Ubuntu', name, '1.0.0']) },
}));

vi.mock('qrcode-terminal', () => ({
  generate: vi.fn(),
}));

describe('WhatsappConnectionService', () => {
  let consoleLog: ReturnType<typeof vi.spyOn>;
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
  });

  it('creates a Baileys socket on application bootstrap and saves creds updates', async () => {
    const socket = createSocket();
    vi.mocked(makeWASocket).mockReturnValue(socket as never);
    const saveCreds = vi.fn().mockResolvedValue(undefined);
    const service = await createService({ saveCreds });

    await service.onApplicationBootstrap();
    await socket.emit('creds.update', undefined);

    expect(makeWASocket).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: { creds: { id: 'creds' }, keys: {} },
      }),
    );
    expect(saveCreds).toHaveBeenCalled();
  });

  it('logs QR, connecting, and open connection updates', async () => {
    const socket = createSocket();
    vi.mocked(makeWASocket).mockReturnValue(socket as never);
    const service = await createService();

    await service.onApplicationBootstrap();
    await socket.emit('connection.update', {
      qr: 'qr-code',
      connection: 'connecting',
    });
    await socket.emit('connection.update', { connection: 'open' });

    expect(qrcode.generate).toHaveBeenCalledWith('qr-code', { small: true });
    expect(consoleLog).toHaveBeenCalledWith('WhatsApp connecting...');
    expect(consoleLog).toHaveBeenCalledWith('WhatsApp connection opened');
  });

  it('delegates upserted messages to the message service', async () => {
    const socket = createSocket();
    vi.mocked(makeWASocket).mockReturnValue(socket as never);
    const handleMessages = vi.fn().mockResolvedValue(undefined);
    const service = await createService({ handleMessages });

    await service.onApplicationBootstrap();
    await socket.emit('messages.upsert', {
      type: 'notify',
      messages: [{ key: { remoteJid: '1@s.whatsapp.net' } }],
    });

    expect(handleMessages).toHaveBeenCalledWith(
      [{ key: { remoteJid: '1@s.whatsapp.net' } }],
      socket,
    );
  });

  it('logs metadata and delegates only notify upserted messages', async () => {
    const socket = createSocket();
    vi.mocked(makeWASocket).mockReturnValue(socket as never);
    const handleMessages = vi.fn().mockResolvedValue(undefined);
    const service = await createService({ handleMessages });

    await service.onApplicationBootstrap();
    await socket.emit('messages.upsert', {
      type: 'notify',
      messages: [{ key: { remoteJid: '1@s.whatsapp.net', fromMe: false } }],
    });

    expect(consoleLog).toHaveBeenCalledWith(
      'WhatsApp messages.upsert received',
      {
        type: 'notify',
        count: 1,
        remoteJids: ['1@s.whatsapp.net'],
      },
    );
    expect(handleMessages).toHaveBeenCalledWith(
      [{ key: { remoteJid: '1@s.whatsapp.net', fromMe: false } }],
      socket,
    );
  });

  it('logs and skips non-notify upserted messages', async () => {
    const socket = createSocket();
    vi.mocked(makeWASocket).mockReturnValue(socket as never);
    const handleMessages = vi.fn().mockResolvedValue(undefined);
    const service = await createService({ handleMessages });

    await service.onApplicationBootstrap();
    await socket.emit('messages.upsert', {
      type: 'append',
      messages: [{ key: { remoteJid: '1@s.whatsapp.net', fromMe: false } }],
    });

    expect(consoleLog).toHaveBeenCalledWith(
      'WhatsApp messages.upsert received',
      {
        type: 'append',
        count: 1,
        remoteJids: ['1@s.whatsapp.net'],
      },
    );
    expect(consoleLog).toHaveBeenCalledWith(
      'Skipping WhatsApp messages.upsert because it is not a live notification',
      { type: 'append' },
    );
    expect(handleMessages).not.toHaveBeenCalled();
  });

  it('logs message handler failures from upsert events', async () => {
    const socket = createSocket();
    vi.mocked(makeWASocket).mockReturnValue(socket as never);
    const error = new Error('handler failed');
    const handleMessages = vi.fn().mockRejectedValue(error);
    const service = await createService({ handleMessages });

    await service.onApplicationBootstrap();
    await socket.emit('messages.upsert', {
      type: 'notify',
      messages: [{ key: { remoteJid: '1@s.whatsapp.net', fromMe: false } }],
    });

    expect(consoleError).toHaveBeenCalledWith(
      'Failed to handle WhatsApp messages.upsert',
      error,
    );
  });

  it('safely handles missing message key in upsert events', async () => {
    const socket = createSocket();
    vi.mocked(makeWASocket).mockReturnValue(socket as never);
    const handleMessages = vi.fn().mockResolvedValue(undefined);
    const service = await createService({ handleMessages });

    await service.onApplicationBootstrap();
    await socket.emit('messages.upsert', {
      type: 'notify',
      messages: [{ key: undefined as any }],
    });

    expect(consoleLog).toHaveBeenCalledWith(
      'WhatsApp messages.upsert received',
      {
        type: 'notify',
        count: 1,
        remoteJids: ['unknown'],
      },
    );
    expect(handleMessages).toHaveBeenCalled();
  });

  it('reconnects after non-logout close', async () => {
    const firstSocket = createSocket();
    const secondSocket = createSocket();
    vi.mocked(makeWASocket)
      .mockReturnValueOnce(firstSocket as never)
      .mockReturnValueOnce(secondSocket as never);
    const service = await createService();

    await service.onApplicationBootstrap();
    await firstSocket.emit('connection.update', {
      connection: 'close',
      lastDisconnect: { error: { output: { statusCode: 500 } } },
    });

    expect(makeWASocket).toHaveBeenCalledTimes(2);
  });

  it('does not reconnect after logged-out close', async () => {
    const socket = createSocket();
    vi.mocked(makeWASocket).mockReturnValue(socket as never);
    const service = await createService();

    await service.onApplicationBootstrap();
    await socket.emit('connection.update', {
      connection: 'close',
      lastDisconnect: {
        error: { output: { statusCode: DisconnectReason.loggedOut } },
      },
    });

    expect(makeWASocket).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(
      'WhatsApp connection closed because the account is logged out',
    );
  });

  it('ends the socket on application shutdown', async () => {
    const socket = createSocket();
    vi.mocked(makeWASocket).mockReturnValue(socket as never);
    const service = await createService();

    await service.onApplicationBootstrap();
    service.onApplicationShutdown('SIGTERM');

    expect(socket.end).toHaveBeenCalled();
  });
});

async function createService(
  overrides: {
    saveCreds?: () => Promise<void>;
    handleMessages?: (messages: unknown[], socket: unknown) => Promise<void>;
  } = {},
) {
  const moduleRef = await Test.createTestingModule({
    providers: [
      WhatsappConnectionService,
      {
        provide: WhatsappAuthStoreService,
        useValue: {
          createAuthState: vi.fn().mockResolvedValue({
            state: { creds: { id: 'creds' }, keys: {} },
            saveCreds:
              overrides.saveCreds ?? vi.fn().mockResolvedValue(undefined),
          }),
        },
      },
      {
        provide: WhatsappMessageService,
        useValue: {
          handleMessages:
            overrides.handleMessages ?? vi.fn().mockResolvedValue(undefined),
        },
      },
    ],
  }).compile();

  return moduleRef.get(WhatsappConnectionService);
}

function createSocket() {
  const handlers = new Map<
    string,
    (payload: unknown) => Promise<void> | void
  >();

  return {
    ev: {
      on: vi.fn(
        (
          event: string,
          handler: (payload: unknown) => Promise<void> | void,
        ) => {
          handlers.set(event, handler);
        },
      ),
    },
    end: vi.fn(),
    async emit(event: string, payload: unknown) {
      await handlers.get(event)?.(payload);
    },
  };
}

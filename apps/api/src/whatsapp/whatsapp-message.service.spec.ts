import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WhatsappMessageService } from './whatsapp-message.service';

describe('WhatsappMessageService', () => {
  let consoleLog: ReturnType<typeof vi.spyOn>;
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('logs the sender number and replies Hello for direct inbound messages', async () => {
    const service = await createService();
    const socket = { sendMessage: vi.fn().mockResolvedValue({}) };

    await service.handleMessages(
      [message({ remoteJid: '5491112345678@s.whatsapp.net' })],
      socket,
    );

    expect(consoleLog).toHaveBeenCalledWith('5491112345678');
    expect(socket.sendMessage).toHaveBeenCalledWith(
      '5491112345678@s.whatsapp.net',
      { text: 'Hello' },
    );
  });

  it('skips messages sent by the connected account', async () => {
    const service = await createService();
    const socket = { sendMessage: vi.fn().mockResolvedValue({}) };

    await service.handleMessages(
      [message({ remoteJid: '5491112345678@s.whatsapp.net', fromMe: true })],
      socket,
    );

    expect(consoleLog).not.toHaveBeenCalled();
    expect(socket.sendMessage).not.toHaveBeenCalled();
  });

  it('skips group chats', async () => {
    const service = await createService();
    const socket = { sendMessage: vi.fn().mockResolvedValue({}) };

    await service.handleMessages(
      [message({ remoteJid: '120363123456789@g.us' })],
      socket,
    );

    expect(socket.sendMessage).not.toHaveBeenCalled();
  });

  it('skips status, broadcast, and channel-like JIDs', async () => {
    const service = await createService();
    const socket = { sendMessage: vi.fn().mockResolvedValue({}) };

    await service.handleMessages(
      [
        message({ remoteJid: 'status@broadcast' }),
        message({ remoteJid: '12345@broadcast' }),
        message({ remoteJid: '12345@newsletter' }),
      ],
      socket,
    );

    expect(socket.sendMessage).not.toHaveBeenCalled();
  });

  it('skips messages without remoteJid', async () => {
    const service = await createService();
    const socket = { sendMessage: vi.fn().mockResolvedValue({}) };

    await service.handleMessages([message({ remoteJid: undefined })], socket);

    expect(socket.sendMessage).not.toHaveBeenCalled();
  });

  it('logs reply failures without throwing', async () => {
    const service = await createService();
    const socket = { sendMessage: vi.fn().mockRejectedValue(new Error('boom')) };

    await expect(
      service.handleMessages(
        [message({ remoteJid: '5491112345678@s.whatsapp.net' })],
        socket,
      ),
    ).resolves.toBeUndefined();

    expect(consoleError).toHaveBeenCalledWith(
      'Failed to reply to WhatsApp message from 5491112345678',
      expect.any(Error),
    );
  });
});

async function createService() {
  const moduleRef = await Test.createTestingModule({
    providers: [WhatsappMessageService],
  }).compile();

  return moduleRef.get(WhatsappMessageService);
}

function message({
  remoteJid,
  fromMe = false,
}: {
  remoteJid?: string;
  fromMe?: boolean;
}) {
  return {
    key: {
      remoteJid,
      fromMe,
    },
  };
}

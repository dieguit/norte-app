import { RequestContext } from '@mastra/core/request-context';
import type { ChannelHandler } from '@mastra/core/channels';
import { describe, expect, it, vi } from 'vitest';
import { createWhatsappChannel } from './whatsapp-channel';

type HandlerArgs = Parameters<ChannelHandler>;

function setup(linkedUser: string | null) {
  const links = {
    findUserByJid: vi.fn().mockResolvedValue(linkedUser),
    issueToken: vi.fn().mockResolvedValue('tok123'),
  };
  const channel = createWhatsappChannel({
    adapter: {} as never,
    links,
    webAppUrl: 'https://app.norte.test',
  });
  const thread = { post: vi.fn().mockResolvedValue(undefined) };
  const defaultHandler = vi.fn().mockResolvedValue(undefined);
  const ctx = {
    requestContext: new RequestContext(),
    signalMetadata: {},
    skipped: [],
  };
  const dm = channel.handlers!.onDirectMessage as ChannelHandler;
  const send = (author: { userId: string; isMe: boolean }) =>
    dm(
      thread as unknown as HandlerArgs[0],
      { author } as unknown as HandlerArgs[1],
      defaultHandler,
      ctx,
    );
  return { channel, links, thread, defaultHandler, ctx, send, dm };
}

describe('createWhatsappChannel', () => {
  it('only handles DMs', () => {
    const { channel } = setup(null);
    expect(channel.handlers?.onMention).toBe(false);
    expect(channel.handlers?.onSubscribedMessage).toBe(false);
  });

  it('replies with a link and skips the agent for unlinked senders', async () => {
    const { send, links, thread, defaultHandler } = setup(null);
    await send({ userId: '123@lid', isMe: false });
    expect(links.issueToken).toHaveBeenCalledWith('123@lid');
    expect(thread.post).toHaveBeenCalledWith(
      'Para usar Norte por WhatsApp, vinculá tu cuenta: https://app.norte.test/link/whatsapp?token=tok123',
    );
    expect(defaultHandler).not.toHaveBeenCalled();
  });

  it('runs the agent with the linked userId', async () => {
    const { send, thread, defaultHandler, ctx } = setup('user_1');
    await send({ userId: '549111@s.whatsapp.net', isMe: false });
    expect(ctx.requestContext.get('userId')).toBe('user_1');
    expect(defaultHandler).toHaveBeenCalledOnce();
    expect(thread.post).not.toHaveBeenCalled();
  });

  it('ignores the bot own messages', async () => {
    const { send, links, thread, defaultHandler } = setup(null);
    await send({ userId: 'me@s.whatsapp.net', isMe: true });
    expect(links.findUserByJid).not.toHaveBeenCalled();
    expect(thread.post).not.toHaveBeenCalled();
    expect(defaultHandler).not.toHaveBeenCalled();
  });

  it('ignores messages typed on the paired phone (raw.key.fromMe)', async () => {
    const { createBaileysAdapter } = await import('chat-adapter-baileys');
    const adapter = createBaileysAdapter({
      auth: {
        state: {
          creds: {},
          keys: { get: () => Promise.resolve({}), set: async () => {} },
        } as never,
        saveCreds: async () => {},
      },
    });
    const fromMe = adapter.parseMessage({
      key: { remoteJid: '549111@s.whatsapp.net', fromMe: true, id: 'X1' },
      message: { conversation: 'hola' },
      messageTimestamp: 1,
    });
    const incoming = adapter.parseMessage({
      key: { remoteJid: '549111@s.whatsapp.net', fromMe: false, id: 'X2' },
      message: { conversation: 'hola' },
      messageTimestamp: 1,
    });

    const { dm, links, thread, defaultHandler, ctx } = setup(null);
    await dm(thread as unknown as HandlerArgs[0], fromMe, defaultHandler, ctx);
    expect(links.findUserByJid).not.toHaveBeenCalled();
    expect(thread.post).not.toHaveBeenCalled();
    expect(defaultHandler).not.toHaveBeenCalled();

    await dm(
      thread as unknown as HandlerArgs[0],
      incoming,
      defaultHandler,
      ctx,
    );
    expect(links.findUserByJid).toHaveBeenCalledWith('549111@s.whatsapp.net');
  });

  it('scopes memory to the Norte user, falling back to the default', async () => {
    const linked = setup('user_1').channel.resolveResourceId!;
    const unlinked = setup(null).channel.resolveResourceId!;
    const ctx = (userId: string) =>
      ({
        message: { author: { userId } },
        defaultResourceId: `whatsapp:${userId}`,
      }) as never;
    await expect(linked(ctx('a@lid'))).resolves.toBe('user:user_1');
    await expect(unlinked(ctx('a@lid'))).resolves.toBe('whatsapp:a@lid');
  });

  it('hides raw errors from WhatsApp users', () => {
    const { channel } = setup(null);
    const config = channel.adapters.whatsapp as {
      formatError: (e: Error) => unknown;
    };
    expect(config.formatError(new Error('db exploded'))).toBe(
      'Ups, algo salió mal. Probá de nuevo en un rato.',
    );
  });
});

import type { ChannelConfig } from '@mastra/core/channels';
import type { ChatChannel } from './whatsapp.adapter.provider';
import type { WhatsappLinksService } from './whatsapp-links.service';

export function createWhatsappChannel({
  channel,
  links,
  webAppUrl,
}: {
  channel: ChatChannel;
  links: Pick<WhatsappLinksService, 'findUserByJid' | 'issueToken'>;
  webAppUrl: string;
}): ChannelConfig {
  return {
    adapters: {
      [channel.key]: {
        // BaileysAdapter.reply(message, content) doesn't match Chat's reply(threadId, messageId, content); Mastra only uses thread.post, so never call thread.reply on this channel.
        adapter: channel.adapter as never,
        formatError: () => 'Ups, algo salió mal. Probá de nuevo en un rato.',
        // Users only see Norte's reply; tool calls, args and tool errors stay internal.
        toolDisplay: 'hidden',
      },
    },
    // Finance data is private: groups are ignored, only DMs reach the agent.
    handlers: {
      onMention: false,
      onSubscribedMessage: false,
      onDirectMessage: async (thread, message, defaultHandler, ctx) => {
        if (
          message.author.isMe ||
          (message.raw as { key?: { fromMe?: boolean } } | undefined)?.key
            ?.fromMe
        )
          return;
        const jid = message.author.userId;
        const userId = await links.findUserByJid(jid);
        if (!userId) {
          const token = await links.issueToken(jid);
          await thread.post(
            `Para usar Norte por ${channel.key === 'telegram' ? 'Telegram' : 'WhatsApp'}, vinculá tu cuenta: ${webAppUrl}/link/whatsapp?token=${token}`,
          );
          return;
        }
        ctx.requestContext.set('userId', userId);
        await defaultHandler(thread, message);
      },
    },
    resolveResourceId: async ({ message, defaultResourceId }) => {
      const userId = await links.findUserByJid(message.author.userId);
      return userId ? `user:${userId}` : defaultResourceId;
    },
  };
}

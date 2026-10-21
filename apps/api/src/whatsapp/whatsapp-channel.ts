import { AsyncLocalStorage } from 'node:async_hooks';
import { Logger } from '@nestjs/common';
import type { ChannelConfig } from '@mastra/core/channels';
import type { ChatChannel } from './whatsapp.adapter.provider';
import type { WhatsappLinksService } from './whatsapp-links.service';
import type { NotificationsService } from '../notifications/notifications.service';

const logger = new Logger('ChatChannel');
const turn = new AsyncLocalStorage<{ failed: boolean }>();

export function createWhatsappChannel({
  channel,
  links,
  notifications,
  webAppUrl,
}: {
  channel: ChatChannel;
  links: Pick<WhatsappLinksService, 'findUserByJid' | 'issueToken'>;
  notifications: Pick<NotificationsService, 'markAnswered'>;
  webAppUrl: string;
}): ChannelConfig {
  return {
    // Mastra defaults to 'concurrent': messages sent mid-reply would start overlapping agent runs on the same chat.
    chatOptions: { concurrency: 'queue' },
    adapters: {
      [channel.key]: {
        // BaileysAdapter.reply(message, content) doesn't match Chat's reply(threadId, messageId, content); Mastra only uses thread.post, so never call thread.reply on this channel.
        adapter: channel.adapter as never,
        formatError: () => {
          const state = turn.getStore();
          if (state) state.failed = true;
          return 'Ups, algo salió mal. Probá de nuevo en un rato.';
        },
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
        // Any reply closes the day-close check-in window, so no timeout message follows.
        // ponytail: markAnswered runs here in onDirectMessage (after queue drain) because neither
        // Mastra channels nor Chat SDK expose a pre-queue hook on message receipt. A reply queued
        // behind a busy agent turn at the window boundary may still get the timeout message.
        // Upgrade when Chat SDK adds onEnqueue/pre-dispatch hooks or custom StateAdapter queue observation.
        await notifications
          .markAnswered(userId)
          .catch((error: unknown) =>
            logger.warn(`markAnswered failed for ${userId}: ${String(error)}`),
          );
        const batch = [...ctx.skipped, message];
        const react = (emoji: string, remove = false) =>
          Promise.all(
            batch.map((m) =>
              (remove
                ? thread.adapter.removeReaction(thread.id, m.id, emoji)
                : thread.adapter.addReaction(thread.id, m.id, emoji)
              ).catch((error: unknown) =>
                logger.warn(
                  `Reaction ${emoji} failed on ${m.id}: ${String(error)}`,
                ),
              ),
            ),
          );
        await react('👀');
        const state = { failed: false };
        await turn.run(state, () => defaultHandler(thread, message));
        await react('👀', true);
        if (state.failed) await react('😢');
      },
    },
    resolveResourceId: async ({ message, defaultResourceId }) => {
      const userId = await links.findUserByJid(message.author.userId);
      return userId ? `user:${userId}` : defaultResourceId;
    },
  };
}

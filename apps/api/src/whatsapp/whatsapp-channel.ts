import { AsyncLocalStorage } from 'node:async_hooks';
import { Logger } from '@nestjs/common';
import type {
  ChannelConfig,
  ChannelHandlerContext,
} from '@mastra/core/channels';
import type { ChatChannel } from './whatsapp.adapter.provider';
import type { WhatsappLinksService } from './whatsapp-links.service';
import type { NotificationsService } from '../notifications/notifications.service';

const logger = new Logger('ChatChannel');
const turn = new AsyncLocalStorage<{ failed: boolean }>();

const BLOCKED_REPLIES = {
  injection:
    'No puedo cambiar cómo funciono ni compartir mis instrucciones internas 🙂 Sí te ayudo con tus finanzas: registrar gastos o ingresos, ver tus objetivos o cómo venís con tu plan. ¿Qué necesitás?',
  selfHarm:
    'Lamento mucho que estés pasando por esto. No estás solo/a: podés hablar gratis con el Centro de Asistencia al Suicida al 135 (CABA y GBA) o al 0800 345 1435 desde todo el país. Si estás en peligro ahora, llamá al 911. 💙',
  moderation:
    'Prefiero que mantengamos la charla respetuosa. Estoy para ayudarte con tus finanzas: registrar gastos o ingresos, revisar tus objetivos o tu plan. ¿En qué te doy una mano?',
  fallback:
    'No pude procesar ese mensaje. Probá escribirlo de otra forma, por ejemplo: "gasté 5 lucas en el súper".',
};

// ponytail: matches Mastra's postTripwire text ("🛡️ Blocked by <processorId>: <reason>"); no hook exists to format it. Replace if Mastra adds a tripwire formatter to channel config.
function blockedReply(text: string): string {
  if (text.includes('prompt-injection-detector'))
    return BLOCKED_REPLIES.injection;
  if (text.includes('self-harm')) return BLOCKED_REPLIES.selfHarm;
  if (text.includes('Blocked by moderation')) return BLOCKED_REPLIES.moderation;
  return BLOCKED_REPLIES.fallback;
}

function withSpanishBlocks<T extends { post: (message: never) => unknown }>(
  thread: T,
): T {
  return new Proxy(thread, {
    get(target, prop) {
      if (prop === 'post')
        return (message: unknown) =>
          target.post(
            (typeof message === 'string' && message.startsWith('🛡️')
              ? blockedReply(message)
              : message) as never,
          );
      const value: unknown = Reflect.get(target, prop, target);
      return typeof value === 'function'
        ? (value.bind(target) as unknown)
        : value;
    },
  });
}

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
  type Post = (text: string) => Promise<unknown>;
  const linkedUser = async (jid: string, post: Post) => {
    const userId = await links.findUserByJid(jid);
    if (!userId) {
      const token = await links.issueToken(jid);
      await post(
        `Para usar Norte por ${channel.key === 'telegram' ? 'Telegram' : 'WhatsApp'}, vinculá tu cuenta: ${webAppUrl}/link/whatsapp?token=${token}`,
      );
    }
    return userId;
  };
  const reset = async (
    mastra: ChannelHandlerContext['mastra'],
    userId: string,
    post: Post,
  ) => {
    const memory = await mastra?.getAgent('norteAgent').getMemory();
    if (memory) {
      const { threads } = await memory.listThreads({
        filter: {
          resourceId: `user:${userId}`,
          metadata: { channel_platform: channel.key },
        },
        perPage: false,
      });
      await Promise.all(threads.map((t) => memory.deleteThread(t.id)));
    }
    await post('Listo, empezamos de cero 🧭');
  };
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
      // Telegram routes "/..." here instead of onDirectMessage; Mastra's default would run the agent without the link gate.
      onSlashCommand: async (event, _defaultHandler, ctx) => {
        // event.channel.isDM is always false for slash commands; ask the adapter.
        if (!event.adapter.isDM?.(event.channel.id) || event.user.isMe) return;
        const post = (text: string) => event.channel.post(text);
        const userId = await linkedUser(event.user.userId, post);
        if (!userId) return;
        if (event.command.toLowerCase() === '/reset')
          return reset(ctx.mastra, userId, post);
        await post(
          'Hola 👋 Escribime lo que necesites, por ejemplo "gasté 5 lucas en el súper". Con /reset empezamos la charla de cero.',
        );
      },
      onDirectMessage: async (thread, message, defaultHandler, ctx) => {
        if (
          message.author.isMe ||
          (message.raw as { key?: { fromMe?: boolean } } | undefined)?.key
            ?.fromMe
        )
          return;
        const post = (text: string) => thread.post(text);
        const userId = await linkedUser(message.author.userId, post);
        if (!userId) return;
        if (message.text.trim().toLowerCase() === '/reset')
          return reset(ctx.mastra, userId, post);
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
        await turn.run(state, () =>
          defaultHandler(withSpanishBlocks(thread), message),
        );
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

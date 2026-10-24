import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MASTRA } from '@mastra/nestjs';
import type { Mastra } from '@mastra/core/mastra';
import {
  definitionOf,
  NOTIFICATION_DEFINITIONS,
} from '../notifications/notification-definitions';
import {
  NotificationsService,
  type NotificationDelivery,
} from '../notifications/notifications.service';
import { BenefitsService } from '../benefits/benefits.service';
import {
  WHATSAPP_ADAPTER,
  type ChatChannel,
} from '../whatsapp/whatsapp.adapter.provider';

@Injectable()
export class NotificationsCron {
  private readonly logger = new Logger('NotificationsCron');

  constructor(
    @Inject(MASTRA) private readonly mastra: Mastra,
    @Inject(WHATSAPP_ADAPTER) private readonly channel: ChatChannel | null,
    private readonly notifications: NotificationsService,
    private readonly benefits: BenefitsService,
  ) {}

  // ponytail: assumes a single API instance (like pending actions); claims are unique-key safe, add row locks or pg-boss before scaling out.
  @Cron('0,30 * * * *')
  async tick() {
    try {
      await this.run(new Date());
    } catch (error) {
      this.logger.error(`Notifications tick failed: ${String(error)}`);
    }
  }

  async run(now: Date) {
    const channel = this.channel;
    if (!channel) return;
    for (const delivery of await this.notifications.closeExpired(now)) {
      const text = definitionOf(delivery.type).reply?.timeoutMessage;
      if (!text) continue;
      await this.send(channel, delivery, text, now).catch((error: unknown) =>
        this.logger.error(
          `Timeout message ${delivery.id} failed: ${String(error)}`,
        ),
      );
    }
    for (const delivery of await this.notifications.claimDue(now)) {
      try {
        const text = await this.messageFor(delivery, now);
        if (!text) continue; // row was claimed 'closed'; stays unsent so catch-up won't retry it
        await this.send(channel, delivery, text, now);
        await this.notifications.markSent(delivery.id, now);
      } catch (error) {
        this.logger.error(
          `Notification ${delivery.id} failed: ${String(error)}`,
        );
        await this.notifications
          .markClosed(delivery.id)
          .catch((error: unknown) =>
            this.logger.error(
              `Marking notification ${delivery.id} closed failed: ${String(error)}`,
            ),
          );
      }
    }
  }

  private messageFor(
    { type, userId }: NotificationDelivery,
    now: Date,
  ): Promise<string | null> {
    switch (type) {
      case 'day_close_checkin':
        return Promise.resolve(
          NOTIFICATION_DEFINITIONS.day_close_checkin.message,
        );
      case 'savings_digest':
        return this.benefits.buildDigest(userId, now);
    }
  }

  private async send(
    channel: ChatChannel,
    { userId, jid }: NotificationDelivery,
    text: string,
    now: Date,
  ) {
    await channel.adapter.postMessage(await channel.adapter.openDM(jid), text);
    await this.remember(channel, userId, text, now).catch((error: unknown) =>
      this.logger.warn(`Memory write failed for ${userId}: ${String(error)}`),
    );
  }

  // Proactive posts bypass the agent, so we store them in its memory for "Listo"/"sí" replies to make sense.
  private async remember(
    channel: ChatChannel,
    userId: string,
    text: string,
    now: Date,
  ) {
    const memory = await this.mastra.getAgent('norteAgent').getMemory();
    if (!memory) return;
    const resourceId = `user:${userId}`;
    const { threads } = await memory.listThreads({
      filter: { resourceId, metadata: { channel_platform: channel.key } },
      perPage: 1,
    });
    const threadId = threads[0]?.id;
    if (!threadId) return;
    await memory.saveMessages({
      messages: [
        {
          id: randomUUID(),
          role: 'assistant',
          createdAt: now,
          threadId,
          resourceId,
          type: 'text',
          content: { format: 2, parts: [{ type: 'text', text }] },
        },
      ],
    });
  }
}

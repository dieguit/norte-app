import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  NOTIFICATION_TYPES,
  type NotificationSetting,
  type NotificationType,
  type UpdateNotificationSetting,
} from '@repo/shared-types';
import { and, eq, inArray, lte } from 'drizzle-orm';
import {
  argentinaInstant,
  previousDay,
  todayInArgentina,
} from '../argentina-time';
import { DATABASE_CONNECTION } from '../database/database.constants';
import type { Database } from '../database/database.types';
import { whatsappLinks } from '../whatsapp/whatsapp.schema';
import {
  DEFAULT_NOTIFICATION_TIME,
  NOTIFICATION_DEFINITIONS,
} from './notification-definitions';
import { notificationSettings, notifications } from './notifications.schema';

const CATCH_UP_MS = 2 * 60 * 60 * 1000;
const logger = new Logger('NotificationsService');

export type NotificationDelivery = {
  id: string;
  userId: string;
  type: NotificationType;
  jid: string;
};

const toSetting = (
  type: NotificationType,
  row?: { enabled: boolean; time: string },
): NotificationSetting => ({
  type,
  enabled: row?.enabled ?? false,
  frequency: 'daily',
  time: row?.time ?? DEFAULT_NOTIFICATION_TIME,
});

@Injectable()
export class NotificationsService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async listSettings(userId: string): Promise<NotificationSetting[]> {
    const rows = await this.db
      .select()
      .from(notificationSettings)
      .where(eq(notificationSettings.userId, userId));
    return NOTIFICATION_TYPES.map((type) =>
      toSetting(
        type,
        rows.find((row) => row.type === type),
      ),
    );
  }

  async updateSetting(
    userId: string,
    type: NotificationType,
    patch: UpdateNotificationSetting,
  ): Promise<NotificationSetting> {
    if (patch.enabled === undefined && patch.time === undefined)
      throw new BadRequestException(
        'Indicá si activar/desactivar o el horario.',
      );
    const [row] = await this.db
      .insert(notificationSettings)
      .values({
        userId,
        type,
        enabled: patch.enabled ?? false,
        time: patch.time ?? DEFAULT_NOTIFICATION_TIME,
      })
      .onConflictDoUpdate({
        target: [notificationSettings.userId, notificationSettings.type],
        set: {
          ...(patch.enabled !== undefined && { enabled: patch.enabled }),
          ...(patch.time !== undefined && { time: patch.time }),
        },
      })
      .returning();
    return toSetting(type, row);
  }

  // ponytail: loads every enabled setting each tick; filter slots in SQL once user count makes this slow.
  async claimDue(now: Date): Promise<NotificationDelivery[]> {
    const candidates = await this.db
      .select({
        userId: notificationSettings.userId,
        type: notificationSettings.type,
        time: notificationSettings.time,
        jid: whatsappLinks.jid,
      })
      .from(notificationSettings)
      .innerJoin(
        whatsappLinks,
        eq(whatsappLinks.userId, notificationSettings.userId),
      )
      .where(eq(notificationSettings.enabled, true));
    const today = todayInArgentina(now).today;
    const periods = [today, previousDay(today)];
    const claimed: NotificationDelivery[] = [];
    for (const candidate of candidates) {
      for (const period of periods) {
        const scheduledAt = argentinaInstant(period, candidate.time);
        const lateMs = now.getTime() - scheduledAt.getTime();
        if (lateMs < 0 || lateMs >= CATCH_UP_MS) continue;
        try {
          const [row] = await this.db
            .insert(notifications)
            .values({
              userId: candidate.userId,
              type: candidate.type,
              period,
              scheduledAt,
              status: 'open',
            })
            .onConflictDoNothing()
            .returning({ id: notifications.id });
          if (row)
            claimed.push({
              id: row.id,
              userId: candidate.userId,
              type: candidate.type as NotificationType,
              jid: candidate.jid,
            });
        } catch (error: unknown) {
          logger.error(
            `Failed to claim delivery for user ${candidate.userId} (${candidate.type}/${period}): ${String(error)}`,
          );
        }
      }
    }
    return claimed;
  }

  async closeExpired(now: Date): Promise<NotificationDelivery[]> {
    const closed: {
      id: string;
      userId: string;
      type: string;
      sentAt: Date | null;
    }[] = [];
    for (const [type, { replyWindowMinutes }] of Object.entries(
      NOTIFICATION_DEFINITIONS,
    )) {
      const cutoff = new Date(now.getTime() - replyWindowMinutes * 60_000);
      closed.push(
        ...(await this.db
          .update(notifications)
          .set({ status: 'closed' })
          .where(
            and(
              eq(notifications.status, 'open'),
              eq(notifications.type, type),
              lte(notifications.scheduledAt, cutoff),
            ),
          )
          .returning({
            id: notifications.id,
            userId: notifications.userId,
            type: notifications.type,
            sentAt: notifications.sentAt,
          })),
      );
    }
    // A claimed-but-never-sent row (crash mid-tick) closes silently: no timeout for a check-in the user never got.
    const sent = closed.filter((row) => row.sentAt);
    if (!sent.length) return [];
    const links = await this.db
      .select()
      .from(whatsappLinks)
      .where(
        inArray(
          whatsappLinks.userId,
          sent.map((row) => row.userId),
        ),
      );
    const jidByUser = new Map(links.map((link) => [link.userId, link.jid]));
    return sent.flatMap(({ id, userId, type }) => {
      const jid = jidByUser.get(userId);
      return jid ? [{ id, userId, type: type as NotificationType, jid }] : [];
    });
  }

  async markSent(id: string, at: Date): Promise<void> {
    await this.db
      .update(notifications)
      .set({ sentAt: at })
      .where(eq(notifications.id, id));
  }

  async markClosed(id: string): Promise<void> {
    await this.db
      .update(notifications)
      .set({ status: 'closed' })
      .where(eq(notifications.id, id));
  }

  async markAnswered(userId: string): Promise<boolean> {
    const answered = await this.db
      .update(notifications)
      .set({ status: 'answered' })
      .where(
        and(eq(notifications.userId, userId), eq(notifications.status, 'open')),
      )
      .returning({ id: notifications.id });
    return answered.length > 0;
  }
}

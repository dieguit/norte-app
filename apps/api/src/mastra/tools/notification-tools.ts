import { createTool } from '@mastra/core/tools';
import {
  NotificationTimeSchema,
  NotificationTypeSchema,
} from '@repo/shared-types';
import { z } from 'zod';
import type { NorteServices } from '../services';
import { toolResult } from './tool-result';
import { requireUserId } from './user-context';

type NotificationServices = Pick<NorteServices, 'notifications' | 'finances'>;

export function createNotificationTools({
  notifications,
  finances,
}: NotificationServices) {
  const userIdFrom = (context: { requestContext?: unknown } | undefined) =>
    requireUserId(context?.requestContext as never);

  return {
    getNotificationSettings: createTool({
      id: 'get-notification-settings',
      description:
        "User's proactive notification settings. day_close_checkin is the daily check-in asking for the day's missing movements; savings_digest is the daily list of today's benefits. time is HH:mm in Argentina time.",
      inputSchema: z.object({}),
      execute: (_input, context) =>
        toolResult(
          'get-notification-settings',
          context?.requestContext as never,
          () => notifications.listSettings(userIdFrom(context)),
        ),
    }),

    updateNotificationSetting: createTool({
      id: 'update-notification-setting',
      description:
        'Enables/disables a notification and/or changes its time. Writes immediately (no confirmation). time must be HH:00 or HH:30, Argentina time. Send at least one of enabled or time.',
      inputSchema: z.object({
        type: NotificationTypeSchema,
        enabled: z.boolean().optional(),
        time: NotificationTimeSchema.optional(),
      }),
      execute: ({ type, ...patch }, context) =>
        toolResult(
          'update-notification-setting',
          context?.requestContext as never,
          () => notifications.updateSetting(userIdFrom(context), type, patch),
        ),
    }),

    getDailySummary: createTool({
      id: 'get-daily-summary',
      description:
        "Today's (Argentina) incomes, expenses and contributions registered today, with totals per currency.",
      inputSchema: z.object({}),
      execute: (_input, context) =>
        toolResult('get-daily-summary', context?.requestContext as never, () =>
          finances.getDailySummary(userIdFrom(context)),
        ),
    }),
  };
}

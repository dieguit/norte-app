import { createZodDto } from 'nestjs-zod';
import {
  NotificationSettingSchema,
  NotificationSettingsResponseSchema,
  NotificationTypeSchema,
  UpdateNotificationSettingSchema,
} from '@repo/shared-types';
import { z } from 'zod';

export class NotificationTypeParamsDto extends createZodDto(
  z.object({ type: NotificationTypeSchema }),
) {}
export class UpdateNotificationSettingDto extends createZodDto(
  UpdateNotificationSettingSchema,
) {}
export class NotificationSettingDto extends createZodDto(
  NotificationSettingSchema,
) {}
export class NotificationSettingsResponseDto extends createZodDto(
  NotificationSettingsResponseSchema,
) {}

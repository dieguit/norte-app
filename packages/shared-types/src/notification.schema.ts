import { z } from "zod";

export const NOTIFICATION_TYPES = ["day_close_checkin"] as const;
export const NotificationTypeSchema = z.enum(NOTIFICATION_TYPES);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

export const NotificationTimeSchema = z
  .string()
  .regex(
    /^([01]\d|2[0-3]):(00|30)$/,
    "Elegí un horario en punto o y media (ej. 21:00 o 21:30).",
  );

export const NotificationSettingSchema = z.object({
  type: NotificationTypeSchema,
  enabled: z.boolean(),
  frequency: z.literal("daily"),
  time: NotificationTimeSchema,
});
export type NotificationSetting = z.infer<typeof NotificationSettingSchema>;

export const NotificationSettingsResponseSchema = z.object({
  settings: z.array(NotificationSettingSchema),
});

export const UpdateNotificationSettingSchema = z
  .object({
    enabled: z.boolean().optional(),
    time: NotificationTimeSchema.optional(),
  })
  .refine((v) => v.enabled !== undefined || v.time !== undefined, {
    message: "Indicá si activar/desactivar o el horario.",
  });
export type UpdateNotificationSetting = z.infer<
  typeof UpdateNotificationSettingSchema
>;

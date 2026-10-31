import type { NotificationType } from '@repo/shared-types';

export type NotificationDefinition = {
  defaultTime: string;
  message?: string;
  // Only reply-expecting notifications are claimed 'open' and get a timeout follow-up.
  reply?: { windowMinutes: number; timeoutMessage: string };
};

export const NOTIFICATION_DEFINITIONS = {
  day_close_checkin: {
    defaultTime: '21:00',
    message: `Paso por nuestro chequeo diario 🧭

¿Te quedó algún gasto, ingreso o movimiento de hoy por registrar?

Si sí, mandámelo por acá como te salga: texto, foto o captura. Yo me encargo de ordenarlo. Recordá que sí o sí necesito MONEDA/MONTO/CATEGORÍA.

Si ya me mandaste todo durante el día u hoy no hubo nada más, respondeme simplemente "Listo" ✅

Y cerramos el día.`,
    reply: {
      windowMinutes: 30,
      timeoutMessage: `Cerramos el día, avisame si querés resumen del día.

Hasta mañana!🧭`,
    },
  },
  savings_digest: { defaultTime: '09:00' },
} satisfies Record<NotificationType, NotificationDefinition>;

export const definitionOf = (type: NotificationType): NotificationDefinition =>
  NOTIFICATION_DEFINITIONS[type];

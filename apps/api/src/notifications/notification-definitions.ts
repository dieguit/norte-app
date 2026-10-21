import type { NotificationType } from '@repo/shared-types';

export const DEFAULT_NOTIFICATION_TIME = '21:00';

export const NOTIFICATION_DEFINITIONS: Record<
  NotificationType,
  { message: string; replyWindowMinutes: number; timeoutMessage: string }
> = {
  day_close_checkin: {
    message: `Paso por nuestro chequeo diario 🧭

¿Te quedó algún gasto, ingreso o movimiento de hoy por registrar?

Si sí, mandámelo por acá como te salga: texto, foto o captura. Yo me encargo de ordenarlo. Recordá que sí o sí necesito MONEDA/MONTO/CATEGORÍA.

Si ya me mandaste todo durante el día o hoy no hubo nada más, respondeme simplemente "Listo" ✅

Y cerramos el día.`,
    replyWindowMinutes: 30,
    timeoutMessage: `Cerramos el día, avisame si querés resumen del día.

Hasta mañana!🧭`,
  },
};

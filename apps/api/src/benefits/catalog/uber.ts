import type { Provider } from './types';

export const uber: Provider = {
  slug: 'uber',
  name: 'Uber',
  kind: 'membership',
  instruments: [
    {
      slug: 'uber-one',
      label: 'Uber One',
      type: 'membership',
      usage: 'subscription',
      evidenceUrl: 'https://www.uber.com/ar/es/uber-one/',
    },
  ],
  sources: [
    {
      id: 'uber-one',
      url: 'https://www.uber.com/ar/es/uber-one/',
      strategy: 'fetch',
      instructions:
        'Beneficios fijos Uber One Argentina: recurrence ongoing, eligibility membership instrumentSlug uber-one solamente. Extraé envío sin costo, ahorros en cuota de servicio, créditos en viajes y soporte premium separados. TODOS llevan capState unknown y caps [] porque no consta tope; incluso soporte premium: nunca none. Créditos promocionales NO son cashback ni descuento: offer other con descripción literal, distinguiendo hasta 10% categorías básicas y hasta 15% Comfort/Black, vencen 60 días, no efectivo. Preservá mínimos desconocidos (minimumSpendMinor null), comercios con ícono Uber One, ciudades seleccionadas y productos elegibles. requiredActions debe incluir las restricciones relevantes de cada perk: cuota de servicio excluye impuestos/propinas/otros cargos; créditos excluyen parte pagada con créditos previos, impuestos y tarifas, se acreditan hasta 1 hora, vencen 60 días, no efectivo. Usá incomplete y unresolved si faltan mínimos/locales/porcentajes exactos; no garantices 15% en todos los viajes. No inventes fechas. Soporte premium es other, no descuento.',
      status: 'degraded',
      enabled: true,
      autoPublish: false,
      coverage: 'partial',
      note: 'validado 30/10/2026: 4 válidos; mínimos, locales y porcentajes variables pendientes; ongoing, sin publicar automáticamente.',
    },
  ],
};

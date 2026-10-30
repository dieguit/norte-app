import type { Provider } from './types';

export const uala: Provider = {
  slug: 'uala',
  name: 'Ualá',
  kind: 'wallet',
  instruments: [
    {
      slug: 'uala-mastercard-prepaga',
      label: 'Ualá Mastercard prepaga',
      network: 'mastercard',
      type: 'prepaid',
      issuerCountry: 'AR',
      evidenceUrl: 'https://www.uala.com.ar/promociones',
    },
    {
      slug: 'uala-mastercard-credito',
      label: 'Ualá Mastercard crédito',
      network: 'mastercard',
      type: 'credit',
      issuerCountry: 'AR',
      evidenceUrl: 'https://www.uala.com.ar/tarjeta-de-credito',
    },
  ],
  sources: [
    {
      id: 'uala-promociones',
      url: 'https://www.uala.com.ar/promociones',
      strategy: 'fetch',
      instructions:
        'Promociones Ualá: distinguí tarjeta prepaga y crédito según los métodos de cada promoción, nunca por el filtro general. Conservá Contactless, categorías y comercios como condiciones obligatorias; PedidosYa Mascotas no es todo PedidosYa. La página es un resumen sin legales: si faltan condiciones esenciales, eligibilityCompleteness incomplete y unresolved. Topes y fechas desconocidos no son sin tope ni ilimitados. Incluí citas literales eligibility y offer.',
      status: 'degraded',
      enabled: true,
      autoPublish: false,
      coverage: 'partial',
      note: 'validado 30/10/2026: 9 válidos incompletos; resumen distingue prepaga/crédito pero omite comercios, topes y vigencias; sin publicación automática.',
    },
  ],
};

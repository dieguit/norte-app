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
        'Promociones Ualá: distinguí tarjeta prepaga y crédito, comercios, reintegros y topes.',
      status: 'pending_validation',
      enabled: false,
      autoPublish: false,
      coverage: 'partial',
      note: 'HTTP 200; HTML extenso, posible truncamiento; falta validar extracción.',
    },
  ],
};

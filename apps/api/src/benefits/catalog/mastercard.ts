import type { Provider } from './types';

export const mastercard: Provider = {
  slug: 'mastercard',
  name: 'Mastercard',
  kind: 'network',
  instruments: [],
  appliesTo: { network: 'mastercard' },
  sources: [
    {
      id: 'mastercard-ofertas',
      url: 'https://www.mastercard.com/ar/es/personal/experience-mastercard/conozca-nuestras-ofertas-y-promociones.html',
      strategy: 'fetch',
      instructions:
        'Ofertas Mastercard Argentina: expresá elegibilidad por red y tipo de tarjeta, sin inferir banco emisor.',
      status: 'blocked',
      enabled: false,
      autoPublish: false,
      coverage: 'unknown',
      note: 'HTTP 403 de Akamai; acceso bloqueado.',
    },
  ],
};

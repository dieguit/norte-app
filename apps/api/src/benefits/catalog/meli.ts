import type { Provider } from './types';

export const meli: Provider = {
  slug: 'meli',
  name: 'Meli+',
  kind: 'membership',
  instruments: [
    {
      slug: 'meli-plus-esencial',
      label: 'Meli+ Esencial',
      type: 'membership',
      usage: 'subscription',
      evidenceUrl: 'https://www.mercadolibre.com.ar/suscripciones/melimas',
    },
    {
      slug: 'meli-plus-total',
      label: 'Meli+ Total',
      type: 'membership',
      usage: 'subscription',
      evidenceUrl: 'https://www.mercadolibre.com.ar/suscripciones/melimas',
    },
  ],
  sources: [
    {
      id: 'meli-plus',
      url: 'https://www.mercadolibre.com.ar/suscripciones/melimas',
      strategy: 'fetch',
      instructions:
        'Beneficios fijos Meli+: distinguí planes Esencial y Total y sus condiciones.',
      status: 'pending_validation',
      enabled: false,
      autoPublish: false,
      coverage: 'partial',
      note: 'HTTP 200; beneficios fijos y HTML extenso; falta validar extracción.',
    },
  ],
};

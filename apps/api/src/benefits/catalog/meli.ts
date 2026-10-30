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
        'Beneficios fijos Meli+: recurrence ongoing; eligibility membership meli-plus-esencial o meli-plus-total por beneficio, sin mezclar planes. No extraigas beneficios del título, navegación o publicidad sin términos de cada plan.',
      status: 'pending_validation',
      enabled: false,
      autoPublish: false,
      coverage: 'partial',
      note: 'validado 30/10/2026: 0 válidos; HTTP 200, app shell con navegación y error; sin términos Esencial/Total legibles.',
    },
  ],
};

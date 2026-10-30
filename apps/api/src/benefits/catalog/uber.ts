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
        'Beneficios fijos de Uber One en Argentina; extraé condiciones de la suscripción.',
      status: 'pending_validation',
      enabled: false,
      autoPublish: false,
      coverage: 'partial',
      note: 'HTTP 200; beneficios fijos y HTML extenso; falta validar extracción.',
    },
  ],
};

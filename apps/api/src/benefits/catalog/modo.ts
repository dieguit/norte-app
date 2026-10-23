import type { Provider } from './types';

export const modo: Provider = {
  slug: 'modo',
  name: 'MODO',
  kind: 'wallet',
  instruments: [{ slug: 'modo', label: 'MODO', type: 'membership' }],
  sources: [
    {
      url: 'https://www.modo.com.ar/promos',
      strategy: 'fetch',
      instructions: 'Promociones pagando con MODO. Si la promo exige un banco específico, mencionalo en conditions.',
    },
  ],
};

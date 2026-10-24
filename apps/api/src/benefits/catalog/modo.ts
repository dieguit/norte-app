import type { Provider } from './types';

export const modo: Provider = {
  slug: 'modo',
  name: 'MODO',
  kind: 'wallet',
  instruments: [{ slug: 'modo', label: 'MODO', type: 'membership' }],
  sources: [
    {
      url: 'https://www.modo.com.ar/promos/api/rewards/v2/search?query=reintegro&limit=10',
      strategy: 'json',
      instructions:
        'Promociones de la API de MODO en formato JSON. Cada item en cards contiene comercio (card.validity_place), reintegro (card.benefit), tope (card.cashback_cap), banco participante y días de vigencia (benefit.conditions.schedule). Si participating_bank indica un banco específico, mencionalo en conditions. Usá slug modo.',
    },
  ],
};

import type { Provider } from './types';

export const visa: Provider = {
  slug: 'visa',
  name: 'Visa',
  kind: 'network',
  instruments: [],
  appliesTo: { network: 'visa' },
  sources: [
    {
      url: 'https://www.visa.com.ar/ofertas-y-promociones.html',
      strategy: 'fetch',
      instructions: 'Promociones de Visa Argentina válidas para cualquier tarjeta Visa salvo que se indique un banco o tipo (crédito/débito) específico.',
    },
  ],
};

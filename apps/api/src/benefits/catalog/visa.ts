import type { Provider } from './types';

export const visa: Provider = {
  slug: 'visa',
  name: 'Visa',
  kind: 'network',
  instruments: [],
  appliesTo: { network: 'visa' },
  sources: [
    {
      url: 'https://www.visa.com.ar/bin/aem/rest?version=2&contentType=offers&level=-1&locale=es_ar',
      strategy: 'json',
      instructions:
        'Ofertas destacadas de Visa Argentina en formato JSON. En mainSlides se detallan promociones por comercio, porcentaje de descuento y días. Si indica débito, aplica a galicia-visa-debito.',
    },
  ],
};

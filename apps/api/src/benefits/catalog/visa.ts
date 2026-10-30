import type { Provider } from './types';

export const visa: Provider = {
  slug: 'visa',
  name: 'Visa',
  kind: 'network',
  instruments: [],
  appliesTo: { network: 'visa' },
  sources: [
    {
      id: 'visa-offers',
      enabled: true,
      autoPublish: false,
      status: 'active',
      coverage: 'partial',
      note: 'JSON validado en los dry runs del PR #63.',
      url: 'https://www.visa.com.ar/bin/aem/rest?version=2&contentType=offers&level=-1&locale=es_ar',
      strategy: 'json',
      instructions:
        'Ofertas destacadas de Visa Argentina en formato JSON. En mainSlides se detallan promociones por comercio, porcentaje de descuento y días. Expresá la elegibilidad por red y tipo de tarjeta (crédito/débito/prepaga), sin asignar un banco específico salvo que la oferta lo nombre.',
    },
  ],
};

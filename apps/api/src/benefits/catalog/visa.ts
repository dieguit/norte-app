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
      autoPublish: true,
      status: 'active',
      coverage: 'partial',
      note: 'validado 30/10/2026: 2 válidos',
      url: 'https://www.visa.com.ar/bin/aem/rest?version=2&contentType=offers&level=-1&locale=es_ar',
      strategy: 'json',
      instructions:
        'Para pago presencial usá channels.allowed [instore], nunca in_store ni presencial. ' +
        'Ofertas destacadas de Visa Argentina en formato JSON. En mainSlides se detallan promociones por comercio, porcentaje de descuento y días. Expresá la elegibilidad por red y tipo de tarjeta (crédito/débito/prepaga), sin asignar un banco específico salvo que la oferta lo nombre. quotes.field sólo admite eligibility, offer, caps, validity, minimumSpend, channels: nunca title ni merchant. Conservá restricciones a productos o comercios adheridos en requiredActions; si faltan condiciones esenciales, marcá incomplete y unresolved. No confundas la fecha de publicación con vigencia.',
    },
  ],
};

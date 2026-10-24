import type { Provider } from './types';

export const modo: Provider = {
  slug: 'modo',
  name: 'MODO',
  kind: 'wallet',
  instruments: [{ slug: 'modo', label: 'MODO', type: 'membership' }],
  sources: [
    {
      url: 'https://www.modo.com.ar/promos/api/rewards/v2/slots?ids=app-modo-destacados-1',
      strategy: 'json',
      instructions:
        'Promociones destacadas de MODO en formato JSON. Para merchant usá el nombre del comercio específico; si card.validity_place es genérico ("Comercios adheridos" o similar), extraé el comercio real desde benefit.name (ej: si dice "reintegro en Heladeria Smart", el merchant es "Heladeria Smart"). Extraé reintegro (card.benefit), tope (card.cashback_cap), y días (benefit.conditions.schedule.days_of_week). Si participating_bank indica un banco específico, mencionalo en conditions. Usá slug modo.',
    },
    {
      url: 'https://www.modo.com.ar/promos/api/rewards/v2/slots?ids=app-modo-supermercados-1',
      strategy: 'json',
      instructions:
        'Promociones en supermercados de MODO en formato JSON. Para merchant usá el nombre del comercio específico; si card.validity_place es genérico ("Comercios adheridos", "Supermercados"), extraé el comercio real desde benefit.name. Extraé reintegro (card.benefit), tope (card.cashback_cap), y días (benefit.conditions.schedule.days_of_week). Si participating_bank indica un banco específico, mencionalo en conditions. Usá slug modo.',
    },
    {
      url: 'https://www.modo.com.ar/promos/api/rewards/v2/slots?ids=app-modo-otras-promos-corriendo',
      strategy: 'json',
      instructions:
        'Promociones generales de MODO en formato JSON. Para merchant usá el nombre del comercio específico; si card.validity_place es genérico ("Comercios adheridos", "Tiendas online adheridas"), extraé el comercio real desde benefit.name (ej: de "MODO Electro Naldo 20off" el merchant es "Naldo"). Extraé reintegro (card.benefit), tope (card.cashback_cap), y días (benefit.conditions.schedule.days_of_week). Si participating_bank indica un banco específico, mencionalo en conditions. Usá slug modo.',
    },
  ],
};

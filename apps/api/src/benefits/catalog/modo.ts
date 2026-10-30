import type { Provider } from './types';

const extractionRules =
  ' Membership se expresa {membership:{instrumentSlug:"modo"}}. channels.allowed debe incluir "modo" además de instore/online/trip según payment_flow. Si participating_bank nombra bancos catalogados, agregá issuerProviderSlugs; los UUID de requirements.banks NO permiten adivinar emisores. Bancos adheridos sin nombres exige incomplete y unresolved. payment_methods.methods fija types credit/debit; cualquier tarjeta sin restricciones usa types [credit,debit,prepaid], nunca card vacío. pct significa dinero en cuenta, NO tarjeta: conservá el requisito de cuenta/banco como unresolved si falta instrumento apropiado. Para caps usá offer.limits.period_cap (ARS ×100, reset_by promo→campaign, aggregate_by user→person). No uses card_id como upstreamId: preferí benefit.id, estable entre slots. No inventes mínimos: min=0 es explícitamente sin mínimo.';

export const modo: Provider = {
  slug: 'modo',
  name: 'MODO',
  kind: 'wallet',
  appliesTo: { anyCard: true },
  instruments: [
    {
      slug: 'modo',
      label: 'MODO',
      type: 'membership',
      usage: 'wallet_access',
      evidenceUrl: 'https://www.modo.com.ar/promos',
    },
  ],
  sources: [
    {
      id: 'modo-destacados',
      enabled: true,
      autoPublish: false,
      status: 'degraded',
      coverage: 'partial',
      note: 'validado 30/10/2026: 10 válidos, pero exclusiones de adquirente y descripciones contradictorias se pierden; revisión manual hasta cubrirlas.',
      url: 'https://www.modo.com.ar/promos/api/rewards/v2/slots?ids=app-modo-destacados-1',
      strategy: 'json',
      instructions:
        extractionRules +
        'Promociones destacadas de MODO en formato JSON. Para merchant usá el nombre del comercio específico; si card.validity_place es genérico ("Comercios adheridos" o similar), extraé el comercio real desde benefit.name (ej: si dice "reintegro en Heladeria Smart", el merchant es "Heladeria Smart"). Extraé reintegro (card.benefit), tope (card.cashback_cap), y días (benefit.conditions.schedule.days_of_week). Elegibilidad: allOf con { membership: modo } y una tarjeta; si participating_bank nombra bancos, usá card.issuerProviderSlugs con esos proveedores (y types si indica crédito/débito); si no nombra bancos, dejá eligibilityCompleteness incomplete. Pagar con MODO va en channels.allowed.',
    },
    {
      url: 'https://www.modo.com.ar/promos/api/rewards/v2/slots?ids=app-modo-supermercados-1',
      id: 'modo-supermercados',
      enabled: true,
      autoPublish: false,
      status: 'degraded',
      coverage: 'partial',
      note: 'validado 30/10/2026: 9 válidos; mismas exclusiones de adquirente que destacados: revisión manual.',
      strategy: 'json',
      instructions:
        extractionRules +
        ' Bancos catalogados: galicia, macro, santander, bbva, brubank. Comafi y otros no catalogados: no inventes issuerProviderSlugs; conservá nombre en unresolved e incomplete. Acquirers by_blacklist exige conservar exclusión como requiredActions. quotes sólo valores literales cortos, sin reconstruir objetos. ' +
        'Promociones en supermercados de MODO en formato JSON. Para merchant usá el nombre del comercio específico; si card.validity_place es genérico ("Comercios adheridos", "Supermercados"), extraé el comercio real desde benefit.name. Extraé reintegro (card.benefit), tope (card.cashback_cap), y días (benefit.conditions.schedule.days_of_week). Elegibilidad: allOf con { membership: modo } y una tarjeta; si participating_bank nombra bancos, usá card.issuerProviderSlugs con esos proveedores (y types si indica crédito/débito); si no nombra bancos, dejá eligibilityCompleteness incomplete. Pagar con MODO va en channels.allowed.',
    },
    {
      url: 'https://www.modo.com.ar/promos/api/rewards/v2/slots?ids=app-modo-otras-promos-corriendo',
      id: 'modo-otras',
      enabled: true,
      autoPublish: false,
      status: 'degraded',
      coverage: 'partial',
      note: 'validado 30/10/2026: 7 válidos, 2 vencidos y 1 rechazado por falta de evidencia de tope; extracción parcial, publicación manual.',
      strategy: 'json',
      instructions:
        extractionRules +
        ' quotes.field sólo eligibility, offer, caps, validity, minimumSpend, channels. Citá VALORES literales simples como "2026-10-31" o "20% de reintegro", nunca objetos ni pares de fechas reconstruidos. network admite sólo visa/mastercard/amex/cabal, nunca arrays ni master/american_express: traducí esos dos nombres. Si hay varias redes no representables sin pérdida dejá unresolved e incomplete. BBVA exige issuerProviderSlugs [bbva]. schedule manda sobre display_stop_date. Excluí vencidas. ' +
        'Promociones generales de MODO en formato JSON. Para merchant usá el nombre del comercio específico; si card.validity_place es genérico ("Comercios adheridos", "Tiendas online adheridas"), extraé el comercio real desde benefit.name (ej: de "MODO Electro Naldo 20off" el merchant es "Naldo"). Extraé reintegro (card.benefit), tope (card.cashback_cap), y días (benefit.conditions.schedule.days_of_week). Elegibilidad: allOf con { membership: modo } y una tarjeta; si participating_bank nombra bancos, usá card.issuerProviderSlugs con esos proveedores (y types si indica crédito/débito); si no nombra bancos, dejá eligibilityCompleteness incomplete. Pagar con MODO va en channels.allowed.',
    },
  ],
};

import type { Provider } from './types';

export const macro: Provider = {
  slug: 'macro',
  name: 'Banco Macro',
  kind: 'bank',
  instruments: [
    {
      slug: 'macro-selecta-visa-signature',
      label: 'Macro Selecta Visa Signature',
      network: 'visa',
      type: 'credit',
      issuerCountry: 'AR',
      segment: 'selecta',
      productLevel: 'signature',
      evidenceUrl:
        'https://www.macro.com.ar/selecta/tarjetas/tarjetas-de-credito/visa-signature',
    },
    {
      slug: 'macro-selecta-mastercard-black',
      label: 'Macro Selecta Mastercard Black',
      network: 'mastercard',
      type: 'credit',
      issuerCountry: 'AR',
      segment: 'selecta',
      productLevel: 'black',
      evidenceUrl:
        'https://www.macro.com.ar/selecta/tarjetas/tarjetas-de-credito',
    },
    {
      slug: 'macro-selecta-amex-icon',
      label: 'Macro Selecta American Express Icon',
      network: 'amex',
      type: 'credit',
      issuerCountry: 'AR',
      segment: 'selecta',
      productLevel: 'icon',
      evidenceUrl:
        'https://www.macro.com.ar/selecta/tarjetas/tarjetas-de-credito',
    },
  ],
  sources: [
    {
      id: 'macro-beneficios',
      url: 'https://rewards-handler.playdigital.com.ar/slots/?slots=web-banco-hub-promos_corriendo&source=web_bank&banks=6a089c91-a7d3-4199-a578-2132a3733f69&origin=web_bank&slot_info=false&limit=20',
      strategy: 'json',
      instructions:
        'Promociones oficiales MODO de Banco Macro. Pagar con MODO se expresa allOf con { membership: modo } y la tarjeta; channels allowed modo. Conservá las tarjetas y bancos literalmente indicados, no infieras Macro del filtro del endpoint; bancos adheridos sin lista requiere unresolved. Bancos sin slug conocido se conservan en unresolved, no inventes issuerProviderSlugs. Conservá productLevels y segmentos explícitos. Días LMXJVSD: L lunes, M martes, X miércoles, J jueves, V viernes, S sábado, D domingo. Fechas ISO UTC se convierten a Argentina UTC-3 antes de tomar el día. No inventes período/scope de un tope indicado sólo como número: capState unknown, caps [], unresolved con el monto. Sin tope requiere cita caps literal. Cada cita debe ser un substring literal independiente.',
      status: 'degraded',
      enabled: true,
      autoPublish: false,
      coverage: 'partial',
      note: 'validado 30/10/2026: 19 válidos incompletos, 1 vencido; JSON oficial MODO limitado a 20, bancos/topes incompletos y fechas textuales contradictorias; publicación manual.',
    },
    {
      id: 'macro-selecta-beneficios',
      url: 'https://www.macro.com.ar/selecta/beneficios',
      strategy: 'fetch',
      instructions:
        'Beneficios de Macro Selecta. Conservá issuerProviderSlugs macro y segments selecta; Signature/Black/Icon se representan en productLevels sólo si constan. La página es un índice, no inventes tarjetas ni porcentaje, topes o vigencia de los enlaces. Si falta el tipo de tarjeta o producto participante, eligibilityCompleteness incomplete y unresolved. No extraigas títulos de categorías como si fueran promociones concretas.',
      status: 'degraded',
      enabled: true,
      autoPublish: false,
      coverage: 'partial',
      note: 'validado 30/10/2026: 1 válido incompleto; índice sin tarjetas Signature/Black/Icon ni legales; GET promocionesbanca HTTP 500.',
    },
  ],
};

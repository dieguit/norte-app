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
      url: 'https://www.macro.com.ar/beneficios',
      strategy: 'fetch',
      instructions:
        'Beneficios de Banco Macro: extraé comercios, descuentos, topes y tarjetas participantes.',
      status: 'pending_validation',
      enabled: false,
      autoPublish: false,
      coverage: 'partial',
      note: 'HTTP 200; HTML extenso, posible truncamiento; falta validar extracción.',
    },
    {
      id: 'macro-selecta-beneficios',
      url: 'https://www.macro.com.ar/selecta/beneficios',
      strategy: 'fetch',
      instructions:
        'Beneficios de Macro Selecta: identificá segmento, tarjetas, descuentos y condiciones.',
      status: 'pending_validation',
      enabled: false,
      autoPublish: false,
      coverage: 'partial',
      note: 'HTTP 200; HTML extenso, posible truncamiento; falta validar extracción.',
    },
  ],
};

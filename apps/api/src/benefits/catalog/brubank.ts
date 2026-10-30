import type { Provider } from './types';

export const brubank: Provider = {
  slug: 'brubank',
  name: 'Brubank',
  kind: 'bank',
  instruments: [
    {
      slug: 'brubank-visa-debito',
      label: 'Brubank Visa débito',
      network: 'visa',
      type: 'debit',
      issuerCountry: 'AR',
      evidenceUrl: 'https://www.brubank.com/',
    },
    {
      slug: 'brubank-visa-credito',
      label: 'Brubank Visa crédito',
      network: 'visa',
      type: 'credit',
      issuerCountry: 'AR',
      evidenceUrl: 'https://www.brubank.com/tarjeta-de-credito',
    },
  ],
  sources: [
    {
      id: 'brubank-beneficios',
      url: 'https://www.brubank.com/beneficios',
      strategy: 'fetch',
      instructions:
        'Beneficios Brubank: extraé comercios, descuentos y tipo de tarjeta requerido.',
      status: 'pending_validation',
      enabled: false,
      autoPublish: false,
      coverage: 'partial',
      note: 'HTTP 200; HTML extenso, posible truncamiento; falta validar extracción.',
    },
  ],
};

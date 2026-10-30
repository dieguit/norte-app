import type { Provider } from './types';

export const santander: Provider = {
  slug: 'santander',
  name: 'Santander',
  kind: 'bank',
  instruments: [
    {
      slug: 'santander-visa-debito',
      label: 'Santander Visa débito',
      network: 'visa',
      type: 'debit',
      issuerCountry: 'AR',
      evidenceUrl: 'https://www.santander.com.ar/personas/tarjetas',
    },
    {
      slug: 'santander-visa-credito',
      label: 'Santander Visa crédito',
      network: 'visa',
      type: 'credit',
      issuerCountry: 'AR',
      evidenceUrl: 'https://www.santander.com.ar/personas/tarjetas',
    },
    {
      slug: 'santander-sorpresa',
      label: 'Santander Sorpresa',
      type: 'membership',
      usage: 'subscription',
      evidenceUrl: 'https://www.santander.com.ar/personas/beneficios/sorpresa',
    },
  ],
  sources: [
    {
      id: 'santander-beneficios',
      url: 'https://www.santander.com.ar/personas/beneficios',
      strategy: 'fetch',
      instructions:
        'Beneficios Santander: identificá tarjetas, membresías y condiciones de cada promoción.',
      status: 'blocked',
      enabled: false,
      autoPublish: false,
      coverage: 'unknown',
      note: 'Timeout al consultar la página; requiere reintento y validación.',
    },
  ],
};

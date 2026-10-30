import type { Provider } from './types';

export const bbva: Provider = {
  slug: 'bbva',
  name: 'BBVA',
  kind: 'bank',
  instruments: [
    {
      slug: 'bbva-visa-credito',
      label: 'BBVA Visa crédito',
      network: 'visa',
      type: 'credit',
      issuerCountry: 'AR',
      evidenceUrl:
        'https://www.bbva.com.ar/personas/productos/tarjetas/credito/visa.html',
    },
    {
      slug: 'bbva-mastercard-credito',
      label: 'BBVA Mastercard crédito',
      network: 'mastercard',
      type: 'credit',
      issuerCountry: 'AR',
      evidenceUrl:
        'https://www.bbva.com.ar/personas/productos/tarjetas/credito.html',
    },
    {
      slug: 'bbva-visa-debito',
      label: 'BBVA Visa débito',
      network: 'visa',
      type: 'debit',
      issuerCountry: 'AR',
      evidenceUrl:
        'https://www.bbva.com.ar/personas/productos/tarjetas/debito.html',
    },
  ],
  sources: [
    {
      id: 'bbva-beneficios',
      url: 'https://www.bbva.com.ar/beneficios/',
      strategy: 'fetch',
      instructions:
        'Beneficios BBVA: extraé promociones, tarjetas participantes y condiciones.',
      status: 'blocked',
      enabled: false,
      autoPublish: false,
      coverage: 'unknown',
      note: 'HTTP 403; acceso bloqueado.',
    },
  ],
};

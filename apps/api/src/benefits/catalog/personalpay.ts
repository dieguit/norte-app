import type { Provider } from './types';

export const personalpay: Provider = {
  slug: 'personalpay',
  name: 'Personal Pay',
  kind: 'wallet',
  instruments: [
    {
      slug: 'personalpay-visa-prepaga',
      label: 'Personal Pay Visa prepaga',
      network: 'visa',
      type: 'prepaid',
      issuerCountry: 'AR',
      evidenceUrl: 'https://www.personal.com.ar/pay/tarjeta-prepaga-visa',
    },
    {
      slug: 'personalpay-billetera',
      label: 'Personal Pay (billetera)',
      type: 'membership',
      usage: 'wallet_access',
      evidenceUrl: 'https://www.personal.com.ar/pay/beneficios',
    },
  ],
  sources: [
    {
      id: 'personalpay-beneficios',
      url: 'https://www.personal.com.ar/pay/beneficios',
      strategy: 'fetch',
      instructions:
        'Beneficios Personal Pay: identificá medio de pago, nivel de fidelidad, reintegros y topes.',
      status: 'pending_validation',
      enabled: false,
      autoPublish: false,
      coverage: 'partial',
      note: 'HTTP 200; HTML extenso, posible truncamiento; falta validar extracción.',
    },
  ],
};

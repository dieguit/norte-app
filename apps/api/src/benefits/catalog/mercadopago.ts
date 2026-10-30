import type { Provider } from './types';

export const mercadopago: Provider = {
  slug: 'mercadopago',
  name: 'Mercado Pago',
  kind: 'wallet',
  instruments: [
    {
      slug: 'mercadopago-prepaga',
      label: 'Mercado Pago prepaga',
      type: 'prepaid',
      issuerCountry: 'AR',
      evidenceUrl: 'https://www.mercadopago.com.ar/cuenta',
    },
    {
      slug: 'mercadopago-credito',
      label: 'Mercado Pago crédito',
      type: 'credit',
      issuerCountry: 'AR',
      evidenceUrl: 'https://www.mercadopago.com.ar/tarjeta-de-credito',
    },
    {
      slug: 'mercadopago-cuenta',
      label: 'Cuenta Mercado Pago',
      type: 'membership',
      usage: 'wallet_access',
      evidenceUrl: 'https://www.mercadopago.com.ar/cuenta',
    },
  ],
  sources: [
    {
      id: 'mercadopago-aniversarioqr',
      url: 'https://www.mercadopago.com.ar/c/aniversarioqr',
      strategy: 'fetch',
      instructions:
        'Campaña aniversario QR de Mercado Pago; extraé vigencia y condiciones de pago.',
      status: 'blocked',
      enabled: false,
      autoPublish: false,
      coverage: 'campaign_only',
      note: 'HTTP 302 hacia login; campaña específica, no catálogo general.',
    },
  ],
};

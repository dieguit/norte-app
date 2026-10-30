import type { Provider } from './types';

export const naranjax: Provider = {
  slug: 'naranjax',
  name: 'Naranja X',
  kind: 'wallet',
  instruments: [
    {
      slug: 'naranjax-credito',
      label: 'Naranja X crédito',
      type: 'credit',
      issuerCountry: 'AR',
      evidenceUrl: 'https://www.naranjax.com/promociones',
    },
    {
      slug: 'naranjax-visa-credito',
      label: 'Naranja X Visa crédito',
      network: 'visa',
      type: 'credit',
      issuerCountry: 'AR',
      evidenceUrl: 'https://www.naranjax.com/promociones',
    },
    {
      slug: 'naranjax-mastercard-credito',
      label: 'Naranja X Mastercard crédito',
      network: 'mastercard',
      type: 'credit',
      issuerCountry: 'AR',
      evidenceUrl: 'https://www.naranjax.com/promociones',
    },
    {
      slug: 'naranjax-debito',
      label: 'Naranja X débito',
      type: 'debit',
      issuerCountry: 'AR',
      evidenceUrl: 'https://www.naranjax.com/promociones',
    },
    {
      slug: 'naranjax-plan-turbo',
      label: 'Plan Turbo Naranja X',
      type: 'membership',
      usage: 'subscription',
      evidenceUrl: 'https://www.naranjax.com/plan-turbo',
    },
    {
      slug: 'naranjax-plan-epico',
      label: 'Plan Épico Naranja X',
      type: 'membership',
      usage: 'subscription',
      evidenceUrl: 'https://www.naranjax.com/plan-epico',
    },
  ],
  sources: [
    {
      id: 'naranjax-promociones',
      url: 'https://www.naranjax.com/promociones',
      strategy: 'fetch',
      instructions:
        'Promociones Naranja X: distinguí crédito, débito y redes de tarjetas requeridas.',
      status: 'pending_validation',
      enabled: false,
      autoPublish: false,
      coverage: 'partial',
      note: 'HTTP 200; falta validar extracción.',
    },
    {
      id: 'naranjax-plan-turbo',
      url: 'https://www.naranjax.com/plan-turbo',
      strategy: 'fetch',
      instructions:
        'Beneficios del Plan Turbo Naranja X; identificá la suscripción requerida y condiciones.',
      status: 'pending_validation',
      enabled: false,
      autoPublish: false,
      coverage: 'partial',
      note: 'HTTP 200; HTML extenso; falta validar extracción.',
    },
    {
      id: 'naranjax-plan-epico',
      url: 'https://www.naranjax.com/plan-epico',
      strategy: 'fetch',
      instructions:
        'Beneficios del Plan Épico Naranja X; identificá la suscripción requerida y condiciones.',
      status: 'pending_validation',
      enabled: false,
      autoPublish: false,
      coverage: 'partial',
      note: 'HTTP 200; HTML extenso; falta validar extracción.',
    },
  ],
};

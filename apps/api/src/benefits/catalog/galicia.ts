import type { Provider } from './types';

export const galicia: Provider = {
  slug: 'galicia',
  name: 'Banco Galicia',
  kind: 'bank',
  instruments: [
    { slug: 'galicia-visa-credito', label: 'Galicia Visa crédito', network: 'visa', type: 'credit' },
    { slug: 'galicia-mastercard-credito', label: 'Galicia Mastercard crédito', network: 'mastercard', type: 'credit' },
    { slug: 'galicia-visa-debito', label: 'Galicia Visa débito', network: 'visa', type: 'debit' },
    { slug: 'galicia-eminent-visa-credito', label: 'Galicia Éminent Visa crédito', network: 'visa', type: 'credit', tier: 'eminent' },
  ],
  sources: [
    {
      url: 'https://www.galicia.ar/personas/beneficios',
      strategy: 'fetch',
      instructions: 'Página de promociones de Banco Galicia. Cada promo indica comercio, % de descuento o reintegro, días, tope y medios de pago. "Éminent" aplica sólo a clientes Éminent.',
    },
  ],
};

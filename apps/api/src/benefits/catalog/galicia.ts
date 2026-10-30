import type { Provider } from './types';

export const galicia: Provider = {
  slug: 'galicia',
  name: 'Banco Galicia',
  kind: 'bank',
  instruments: [
    {
      slug: 'galicia-visa-credito',
      label: 'Galicia Visa crédito',
      network: 'visa',
      type: 'credit',
      issuerCountry: 'AR',
      evidenceUrl: 'https://www.galicia.ar/personas/tarjetas',
    },
    {
      slug: 'galicia-mastercard-credito',
      label: 'Galicia Mastercard crédito',
      network: 'mastercard',
      type: 'credit',
      issuerCountry: 'AR',
      evidenceUrl: 'https://www.galicia.ar/personas/tarjetas',
    },
    {
      slug: 'galicia-amex-credito',
      label: 'Galicia American Express crédito',
      network: 'amex',
      type: 'credit',
      issuerCountry: 'AR',
      evidenceUrl: 'https://www.galicia.ar/personas/tarjetas',
    },
    {
      slug: 'galicia-visa-debito',
      label: 'Galicia Visa débito',
      network: 'visa',
      type: 'debit',
      issuerCountry: 'AR',
      evidenceUrl: 'https://www.galicia.ar/personas/tarjetas',
    },
    {
      slug: 'galicia-eminent-visa-credito',
      label: 'Galicia Éminent Visa crédito',
      network: 'visa',
      type: 'credit',
      issuerCountry: 'AR',
      tier: 'eminent',
      segment: 'eminent',
      evidenceUrl: 'https://www.galicia.ar/personas/tarjetas',
    },
  ],
  sources: [
    {
      id: 'galicia-promociones',
      enabled: true,
      autoPublish: false,
      status: 'active',
      coverage: 'partial',
      note: 'JSON validado en los dry runs del PR #63.',
      url: 'https://www.galicia.ar/personas/promociones/_jcr_content/root/responsivegrid.model.json',
      strategy: 'json',
      instructions:
        'Página de promociones de Banco Galicia en formato JSON (AEM). Cada promoción incluye comercio, % de ahorro o cuotas sin interés, días y medios de pago. "Éminent" aplica sólo a galicia-eminent-visa-credito.',
    },
  ],
};

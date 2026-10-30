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
      status: 'degraded',
      coverage: 'partial',
      note: 'validado 30/10/2026: 6 válidos en respuesta grabada; 1 rechazado por recurrence inválida. Replays posteriores fallaron o quedaron vacíos; máximos hasta y tipos requieren legales, publicación manual.',
      url: 'https://www.galicia.ar/personas/promociones/_jcr_content/root/responsivegrid.model.json',
      strategy: 'json',
      instructions:
        'Cada beneficio DEBE incluir quote field eligibility con valor literal "Tarjetas Galicia" presente en el contenido; no omitas esa evidencia aunque elegibilidad sea incomplete. Para citas de oferta usá fragmentos literales sin decodificar HTML. ' +
        'Página de promociones de Banco Galicia en formato JSON (AEM). Cada promoción incluye comercio, % de ahorro o cuotas sin interés, días y medios de pago. "Éminent" requiere segmento eminent y emisor galicia; no inventes red Visa si no consta. recurrence siempre campaign. "Hasta X%" no garantiza X%: conservá el máximo en offer pero marcá incomplete y unresolved por porcentaje/segmento pendiente de legales. Tarjetas Galicia sin tipos explícitos: no adivines crédito/débito, usá issuerProviderSlugs galicia y unresolved por tipos pendientes. Topes y fechas ausentes quedan desconocidos. quotes.field sólo eligibility, offer, caps, validity, minimumSpend, channels.',
    },
  ],
};

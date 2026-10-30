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
        'Beneficios Brubank: conservá el plan One/Plus/Ultra en providerFact key plan, junto con tarjeta y emisor brubank cuando consten. No infieras elegibilidad ni tipo de tarjeta de un encabezado lejano. Extraé primero las promociones cuyo texto completo está en la página, como Decathlon y Carrefour. Si sólo consta el plan pero no el medio de pago, incomplete y unresolved del medio de pago (también COTO). capState unknown si no hay evidencia literal de sin tope. Si consta monto pero no período, no inventes período ni uses null: capState unknown, caps [] y unresolved del tope. Incluí siempre citas eligibility y offer; cada cita debe ser un substring literal. No conviertas hasta N cuotas en N cuotas garantizadas: unresolved e incomplete.',
      status: 'degraded',
      enabled: true,
      autoPublish: false,
      coverage: 'partial',
      note: 'validado 30/10/2026: 3 válidos incompletos; resumen por planes, tarjetas y vigencias incompletas; publicación manual.',
    },
  ],
};

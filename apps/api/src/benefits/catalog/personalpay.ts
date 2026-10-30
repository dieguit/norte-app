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
      url: 'https://www.personal.com.ar/pay/_next/data/ppay-build/beneficios.json',
      strategy: 'json',
      instructions:
        'Beneficios Personal Pay. Extraé sólo registros de onDemandProps.initialBenefits con id, paymentMethods y levels; no promociones genéricas de preguntas frecuentes ni navegación. Incluí siempre citas eligibility y offer literales. paymentMethods QR requiere channels allowed qr y acción escanear desde Personal Pay; Visa Personal Pay requiere la prepaga, no crédito. Si QR y Visa son alternativas conservá esa restricción de canales como unresolved cuando el modelo no pueda vincular canal a cada rama. Separá variantes por nivel: levels.code distinto de LVL00 requiere providerFact personalpay key loyaltyLevel con ese código string; LVL00 Todos los usuarios no requiere nivel. Nunca asignes nivel por proximidad. Conservá usageLimit (por ejemplo una vez por semana) en requiredActions/unresolved; no lo confundas con tope monetario. Para topes sin período explícito: capState unknown, caps [], unresolved con monto; period nunca null. No inventes scope account: scope null si no consta. renewal lunes implica period week. dueDate YYYY-MM-DDT00:00:00 es fecha comercial de vencimiento, conservá YYYY-MM-DD. No declares complete si falta medio de pago, condiciones o mapeo canal. No inventes descuento vs reintegro cuando no consta.',
      status: 'degraded',
      enabled: true,
      autoPublish: false,
      coverage: 'partial',
      note: 'validado 30/10/2026: 3 válidos incompletos de 85 registros JSON; niveles LVL01 conservados, canales alternativos requieren revisión; cobertura parcial sin auto-publicar.',
    },
  ],
};

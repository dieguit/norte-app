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
        'Extraé sólo supermercados, servicios/recargas y Viajes del Plan Turbo, nunca Épico/Inicial ni Uber One vencido ni promo relámpago (último sábado no representable). recurrence ongoing. Membresía naranjax-plan-turbo obligatoria. Supermercados: allOf membership y card {issuerProviderSlugs:["naranjax"],types:["credit","debit"]}. Viajes: allOf membership y anyOf crédito NX o débito NX Visa (network visa). No uses issuer naranja-x: slug naranjax. Servicios: sólo membership, pagar con saldo en app; excluí débito automático y resumen de tarjeta. Conservá supermercados adheridos como requiredActions. Tope compartido entre titular/adicionales, scope account. No inventes fechas. Desconocimiento de locales adheridos: incomplete y unresolved. Extraé tres beneficios, sin publicidad genérica de cuenta/Plan Z.',
      status: 'active',
      enabled: true,
      autoPublish: true,
      coverage: 'partial',
      note: 'validado 30/10/2026: 3 válidos; supermercados incomplete por lista de adheridos ausente; excluye relámpago y Uber One vencido.',
    },
    {
      id: 'naranjax-plan-epico',
      url: 'https://www.naranjax.com/plan-epico',
      strategy: 'fetch',
      instructions:
        'Extraé sólo supermercados, servicios/recargas y Viajes del Plan Épico, nunca Turbo/Inicial ni Uber One vencido ni promo relámpago (último sábado no representable). recurrence ongoing. Membresía naranjax-plan-epico obligatoria. Supermercados: allOf membership y card {issuerProviderSlugs:["naranjax"],types:["credit","debit"]}. Viajes: allOf membership y anyOf crédito NX o débito NX Visa (network visa). No uses issuer naranja-x: slug naranjax. Servicios: sólo membership, pagar con saldo en app; excluí débito automático y resumen de tarjeta. Conservá supermercados adheridos como requiredActions. Tope compartido entre titular/adicionales, scope account. No inventes fechas. Desconocimiento de locales adheridos: incomplete y unresolved. Extraé tres beneficios, sin publicidad genérica de cuenta/Plan Z.',
      status: 'active',
      enabled: true,
      autoPublish: true,
      coverage: 'partial',
      note: 'validado 30/10/2026: 3 válidos; supermercados incomplete por lista de adheridos ausente; excluye relámpago y Uber One vencido.',
    },
  ],
};

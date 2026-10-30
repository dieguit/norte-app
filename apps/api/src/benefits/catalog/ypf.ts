import type { Provider } from './types';

export const ypf: Provider = {
  slug: 'ypf',
  name: 'YPF ServiClub',
  kind: 'membership',
  instruments: [
    {
      slug: 'ypf-serviclub',
      label: 'ServiClub',
      type: 'membership',
      usage: 'loyalty',
      evidenceUrl: 'https://www.serviclub.com.ar/',
    },
  ],
  sources: [
    {
      id: 'ypf-serviclub',
      url: 'https://www.serviclub.com.ar/',
      strategy: 'fetch',
      instructions:
        'Beneficios ServiClub: recurrence ongoing para beneficios fijos, eligibility membership ypf-serviclub. Identificá requisitos de fidelidad, canjes y condiciones; no inventes tasas de puntos ni descuentos desde categorías genéricas.',
      status: 'pending_validation',
      enabled: false,
      autoPublish: false,
      coverage: 'partial',
      note: 'validado 30/10/2026: 0 válidos; HTTP 200, sólo descripción genérica de puntos/canjes sin condiciones concretas.',
    },
  ],
};

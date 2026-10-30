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
        'Beneficios ServiClub: identificá requisitos de fidelidad, canjes y condiciones.',
      status: 'pending_validation',
      enabled: false,
      autoPublish: false,
      coverage: 'partial',
      note: 'HTTP 200; contenido débil (degraded), falta validar extracción.',
    },
  ],
};

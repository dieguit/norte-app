import type { Provider } from './types';

export const shell: Provider = {
  slug: 'shell',
  name: 'Shell',
  kind: 'membership',
  instruments: [
    {
      slug: 'shell-box',
      label: 'Shell Box',
      type: 'membership',
      usage: 'wallet_access',
      evidenceUrl: 'https://shellbox.shell.com.ar/',
    },
  ],
  sources: [
    {
      id: 'shell-descuentos',
      url: 'https://www.shell.com.ar/conductores/descuentos-vigentes.html',
      strategy: 'fetch',
      instructions:
        'Descuentos vigentes Shell: identificá uso de Shell Box, medios de pago y condiciones.',
      status: 'pending_validation',
      enabled: false,
      autoPublish: false,
      coverage: 'partial',
      note: 'HTTP 200; contenido débil (degraded); términos en https://shellbox.shell.com.ar/assets/terminos-y-condiciones.pdf; falta validar extracción.',
    },
  ],
};

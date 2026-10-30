import type { Provider } from './types';

export const pedidosya: Provider = {
  slug: 'pedidosya',
  name: 'PedidosYa',
  kind: 'membership',
  instruments: [
    {
      slug: 'pedidosya-plus',
      label: 'PedidosYa Plus',
      type: 'membership',
      usage: 'subscription',
      evidenceUrl: 'https://www.pedidosya.com.ar/about/tyc_plus',
    },
  ],
  sources: [
    {
      id: 'pedidosya-promociones',
      url: 'https://www.pedidosya.com.ar/promociones?expandedList=bank',
      strategy: 'fetch',
      instructions:
        'Promociones bancarias PedidosYa: identificá tarjetas, descuentos y condiciones.',
      status: 'blocked',
      enabled: false,
      autoPublish: false,
      coverage: 'unknown',
      note: '30/10/2026: promociones bloqueadas; GET de /about/tyc_plus devuelve HTTP 403, sin perk manual por falta de términos legibles.',
    },
  ],
};

import { describe, expect, it } from 'vitest'
import { Route as HomeRoute } from './index'
import { Route as FinancesRoute } from './finances/route'
import { Route as GoalsRoute } from './goals/route'

describe('App route metadata', () => {
  it('marks authenticated workspaces as non-indexable with route-specific metadata', () => {
    expect(HomeRoute.options.head?.(undefined as never)).toEqual({
      meta: [
        { title: 'Inicio | Norte' },
        { name: 'description', content: 'Consultá tu hoja de ruta financiera y los próximos pasos hacia tus objetivos.' },
        { name: 'robots', content: 'noindex, nofollow' },
      ],
    })
    expect(FinancesRoute.options.head?.(undefined as never)).toEqual({
      meta: [
        { title: 'Finanzas | Norte' },
        { name: 'description', content: 'Gestioná tus ingresos y gastos para mantener tu planificación financiera actualizada.' },
        { name: 'robots', content: 'noindex, nofollow' },
      ],
    })
    expect(GoalsRoute.options.head?.(undefined as never)).toEqual({
      meta: [
        { title: 'Objetivos | Norte' },
        { name: 'description', content: 'Definí y seguí los objetivos que orientan tu planificación financiera.' },
        { name: 'robots', content: 'noindex, nofollow' },
      ],
    })
  })
})

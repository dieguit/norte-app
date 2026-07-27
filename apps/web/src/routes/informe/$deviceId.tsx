import { createFileRoute } from '@tanstack/react-router'
import { InformePage } from '../../components/informe-page'

export const Route = createFileRoute('/informe/$deviceId')({
  head: () => ({
    meta: [
      { title: 'Informe inicial de claridad | Norte' },
      { name: 'description', content: 'Tu informe inicial de claridad financiera de Norte.' },
      { name: 'theme-color', content: '#3a6e54' },
    ],
  }),
  component: InformePage,
})

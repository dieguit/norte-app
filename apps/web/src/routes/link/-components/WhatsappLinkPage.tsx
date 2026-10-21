import type { WhatsappLinkResult } from '@/features/whatsapp/whatsapp-link.functions'

const messages = {
  linked: '✅ Listo, tu WhatsApp quedó vinculado. Ya podés volver al chat con Norte.',
  invalid: 'Este link no es válido. Escribile de nuevo a Norte por WhatsApp para recibir uno nuevo.',
  expired: 'Este link venció. Escribile de nuevo a Norte por WhatsApp para recibir uno nuevo.',
  conflict: 'Tu cuenta ya tiene otro número de WhatsApp vinculado.',
} as const

export function WhatsappLinkPage({ result }: { result: WhatsappLinkResult }) {
  return (
    <main id="main" className="page-wrap py-8 sm:py-12">
      <p>{messages[result]}</p>
    </main>
  )
}

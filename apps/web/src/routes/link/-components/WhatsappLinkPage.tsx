import type { WhatsappLinkResult } from '@/features/whatsapp/whatsapp-link.functions'
import { Card, CardContent } from '@/components/ui/card'

const messages = {
  linked: '✅ Listo, tu WhatsApp quedó vinculado. Ya podés volver al chat con Norte.',
  invalid: 'Este link no es válido. Escribile de nuevo a Norte por WhatsApp para recibir uno nuevo.',
  expired: 'Este link venció. Escribile de nuevo a Norte por WhatsApp para recibir uno nuevo.',
  conflict: 'Tu cuenta ya tiene otro número de WhatsApp vinculado.',
} as const

export function WhatsappLinkPage({ result }: { result: WhatsappLinkResult }) {
  return (
    <main id="main" className="flex min-h-dvh items-center justify-center sm:p-8">
      <Card className="min-h-dvh w-full justify-center rounded-none bg-card/70 backdrop-blur-md sm:min-h-[500px] sm:w-[70%] sm:rounded-xl">
        <CardContent className="text-center text-lg">{messages[result]}</CardContent>
      </Card>
    </main>
  )
}

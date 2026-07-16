import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { loginAdmin } from '../admin/auth'

export function AdminPage({ authenticated }: { authenticated: boolean }) {
  const [link, setLink] = useState<string | null>(null)
  const [copyMessage, setCopyMessage] = useState<string | null>(null)

  // Login form state
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  function createInvitation() {
    const id = crypto.randomUUID()
    setLink(`${window.location.origin}/onboarding?invitado=${id}`)
    setCopyMessage(null)
  }

  async function copyInvitation() {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopyMessage('Enlace copiado.')
    } catch {
      setCopyMessage('No se pudo copiar el enlace. Podés copiarlo manualmente.')
    }
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const res = await loginAdmin({ data: { username, password } })
      if (res.ok) {
        window.location.reload()
      } else {
        setError('Usuario o contraseña incorrectos.')
      }
    } catch (err) {
      setError('Usuario o contraseña incorrectos.')
    }
  }

  if (!authenticated) {
    return (
      <div className="demo-page demo-center">
        <div className="demo-panel w-full max-w-md rise-in">
          <div className="mb-6 text-center">
            <h1 className="demo-title text-3xl font-bold tracking-tight">Administración</h1>
            <p className="demo-muted mt-2 text-sm">Ingresá tus credenciales para acceder</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label htmlFor="username-input" className="block text-sm font-medium text-[var(--sea-ink-soft)] mb-1">
                Usuario
              </label>
              <Input
                id="username-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full"
              />
            </div>

            <div>
              <label htmlFor="password-input" className="block text-sm font-medium text-[var(--sea-ink-soft)] mb-1">
                Contraseña
              </label>
              <Input
                id="password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full"
              />
            </div>

            {error && (
              <p className="text-sm font-semibold text-[var(--error)] bg-[var(--error-surface)] border border-[var(--error-border)] rounded-lg p-2.5" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full justify-center">
              Ingresar
            </Button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="demo-page demo-center">
      <div className="demo-panel w-full max-w-2xl rise-in">
        <div className="mb-6">
          <h1 className="demo-title text-3xl font-bold tracking-tight">Administración</h1>
          <p className="demo-muted mt-2 text-sm">Gestionar invitaciones y respuestas</p>
        </div>

        <Tabs defaultValue="invitar" className="w-full">
          <TabsList aria-label="Administración" className="mb-6">
            <TabsTrigger value="invitar">Invitar</TabsTrigger>
            <TabsTrigger value="resultados">Resultados</TabsTrigger>
          </TabsList>
          
          <TabsContent value="invitar" className="space-y-4 outline-none">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] p-6 space-y-4">
              <h2 className="text-lg font-bold text-[var(--sea-ink)]">Crear nuevo enlace de invitación</h2>
              <p className="text-sm text-[var(--sea-ink-soft)]">
                Generá un enlace único para compartir con los nuevos invitados del sistema.
              </p>
              
              <div className="flex flex-col gap-3">
                <Button type="button" onClick={createInvitation} className="w-fit">
                  Crear invitación
                </Button>

                {link && (
                  <div className="space-y-2 mt-2">
                    <label htmlFor="invitation-link" className="block text-xs font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wider">
                      Enlace de invitación
                    </label>
                    <div className="flex gap-2">
                      <Input
                        id="invitation-link"
                        aria-label="Enlace de invitación"
                        readOnly
                        value={link}
                        className="flex-1"
                      />
                      <Button type="button" onClick={copyInvitation} variant="outline">
                        Copiar enlace
                      </Button>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-1">
                      <a
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-[var(--lagoon-deep)] hover:underline"
                      >
                        Abrir enlace
                      </a>
                      {copyMessage && (
                        <p role="status" className="font-medium text-[var(--lagoon-deep)]">
                          {copyMessage}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="resultados" className="outline-none">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] p-6 text-center">
              <p className="text-base font-medium text-[var(--sea-ink-soft)]">
                Próximamente vas a poder ver las respuestas de cada invitado.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { AdminPage } from './admin-page'
import { getAdminResultDetails } from '../admin/server'
import { onboardingSteps, type OnboardingField, type RepeatedItemField } from '../onboarding/definition'

const numberFormatter = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })

function isBlank(value: unknown) {
  return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)
}

function formatValue(field: OnboardingField | RepeatedItemField, value: unknown) {
  if (isBlank(value)) return '-'
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (field.type === 'number' || field.type === 'currency') {
    const number = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(number) ? numberFormatter.format(number) : String(value)
  }
  return Array.isArray(value) ? value.join(', ') : String(value)
}

function AnswerValue({
  field,
  value,
  files,
}: {
  field: OnboardingField
  value: unknown
  files: Record<string, string>
}) {
  if (field.type === 'upload') {
    const fileUrl = files[field.id]
    if (!fileUrl) {
      return <span>-</span>
    }
    return (
      <a
        href={fileUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center text-sm font-semibold text-[var(--lagoon-deep)] hover:underline"
      >
        Descargar {field.label}
      </a>
    )
  }

  if (field.type === 'repeated') {
    if (isBlank(value) || !Array.isArray(value) || value.length === 0) {
      return <span>-</span>
    }
    const itemFields = field.itemFields || []
    const titleKey = (field.itemTitleKey as string) ?? 'concepto'

    return (
      <div className="space-y-3 mt-1">
        {value.map((item: any, idx: number) => {
          const itemTitle = item && typeof item === 'object' ? item[titleKey] : undefined
          return (
            <div
              key={idx}
              className="rounded-lg border border-[var(--line)] bg-[var(--chip-bg)] p-3 space-y-2"
            >
              {itemTitle && (
                <div className="font-semibold text-sm text-[var(--sea-ink)]">
                  {String(itemTitle)}
                </div>
              )}
              {itemFields.length > 0 && (
                <div className="space-y-1 text-sm">
                  {itemFields
                    .filter((itemField) => itemField.key !== titleKey || !itemTitle)
                    .map((itemField) => {
                      const val = item && typeof item === 'object' ? item[itemField.key] : undefined
                      return (
                        <div key={String(itemField.key)} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <span className="text-[var(--sea-ink-soft)] font-medium">
                            {itemField.label}:
                          </span>
                          <span className="font-semibold text-[var(--sea-ink)]">
                            {formatValue(itemField, val)}
                          </span>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return <span>{formatValue(field, value)}</span>
}

export function AdminResultDetailsPage({
  authenticated,
  deviceId,
}: {
  authenticated: boolean
  deviceId: string
}) {
  const [result, setResult] = useState<Awaited<ReturnType<typeof getAdminResultDetails>>>()
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!authenticated) return
    setResult(undefined)
    setError(false)
    getAdminResultDetails({ data: { deviceId } })
      .then(setResult)
      .catch(() => setError(true))
  }, [authenticated, deviceId])

  if (!authenticated) {
    return <AdminPage authenticated={false} />
  }

  return (
    <div className="demo-page demo-center">
      <div className="demo-panel w-full max-w-[1200px] rise-in">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="demo-title text-3xl font-bold tracking-tight">Resultados</h1>
            <p className="demo-muted mt-1 text-sm font-mono">{deviceId}</p>
          </div>
          <a
            href="/admin"
            className="inline-flex items-center text-sm font-semibold text-[var(--lagoon-deep)] hover:underline"
          >
            Volver a administración
          </a>
        </div>

        {error ? (
          <div className="rounded-xl border border-[var(--error-border)] bg-[var(--error-surface)] p-6 text-center">
            <p className="text-base font-semibold text-[var(--error)]">
              Error al cargar los resultados.
            </p>
          </div>
        ) : result === undefined ? (
          <div className="rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] p-6 text-center">
            <p className="text-base font-medium text-[var(--sea-ink-soft)] animate-pulse">
              Cargando resultados...
            </p>
          </div>
        ) : result === null ? (
          <div className="rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] p-6 text-center">
            <p className="text-base font-medium text-[var(--sea-ink-soft)]">
              No se encontraron resultados para este dispositivo.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {onboardingSteps.map((step) => {
              const answers = result.draft?.answers || {}
              const files = result.files || {}
              return (
                <div
                  key={step.id}
                  className="rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] p-6 space-y-4"
                >
                  <h2 className="text-xl font-bold text-[var(--sea-ink)]">
                    {step.title}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {step.fields.map((field) => {
                      const rawValue =
                        answers[field.id] ??
                        (field.id === 'ingresos_extra' ? answers['extra_ingresos'] : undefined)
                      return (
                        <div
                          key={field.id}
                          className="rounded-lg border border-[var(--line)] bg-[var(--card-bg,white)] dark:bg-[color-mix(in_oklab,var(--chip-bg)_95%,white_5%)] p-4 space-y-1"
                        >
                          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)]">
                            {field.label}
                          </div>
                          <div className="text-sm font-medium text-[var(--sea-ink)]">
                            <AnswerValue field={field} value={rawValue} files={files} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

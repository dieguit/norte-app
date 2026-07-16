import React, { useRef, useState } from 'react'
import { usePostHog } from '@posthog/react'
import { getFileValidationError } from '../onboarding/uploads'
import { Button } from './ui/button'
import { CheckCircle2, AlertCircle, Loader2, Upload } from 'lucide-react'

export type OnboardingUploadProps = {
  fieldId: string
  value: string | undefined
  onUpload: (file: File, setProgress: (progress: number) => void) => Promise<void>
  disabled?: boolean
}

export function putFile(
  url: string,
  file: File,
  setProgress: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', file.type)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100)
        setProgress(percent)
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`))
      }
    }

    xhr.onerror = () => reject(new Error('Upload network error'))
    xhr.onabort = () => reject(new Error('Upload aborted'))
    xhr.send(file)
  })
}

export default function OnboardingUpload({
  fieldId,
  value,
  onUpload,
  disabled = false,
}: OnboardingUploadProps) {
  const posthog = usePostHog()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)

  const isUploading = progress !== null

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)
    const validationError = getFileValidationError(file)
    if (validationError) {
      setError(validationError)
      // Reset input value so selection triggers change again
      event.target.value = ''
      return
    }

    setFileName(file.name)
    setProgress(0)

    try {
      await onUpload(file, (p) => {
        setProgress(p)
      })
      setProgress(null)
      posthog?.capture('file_upload_completed', {
        field_id: fieldId,
        file_type: file.type,
      })
    } catch (err) {
      console.error('Error uploading file:', err)
      posthog?.captureException(err)
      posthog?.capture('file_upload_failed', {
        field_id: fieldId,
        file_type: file.type,
      })
      setError('Error al subir el archivo. Intentá de nuevo.')
      setFileName(null)
      setProgress(null)
      event.target.value = ''
    }
  }

  const triggerSelect = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click()
    }
  }

  // Determine what text to show for the file name/status
  const displayLabel = fileName || (value ? 'Archivo subido' : null)

  return (
    <div className="w-full space-y-3">
      {/* Visually hidden file input */}
      <input
        ref={fileInputRef}
        id={fieldId}
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
        className="sr-only"
        data-testid="onboarding-file-input"
      />

      {isUploading ? (
        <div className="flex h-auto w-full items-center justify-center gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--foam)] px-5 py-4 text-sm font-semibold text-[var(--sea-ink)]">
          <Loader2 className="size-4 animate-spin text-[var(--lagoon-deep)]" />
          <span>Subiendo... {progress}%</span>
        </div>
      ) : displayLabel ? (
        <div className="flex h-auto w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--foam)] px-5 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--sea-ink)]">
            <CheckCircle2 className="size-5 text-[var(--palm)]" />
            <span className="truncate max-w-[200px] sm:max-w-xs">{displayLabel}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={triggerSelect}
            className="h-auto rounded-lg px-3 py-1.5 text-xs font-bold text-[var(--sea-ink)] border-[var(--line)] hover:bg-[var(--surface-strong)] active:scale-[0.98]"
          >
            Reemplazar
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          disabled={disabled}
          onClick={triggerSelect}
          className="h-auto w-full rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] text-[var(--sea-ink)] px-5 py-4 font-semibold flex items-center justify-center gap-2 hover:bg-[var(--foam)] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload className="size-4 text-[var(--sea-ink-soft)]" />
          <span>Subir foto del resumen (foto o PDF)</span>
        </Button>
      )}

      {error && (
        <div
          className="flex items-center gap-2 text-xs font-semibold text-[var(--error)]"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle className="size-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

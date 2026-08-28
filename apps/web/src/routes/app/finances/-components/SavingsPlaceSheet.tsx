import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from '@tanstack/react-router'
import { Button } from '../../../../components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '../../../../components/ui/field'
import { Input } from '../../../../components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../../../../components/ui/sheet'
import {
  createSavingsPlace,
  renameSavingsPlace,
  deleteSavingsPlace,
} from '../../../../features/savings-places/savings-places.functions'
import type { SavingsPlaceSummary } from '../../../../features/savings-places/savings-places'

interface SavingsPlaceSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  place?: SavingsPlaceSummary
}

export function SavingsPlaceSheet({
  open,
  onOpenChange,
  place,
}: SavingsPlaceSheetProps) {
  const router = useRouter()
  const isEdit = Boolean(place)

  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(place?.name ?? '')
    setError(null)
  }, [open, place?.id, place?.name])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isPending) return
    onOpenChange(nextOpen)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Escribí un nombre para el lugar.')
      return
    }

    setIsPending(true)
    setError(null)

    try {
      if (place) {
        await renameSavingsPlace({
          data: { placeId: place.id, name: trimmedName },
        })
        toast.success('Lugar renombrado.')
      } else {
        await createSavingsPlace({
          data: { name: trimmedName },
        })
        toast.success('Lugar creado.')
      }
      await router.invalidate()
      onOpenChange(false)
      setName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar.')
    } finally {
      setIsPending(false)
    }
  }

  const handleDelete = async () => {
    if (!place || !window.confirm('¿Eliminar este lugar?')) return

    setIsPending(true)
    setError(null)

    try {
      await deleteSavingsPlace({
        data: { placeId: place.id },
      })
      toast.success('Lugar eliminado.')
      await router.invalidate()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 p-0 data-[side=right]:w-full data-[side=right]:max-w-none data-[side=right]:sm:w-[450px] data-[side=right]:sm:max-w-[450px]"
      >
        <SheetHeader className="border-b border-[var(--line)] px-6 py-5">
          <SheetTitle className="font-serif text-2xl font-bold text-[var(--sea-ink)]">
            {isEdit ? 'Editar lugar' : 'Nuevo lugar'}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Modificá el nombre del lugar de ahorro.'
              : 'Creá un lugar para empezar a registrar dónde guardás tu dinero.'}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col gap-5 overflow-y-auto p-6"
        >
          <FieldGroup>
            <Field data-invalid={!!error}>
              <FieldLabel htmlFor="place-name">Nombre del lugar</FieldLabel>
              <Input
                id="place-name"
                aria-invalid={!!error}
                aria-describedby={error ? 'place-name-error' : undefined}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Banco Nación"
                disabled={isPending}
              />
              {error && <FieldError id="place-name-error">{error}</FieldError>}
            </Field>
          </FieldGroup>

          <div className="mt-auto flex gap-3 pt-4">
            {isEdit && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending}
              >
                Eliminar
              </Button>
            )}
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

import { useEffect, useRef, useState } from 'react'
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

function refreshAfterMutation(router: ReturnType<typeof useRouter>, errorMessage: string) {
  void router.invalidate().catch(() => toast.error(errorMessage))
}

async function savePlace({ place, name, onSuccess }: { place?: SavingsPlaceSummary; name: string; onSuccess: () => void }) {
  if (place) {
    await renameSavingsPlace({ data: { placeId: place.id, name } })
    toast.success('Lugar renombrado.')
  } else {
    await createSavingsPlace({ data: { name } })
    toast.success('Lugar creado.')
  }
  onSuccess()
}

async function deletePlace(placeId: string, onSuccess: () => void) {
  await deleteSavingsPlace({ data: { placeId } })
  toast.success('Lugar eliminado.')
  onSuccess()
}

function getSavingsPlaceNameError(name: string) {
  return name.trim() ? null : 'Escribí un nombre para el lugar.'
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
  const mutationCompleted = useRef(false)

  useEffect(() => {
    if (!open) return
    setName(place?.name ?? '')
    setError(null)
    mutationCompleted.current = false
  }, [open, place?.id, place?.name])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isPending) return
    onOpenChange(nextOpen)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (mutationCompleted.current) return
    const nameError = getSavingsPlaceNameError(trimmedName)
    if (nameError) {
      setError(nameError)
      return
    }

    setIsPending(true)
    setError(null)

    void savePlace({
        place,
        name: trimmedName,
        onSuccess: () => {
          mutationCompleted.current = true
          onOpenChange(false)
          setName('')
          refreshAfterMutation(router, 'El lugar se guardó, pero no pudimos actualizar la vista.')
        },
      }).catch((err) => setError(err instanceof Error ? err.message : 'Error al guardar.'))
        .finally(() => setIsPending(false))
  }

  const handleDelete = async () => {
    if (!place || mutationCompleted.current) return
    if (!window.confirm('¿Eliminar este lugar?')) return

    setIsPending(true)
    setError(null)

    void deletePlace(place.id, () => {
      mutationCompleted.current = true
      onOpenChange(false)
      refreshAfterMutation(router, 'El lugar se eliminó, pero no pudimos actualizar la vista.')
    }).catch((err) => setError(err instanceof Error ? err.message : 'Error al eliminar.'))
      .finally(() => setIsPending(false))
  }

  return <SavingsPlaceSheetView
    open={open}
    onOpenChange={handleOpenChange}
    isEdit={isEdit}
    name={name}
    error={error}
    isPending={isPending}
    onSubmit={handleSubmit}
    onNameChange={setName}
    onDelete={handleDelete}
  />
}

function SavingsPlaceSheetView({
  open,
  onOpenChange,
  isEdit,
  name,
  error,
  isPending,
  onSubmit,
  onNameChange,
  onDelete,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  isEdit: boolean
  name: string
  error: string | null
  isPending: boolean
  onSubmit: (event: React.FormEvent) => void
  onNameChange: (name: string) => void
  onDelete: () => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 p-0 data-[side=right]:w-full data-[side=right]:max-w-none data-[side=right]:sm:w-[450px] data-[side=right]:sm:max-w-[450px]"
      >
        <SavingsPlaceSheetHeader isEdit={isEdit} />

        <form
          onSubmit={onSubmit}
          className="flex flex-1 flex-col gap-5 overflow-y-auto p-6"
        >
          <SavingsPlaceSheetFields name={name} error={error} isPending={isPending} onNameChange={onNameChange} />
          <SavingsPlaceSheetActions isEdit={isEdit} isPending={isPending} onDelete={onDelete} />
        </form>
      </SheetContent>
    </Sheet>
  )
}

function SavingsPlaceSheetHeader({ isEdit }: { isEdit: boolean }) {
  return <SheetHeader className="border-b border-[var(--line)] px-6 py-5"><SheetTitle className="font-serif text-2xl font-bold text-[var(--sea-ink)]">{isEdit ? 'Editar lugar' : 'Nuevo lugar'}</SheetTitle><SheetDescription>{isEdit ? 'Modificá el nombre del lugar de ahorro.' : 'Creá un lugar para empezar a registrar dónde guardás tu dinero.'}</SheetDescription></SheetHeader>
}

function SavingsPlaceSheetFields({ name, error, isPending, onNameChange }: { name: string; error: string | null; isPending: boolean; onNameChange: (name: string) => void }) {
  return <FieldGroup><Field data-invalid={!!error}><FieldLabel htmlFor="place-name">Nombre del lugar</FieldLabel><Input id="place-name" aria-invalid={!!error} aria-describedby={error ? 'place-name-error' : undefined} value={name} onChange={(e) => onNameChange(e.target.value)} placeholder="Ej: Banco Nación" disabled={isPending} />{error && <FieldError id="place-name-error">{error}</FieldError>}</Field></FieldGroup>
}

function SavingsPlaceSheetActions({ isEdit, isPending, onDelete }: { isEdit: boolean; isPending: boolean; onDelete: () => void }) {
  return <div className="mt-auto flex gap-3 pt-4">{isEdit && <Button type="button" variant="destructive" onClick={onDelete} disabled={isPending}>Eliminar</Button>}<Button type="submit" disabled={isPending} className="flex-1">{isPending ? 'Guardando...' : 'Guardar'}</Button></div>
}

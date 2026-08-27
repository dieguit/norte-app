import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from '@tanstack/react-router'
import { Button } from '../../../../components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '../../../../components/ui/field'
import { Input } from '../../../../components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
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
  placeId?: string | null
  places?: SavingsPlaceSummary[]
}

export function SavingsPlaceSheet({
  open,
  onOpenChange,
  placeId,
  places = [],
}: SavingsPlaceSheetProps) {
  const router = useRouter()
  const isEdit = Boolean(placeId)
  const existingPlace = places.find((p) => p.id === placeId)

  const [name, setName] = useState(existingPlace?.name ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsPending(true)
    setError(null)

    try {
      if (isEdit && placeId) {
        await renameSavingsPlace({
          data: { placeId, name: name.trim() },
        })
        toast.success('Lugar renombrado.')
      } else {
        await createSavingsPlace({
          data: { name: name.trim() },
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
    if (!placeId) return

    setIsPending(true)
    setError(null)

    try {
      await deleteSavingsPlace({
        data: { placeId },
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Editar lugar' : 'Nuevo lugar'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Modificá el nombre del lugar de ahorro.'
              : 'Creá un lugar para empezar a registrar dónde guardás tu dinero.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="place-name">Nombre del lugar</FieldLabel>
              <Input
                id="place-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Banco Nación"
                disabled={isPending}
              />
            </Field>
            {error && <FieldError>{error}</FieldError>}
          </FieldGroup>

          <SheetFooter>
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
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isEdit ? 'Guardar' : 'Crear'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
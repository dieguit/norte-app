import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export interface SavingsPlacePickerProps {
  places: Array<{ id: string; name: string }>
  value: { kind: 'existing'; placeId: string } | { kind: 'new'; name: string } | null
  onChange: (
    value: { kind: 'existing'; placeId: string } | { kind: 'new'; name: string } | null,
  ) => void
  className?: string
  disabled?: boolean
}

export function SavingsPlacePicker({
  places,
  value,
  onChange,
  className,
  disabled,
}: SavingsPlacePickerProps) {
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newName, setNewName] = useState('')

  if (isAddingNew) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nombre del lugar"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newName.trim()) {
              onChange({ kind: 'new', name: newName.trim() })
              setIsAddingNew(false)
              setNewName('')
            } else if (e.key === 'Escape') {
              setIsAddingNew(false)
              setNewName('')
            }
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            if (newName.trim()) {
              onChange({ kind: 'new', name: newName.trim() })
              setIsAddingNew(false)
              setNewName('')
            }
          }}
          disabled={disabled || !newName.trim()}
        >
          Guardar
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsAddingNew(false)
            setNewName('')
          }}
        >
          Cancelar
        </Button>
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Select
        value={value?.kind === 'existing' ? value.placeId : undefined}
        onValueChange={(val) => {
          if (val === '__new__') {
            setIsAddingNew(true)
          } else if (val) {
            onChange({ kind: 'existing', placeId: val })
          }
        }}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Seleccionar lugar" />
        </SelectTrigger>
        <SelectContent>
          {places.map((place) => (
            <SelectItem key={place.id} value={place.id}>
              {place.name}
            </SelectItem>
          ))}
          <SelectItem value="__new__">+ Nuevo lugar</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
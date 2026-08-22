import { useId, useState } from 'react'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '../../../../components/ui/popover'
import { FIXED_INCOME_SOURCES } from '../../../../features/financial/incomes'
import type { IncomeDraft } from '../../../../features/financial/incomes.schema'

export function IncomeSourcePicker({
  sources,
  value,
  onChange,
}: {
  sources: Array<{ id: string; name: string }>
  value: IncomeDraft['source']
  onChange: (source: IncomeDraft['source']) => void
}) {
  const [open, setOpen] = useState(false)
  const triggerId = useId()
  const options = [
    ...Object.entries(FIXED_INCOME_SOURCES).map(([kind, label]) => ({ kind, label })),
    ...sources.map((source) => ({ kind: 'custom', label: source.name, sourceId: source.id })),
  ]
  const [adding, setAdding] = useState(false)
  const selectedLabel = value.kind === 'custom'
    ? ('name' in value ? value.name : sources.find((source) => source.id === value.sourceId)?.name)
    : FIXED_INCOME_SOURCES[value.kind]

  return (
    <div className="grid gap-2">
      <label htmlFor={triggerId} className="text-sm font-medium text-[var(--sea-ink)]">¿De dónde viene este ingreso?</label>
      <Popover open={open} onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) setAdding(false)
      }}>
        <PopoverTrigger render={<Button id={triggerId} type="button" variant="outline" className="justify-between" />}>
          {selectedLabel || 'Seleccionar fuente'}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[var(--anchor-width)]">
          <div className="max-h-52 overflow-y-auto">
            <button
              type="button"
              className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-[var(--lagoon-deep)] hover:bg-[var(--link-bg-hover)]"
              onClick={() => {
                setAdding(true)
              }}
            >
              + Agregar nuevo
            </button>
            {adding && (
              <Input
                aria-label="Nueva fuente"
                autoFocus
                onChange={(event) => onChange({ kind: 'custom', name: event.target.value })}
              />
            )}
            {options.map((option) => (
              <button
                key={`${option.kind}-${option.label}`}
                type="button"
                className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--link-bg-hover)]"
                onClick={() => {
                  onChange(option.kind === 'custom' && 'sourceId' in option
                    ? { kind: 'custom', sourceId: option.sourceId }
                    : option.kind === 'custom'
                      ? { kind: 'custom', name: option.label }
                      : { kind: option.kind as keyof typeof FIXED_INCOME_SOURCES })
                  setAdding(false)
                  setOpen(false)
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

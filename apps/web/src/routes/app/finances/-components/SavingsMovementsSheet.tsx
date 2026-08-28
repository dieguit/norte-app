import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../../../../components/ui/sheet'
import type { SavingsMovement } from '../../../../features/savings-places/savings-places'
import { formatMoney } from '../../../../lib/format'
import { createMoney } from '../../../../lib/money'

interface SavingsMovementsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  placeName: string
  movements: SavingsMovement[]
}

export function SavingsMovementsSheet({
  open,
  onOpenChange,
  placeName,
  movements,
}: SavingsMovementsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 p-0 data-[side=right]:w-full data-[side=right]:max-w-none data-[side=right]:sm:w-[450px] data-[side=right]:sm:max-w-[450px]"
      >
        <SheetHeader className="border-b border-[var(--line)] px-6 py-5">
          <SheetTitle className="font-serif text-2xl font-bold text-[var(--sea-ink)]">
            Movimientos de {placeName}
          </SheetTitle>
          <SheetDescription>
            Consultá los aportes y transferencias recibidas en este lugar.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
          <section
            aria-label={`Entradas de ${placeName}`}
            className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)]"
          >
            {movements.length === 0 ? (
              <p className="p-8 text-center text-sm text-[var(--sea-ink-soft)]">
                No hay movimientos todavía.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--line)]">
                {movements.map((movement) => (
                  <li
                    key={movement.id}
                    className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-5"
                  >
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="text-sm font-medium text-[var(--sea-ink)]">
                        {movement.kind === 'contribution'
                          ? 'Ahorro registrado'
                          : `Transferencia desde ${movement.fromPlaceName}`}
                      </span>
                      <span className="text-xs text-[var(--sea-ink-soft)]">
                        {new Date(movement.createdAt).toLocaleDateString('es-AR')}
                      </span>
                    </div>
                    <span className="shrink-0 font-medium tabular-nums text-[var(--sea-ink)] sm:text-right">
                      {formatMoney(createMoney(movement.amount, movement.currency))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}

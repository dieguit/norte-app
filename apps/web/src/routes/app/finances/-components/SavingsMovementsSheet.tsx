import { Sheet } from '../../../../components/ui/sheet'
import { SidePanelContent, SidePanelHeader } from '../../../../components/norte/SidePanel'
import type { SavingsMovement } from '../../../../features/savings-places/savings-places'
import { Money } from '../../../../components/norte/Money'
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
      <SidePanelContent>
        <SidePanelHeader
          title={`Movimientos de ${placeName}`}
          description="Consultá los aportes, transferencias recibidas y objetivos completados en este lugar."
        />

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
          <section
            aria-label={`Movimientos de ${placeName}`}
            className="overflow-hidden rounded-lg border border-border bg-background"
          >
            {movements.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No hay movimientos todavía.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {movements.map((movement) => (
                  <li
                    key={movement.id}
                    className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-5"
                  >
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="text-sm font-medium text-foreground">
                        {movement.kind === 'contribution'
                          ? 'Ahorro registrado'
                          : movement.kind === 'completion'
                            ? `Objetivo completado: ${movement.goalName}`
                          : `Transferencia desde ${movement.fromPlaceName}`}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(movement.createdAt).toLocaleDateString('es-AR')}
                      </span>
                    </div>
                    <Money
                      value={createMoney(movement.kind === 'completion' ? `-${movement.amount.replace(/^-/, '')}` : movement.amount, movement.currency)}
                      className="shrink-0 sm:justify-end"
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </SidePanelContent>
    </Sheet>
  )
}

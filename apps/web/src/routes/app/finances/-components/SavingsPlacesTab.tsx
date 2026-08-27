import { useState } from 'react'
import { Button } from '../../../../components/ui/button'
import { formatMoney } from '../../../../lib/format'
import { createMoney } from '../../../../lib/money'
import type { SavingsPlacesWorkspace } from '../../../../features/savings-places/savings-places'
import { SavingsPlaceSheet } from './SavingsPlaceSheet'
import { SavingsTransferSheet } from './SavingsTransferSheet'

interface SavingsPlacesTabProps {
  workspace: SavingsPlacesWorkspace
}

export function SavingsPlacesTab({ workspace }: SavingsPlacesTabProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null)
  const [isTransferOpen, setIsTransferOpen] = useState(false)

  if (workspace.places.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <p className="text-lg font-medium text-[var(--sea-ink)]">
          Todavía no tenés lugares de ahorro.
        </p>
        <p className="text-sm text-[var(--sea-ink-soft)]">
          Creá un lugar para empezar a registrar dónde guardás tu dinero.
        </p>
        <Button onClick={() => setIsCreateOpen(true)}>Nuevo lugar</Button>
        <SavingsPlaceSheet
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
        <div>
          <h2 className="font-serif text-xl font-bold tracking-tight text-[var(--sea-ink)] sm:text-4xl">
            Tus ahorros
          </h2>
        </div>
        <div className="flex gap-2 sm:ml-auto">
          <Button variant="outline" onClick={() => setIsTransferOpen(true)}>
            Transferir entre lugares
          </Button>
          <Button onClick={() => setIsCreateOpen(true)}>Nuevo lugar</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {workspace.places.map((place) => (
          <button
            key={place.id}
            type="button"
            onClick={() => setEditingPlaceId(place.id)}
            className="flex flex-col gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 text-left transition-colors hover:border-[var(--sea)]"
          >
            <h3 className="font-serif text-lg font-bold text-[var(--sea-ink)]">
              {place.name}
            </h3>
            <div className="flex gap-4">
              <div>
                <p className="text-xs text-[var(--sea-ink-soft)]">ARS</p>
                <p className="font-medium text-[var(--sea-ink)]">
                  {formatMoney(createMoney(place.balances.ARS, 'ARS'))}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--sea-ink-soft)]">USD</p>
                <p className="font-medium text-[var(--sea-ink)]">
                  {formatMoney(createMoney(place.balances.USD, 'USD'))}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {workspace.movements.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="font-serif text-lg font-bold text-[var(--sea-ink)]">
            Movimientos
          </h3>
          <ul className="flex flex-col gap-2">
            {workspace.movements.map((movement) => (
              <li
                key={movement.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-3"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[var(--sea-ink)]">
                    {movement.kind === 'contribution'
                      ? `Ahorro en ${movement.placeName}`
                      : `Transferencia de ${movement.fromPlaceName} a ${movement.toPlaceName}`}
                  </span>
                  <span className="text-xs text-[var(--sea-ink-soft)]">
                    {new Date(movement.createdAt).toLocaleDateString('es-AR')}
                  </span>
                </div>
                <span className="font-medium text-[var(--sea-ink)]">
                  {movement.currency} {formatMoney(createMoney(movement.amount, movement.currency))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {workspace.movements.length === 0 && workspace.places.length > 0 && (
        <p className="text-sm text-[var(--sea-ink-soft)]">
          No hay movimientos todavía.
        </p>
      )}

      <SavingsPlaceSheet
        open={isCreateOpen || editingPlaceId !== null}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setIsCreateOpen(false)
            setEditingPlaceId(null)
          }
        }}
        placeId={editingPlaceId}
      />
      <SavingsTransferSheet
        open={isTransferOpen}
        onOpenChange={setIsTransferOpen}
        places={workspace.places}
      />
    </div>
  )
}
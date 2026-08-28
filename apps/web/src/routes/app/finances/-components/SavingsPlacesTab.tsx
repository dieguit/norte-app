import { useState } from "react";
import { ArrowRightLeft, Pencil, Search } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { formatMoney } from "../../../../lib/format";
import { createMoney } from "../../../../lib/money";
import type { SavingsPlacesWorkspace } from "../../../../features/savings-places/savings-places";
import { getSavingsPlaceEntries } from "../../../../features/savings-places/savings-places";
import { SavingsPlaceSheet } from "./SavingsPlaceSheet";
import { SavingsTransferSheet } from "./SavingsTransferSheet";
import { SavingsMovementsSheet } from "./SavingsMovementsSheet";

interface SavingsPlacesTabProps {
  workspace: SavingsPlacesWorkspace;
}

export function SavingsPlacesTab({ workspace }: SavingsPlacesTabProps) {
  const [editingPlace, setEditingPlace] = useState<
    SavingsPlacesWorkspace["places"][number] | null
  >(null);
  const [transferPlace, setTransferPlace] = useState<
    SavingsPlacesWorkspace["places"][number] | null
  >(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<
    SavingsPlacesWorkspace["places"][number] | null
  >(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
        <div>
          <h2 className="font-serif text-xl font-bold tracking-tight text-[var(--sea-ink)] sm:text-4xl">
            Tus ahorros
          </h2>
        </div>
        <div className="flex gap-2 sm:ml-auto">
          <Button type="button" onClick={() => setIsCreateOpen(true)}>
            Nuevo lugar
          </Button>
        </div>
      </div>

      {workspace.places.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
          <p className="text-lg font-medium text-[var(--sea-ink)]">
            Todavía no tenés lugares de ahorro.
          </p>
          <p className="text-sm text-[var(--sea-ink-soft)]">
            Creá un lugar para empezar a registrar dónde guardás tu dinero.
          </p>
        </div>
      ) : (
        <section
          aria-label="Lugares de ahorro"
          className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)]"
        >
          <ul className="divide-y divide-[var(--line)]">
            {workspace.places.map((place) => (
              <li
                key={place.id}
                className="flex flex-col items-stretch justify-between gap-5 p-5 sm:flex-row sm:items-center"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-[var(--sea-ink)]">
                      {place.name}
                    </h3>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Editar lugar ${place.name}`}
                        onClick={() => setEditingPlace(place)}
                      >
                        <Pencil data-icon="inline-start" aria-hidden="true" />
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Transferir desde ${place.name}`}
                        onClick={() => setTransferPlace(place)}
                      >
                        <ArrowRightLeft
                          data-icon="inline-start"
                          aria-hidden="true"
                        />
                        Transferir
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Ver movimientos de ${place.name}`}
                        onClick={() => setSelectedPlace(place)}
                      >
                        <Search data-icon="inline-start" aria-hidden="true" />
                        Movimientos
                      </Button>
                    </div>
                  </div>
                </div>
                <p className="whitespace-nowrap text-right font-medium tabular-nums text-[var(--sea-ink)]">
                  {formatMoney(createMoney(place.balances.ARS, "ARS"))} ·{" "}
                  {formatMoney(createMoney(place.balances.USD, "USD"))}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <SavingsPlaceSheet
        open={isCreateOpen || editingPlace !== null}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingPlace(null);
          }
        }}
        place={editingPlace ?? undefined}
      />
      {transferPlace && (
        <SavingsTransferSheet
          open
          onOpenChange={(open) => {
            if (!open) setTransferPlace(null);
          }}
          fromPlace={transferPlace}
          places={workspace.places}
        />
      )}
      {selectedPlace && (
        <SavingsMovementsSheet
          open
          onOpenChange={(open) => {
            if (!open) setSelectedPlace(null);
          }}
          placeName={selectedPlace.name}
          movements={getSavingsPlaceEntries(
            workspace.movements,
            selectedPlace.id,
          )}
        />
      )}
    </div>
  );
}

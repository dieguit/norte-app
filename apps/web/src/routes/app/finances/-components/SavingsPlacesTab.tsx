import { useState } from "react";
import { ArrowDownLeft, ArrowLeftRight, Ellipsis, Flag } from "lucide-react";
import { ChartRing, chartColor } from "../../../../components/norte/CategoryDonut";
import { FloatingAdd } from "../../../../components/norte/FloatingAdd";
import { Money } from "../../../../components/norte/Money";
import { SplitLayout } from "../../../../components/norte/PageLayout";
import { Button } from "../../../../components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../../../../components/ui/popover";
import {
  getSavingsPlaceEntries,
  type SavingsMovement,
  type SavingsPlacesWorkspace,
} from "../../../../features/savings-places/savings-places";
import { formatDate } from "../../../../lib/format";
import type { Money as MoneyValue } from "../../../../lib/money";
import { plural, savingsTotals } from "./finances-summary";
import { SavingsMovementsSheet } from "./SavingsMovementsSheet";
import { SavingsPlaceSheet } from "./SavingsPlaceSheet";
import { SavingsTransferSheet } from "./SavingsTransferSheet";

type Place = SavingsPlacesWorkspace["places"][number];

const CURRENCIES = [["ARS", "Pesos"], ["USD", "Dólares"]] as const;
const INLINE_MOVEMENTS = 3;

const byBalance = (a: Place, b: Place) =>
  Number(b.balances.ARS) - Number(a.balances.ARS) ||
  Number(b.balances.USD) - Number(a.balances.USD) ||
  a.name.localeCompare(b.name, "es-AR");

const MOVEMENT_ICONS = {
  contribution: [ArrowDownLeft, "text-accent-brand"],
  transfer: [ArrowLeftRight, "text-muted-foreground"],
  completion: [Flag, "text-foreground"],
} as const;

function movementLabel(movement: SavingsMovement) {
  if (movement.kind === "contribution") return "Ahorro registrado";
  if (movement.kind === "transfer") return `Desde ${movement.fromPlaceName}`;
  return `Objetivo: ${movement.goalName}`;
}

function CurrencyDonut({ code, label, places, total }: { code: "ARS" | "USD"; label: string; places: Place[]; total: MoneyValue }) {
  const values = places.map((place) => Math.max(Number(place.balances[code]), 0));
  return (
    <figure aria-label={label} className="m-0 flex flex-col items-center gap-3">
      <figcaption className="flex items-baseline gap-1.5">
        <span className="text-[11px] font-semibold text-accent-brand">{code}</span>
        <span className="text-[12px] text-muted-foreground">{label}</span>
      </figcaption>
      <div className="relative size-40">
        <ChartRing values={values} family="savings" size={160} thickness={19.2} gap={2} className="size-full" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <Money value={total} size="large" decimals={false} />
          <span className="text-[11px] text-subtle-foreground">{plural(values.filter((value) => value > 0).length, "lugar", "lugares")}</span>
        </div>
      </div>
    </figure>
  );
}

function MovementRow({ movement }: { movement: SavingsMovement }) {
  const [Icon, color] = MOVEMENT_ICONS[movement.kind];
  const outgoing = movement.kind === "completion";
  return (
    <li className="flex items-center gap-3 py-2">
      <span className="w-11 shrink-0 text-caption text-subtle-foreground">
        {formatDate(movement.createdAt, { day: "2-digit", month: "short" }).replace("-", " ")}
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <Icon className={`size-3.5 shrink-0 ${color}`} aria-hidden="true" />
        <span className="truncate text-[14px] text-foreground">{movementLabel(movement)}</span>
      </span>
      <Money
        value={{ amount: outgoing ? `-${movement.amount}` : movement.amount, currency: movement.currency }}
        size="sm"
        sign="always"
        tone={outgoing ? "muted" : "positive"}
      />
    </li>
  );
}

function PlaceActions({ name, onEdit, onTransfer, onMovements }: { name: string; onEdit: () => void; onTransfer: () => void; onMovements: () => void }) {
  const [open, setOpen] = useState(false);
  const item = (ariaLabel: string, text: string, action: () => void) => (
    <Button type="button" variant="ghost" className="h-11 justify-start" aria-label={ariaLabel} onClick={() => { setOpen(false); action(); }}>
      {text}
    </Button>
  );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={`Acciones de ${name}`}
            className="-my-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring motion-reduce:transition-none"
          >
            <Ellipsis className="size-4" aria-hidden="true" />
          </button>
        }
      />
      <PopoverContent align="end" className="w-48 gap-0.5 p-1">
        {item(`Editar lugar ${name}`, "Editar", onEdit)}
        {item(`Transferir desde ${name}`, "Transferir", onTransfer)}
        {item(`Ver movimientos de ${name}`, "Ver movimientos", onMovements)}
      </PopoverContent>
    </Popover>
  );
}

function PlaceGroup({
  place,
  color,
  movements,
  ...actions
}: {
  place: Place;
  color: string;
  movements: SavingsMovement[];
  onEdit: () => void;
  onTransfer: () => void;
  onMovements: () => void;
}) {
  return (
    <section aria-label={place.name} className="border-t border-border">
      <div className="flex items-center gap-2.5 py-3.5">
        <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: color }} />
        <h3 className="m-0 min-w-0 flex-1 truncate text-[15px] font-semibold text-foreground">{place.name}</h3>
        <span className="flex shrink-0 gap-2">
          {CURRENCIES.filter(([code]) => Number(place.balances[code]) !== 0 || (code === "ARS" && Number(place.balances.USD) === 0)).map(([code]) => (
            <span key={code} className="flex min-w-21 justify-end">
              <Money value={{ amount: place.balances[code], currency: code }} size="sm" />
            </span>
          ))}
        </span>
        <PlaceActions name={place.name} {...actions} />
      </div>
      {movements.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0 pb-2.5 pl-5">
          {movements.map((movement) => <MovementRow key={movement.id} movement={movement} />)}
        </ul>
      )}
    </section>
  );
}

export function SavingsPlacesTab({
  workspace,
  createOpen,
  onCreateOpenChange,
}: {
  workspace: SavingsPlacesWorkspace;
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
}) {
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const [transferPlace, setTransferPlace] = useState<Place | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const places = [...workspace.places].sort(byBalance);
  const totals = savingsTotals(places);

  return (
    <>
      <SplitLayout
        aside={
          <div className="grid grid-cols-2 gap-3">
            {CURRENCIES.map(([code, label], index) => (
              <CurrencyDonut key={code} code={code} label={label} places={places} total={totals[index]} />
            ))}
          </div>
        }
      >
        {places.length === 0 ? (
          <div className="flex flex-col gap-1 py-8 text-center">
            <p className="m-0 text-heading text-foreground">Todavía no tenés lugares de ahorro.</p>
            <p className="m-0 text-body-sm text-muted-foreground">Creá un lugar para empezar a registrar dónde guardás tu dinero.</p>
          </div>
        ) : (
          <section aria-label="Lugares de ahorro" className="flex flex-col">
            <p className="m-0 flex h-12 items-center text-body-sm font-medium text-muted-foreground">
              {plural(places.length, "lugar", "lugares")}
            </p>
            {places.map((place, rank) => (
              <PlaceGroup
                key={place.id}
                place={place}
                color={chartColor("savings", rank)}
                movements={getSavingsPlaceEntries(workspace.movements, place.id).slice(0, INLINE_MOVEMENTS)}
                onEdit={() => setEditingPlace(place)}
                onTransfer={() => setTransferPlace(place)}
                onMovements={() => setSelectedPlace(place)}
              />
            ))}
          </section>
        )}
      </SplitLayout>

      <FloatingAdd aria-label="Agregar lugar" onClick={() => onCreateOpenChange(true)} />
      <SavingsPlaceSheet
        open={createOpen || editingPlace !== null}
        onOpenChange={(open: boolean) => {
          if (!open) {
            onCreateOpenChange(false);
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
          movements={getSavingsPlaceEntries(workspace.movements, selectedPlace.id)}
        />
      )}
    </>
  );
}
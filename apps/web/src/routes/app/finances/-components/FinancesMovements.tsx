import { useState } from "react";
import type { FinancesWorkspace } from "@repo/shared-types";
import { MovementLog } from "../../../../components/norte/MovementLog";
import { formatMonthName } from "../../../../lib/format";
import { localDay } from "../../../../lib/movement-day";
import { cn } from "../../../../lib/utils";
import { financesLog, type LogFilter } from "./finances-log";

const FILTERS: [LogFilter, string][] = [
  ["all", "Todos"],
  ["income", "Ingresos"],
  ["expense", "Gastos"],
  ["contribution", "Aportes"],
];

export function FinancesMovements({ workspace }: { workspace: FinancesWorkspace }) {
  const [filter, setFilter] = useState<LogFilter>("all");
  return (
    <section aria-labelledby="finances-movements-heading" className="hidden flex-col gap-4 xl:flex">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h2 id="finances-movements-heading" className="m-0 font-serif text-[24px] font-semibold text-foreground">
            Últimos movimientos
          </h2>
          <p className="m-0 text-body-sm text-muted-foreground">
            Ingresos, gastos y aportes de {formatMonthName(workspace.month)}
          </p>
        </div>
        <div role="group" aria-label="Filtrar movimientos" className="flex rounded-full bg-muted p-1">
          {FILTERS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={cn(
                "min-h-9 rounded-full px-3.5 text-body-sm transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring motion-reduce:transition-none",
                filter === value
                  ? "bg-background font-semibold text-foreground shadow-[var(--shadow-card)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <MovementLog
        days={financesLog(workspace, filter)}
        today={localDay(new Date().toISOString())}
        empty="Sin movimientos este mes"
      />
    </section>
  );
}

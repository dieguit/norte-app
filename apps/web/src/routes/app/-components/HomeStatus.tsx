import { CircleAlert } from "lucide-react";
import type { InitialHomeState } from "../../../features/financial/financial";
import { formatMonthName } from "../../../lib/format";
import type { CatchUpContribution } from "./ContributionActionSheet";
import { shortMoney } from "./home-view";

export type HomeShortfall = InitialHomeState["previousMonthShortfalls"][number];

const MAX_ALERTS = 3;

export function PreviousMonthAlerts({
  closedMonth,
  shortfalls,
  onCatchUp,
}: {
  closedMonth: string;
  shortfalls: HomeShortfall[];
  onCatchUp: (contribution: CatchUpContribution) => void;
}) {
  if (shortfalls.length === 0) return null;
  const month = formatMonthName(closedMonth);
  const label = month[0].toUpperCase() + month.slice(1);
  const visible = shortfalls.slice(0, MAX_ALERTS);
  const hidden = shortfalls.length - visible.length;

  return (
    <section aria-label={`Pendientes de ${month}`}>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {visible.map((shortfall, index) => (
          <li
            key={`${shortfall.kind}-${shortfall.currency}`}
            className="flex items-center gap-2.5 rounded-md bg-negative-soft px-3 py-2.5"
          >
            <CircleAlert
              className="size-4 shrink-0 text-negative"
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 text-body-sm text-foreground">
              {label}: faltó{" "}
              {shortfall.kind === "investment" ? "invertir" : "ahorrar"}{" "}
              {shortMoney(shortfall.amount)}
              {index === visible.length - 1 && hidden > 0
                ? ` y ${hidden} más`
                : ""}
            </span>
            <button
              type="button"
              className="-my-1.5 min-h-11 shrink-0 rounded-md px-1 text-body-sm font-semibold text-negative focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
              onClick={() =>
                onCatchUp({
                  kind: shortfall.kind,
                  currency: shortfall.currency,
                  amount: shortfall.amount.amount,
                  month: closedMonth,
                })
              }
            >
              Ponerse al día
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

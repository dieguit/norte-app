import type { InitialHomeState } from "../../../features/financial/financial";
import type { CatchUpContribution } from "./ContributionActionSheet";
import { formatMoney } from "../../../lib/format";
import { Button } from "../../../components/ui/button";

type HomeShortfall = NonNullable<InitialHomeState["previousMonthShortfalls"]>[number];

function ShortfallItem({
  shortfall,
  month,
  closedMonth,
  onCatchUp,
}: {
  shortfall: HomeShortfall;
  month: string;
  closedMonth: string;
  onCatchUp: (contribution: CatchUpContribution) => void;
}) {
  return (
    <li className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <span>
        En {month} te faltaron {shortfall.kind === "investment" ? "invertir" : "ahorrar"}{" "}
        {shortfall.currency} {formatMoney(shortfall.amount)}.
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
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
      </Button>
    </li>
  );
}

export function PreviousMonthStatus({
  month,
  closedMonth,
  shortfalls,
  onCatchUp,
}: {
  month: string;
  closedMonth: string;
  shortfalls: HomeShortfall[];
  onCatchUp: (contribution: CatchUpContribution) => void;
}) {
  return shortfalls.length > 0 ? (
    <section
      aria-labelledby="previous-month-shortfalls-heading"
      className="rounded-xl border border-[var(--line)] bg-[var(--foam)] p-5"
    >
      <h2
        id="previous-month-shortfalls-heading"
        className="text-base font-semibold text-[var(--sea-ink)]"
      >
        No cumpliste todos tus objetivos de {month}.
      </h2>
      <ul className="mt-2 flex flex-col gap-2 text-sm text-[var(--sea-ink-soft)]">
        {shortfalls.map((shortfall, index) => (
          <ShortfallItem
            key={`${shortfall.kind}-${shortfall.currency}-${index}`}
            shortfall={shortfall}
            month={month}
            closedMonth={closedMonth}
            onCatchUp={onCatchUp}
          />
        ))}
      </ul>
    </section>
  ) : (
    <section
      aria-labelledby="previous-month-success-heading"
      className="rounded-xl border border-[var(--line)] bg-[var(--lagoon)]/35 p-5"
    >
      <h2
        id="previous-month-success-heading"
        className="font-semibold text-[var(--sea-ink)]"
      >
        Cumpliste tus objetivos de {month}.
      </h2>
      <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
        Seguís en camino con tu plan.
      </p>
    </section>
  );
}

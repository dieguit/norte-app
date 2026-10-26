import { Check, PiggyBank, Plus, TrendingUp } from "lucide-react";
import { Money } from "../../../components/norte/Money";
import { Button } from "../../../components/ui/button";
import { formatMonthName } from "../../../lib/format";
import { cn } from "../../../lib/utils";
import { shortMoney, type MonthTarget } from "./home-view";

function TargetRow({ target }: { target: MonthTarget }) {
  const done = Number(target.missing.amount) === 0;
  const saving = target.kind === "saving";
  const Icon = saving ? PiggyBank : TrendingUp;
  return (
    <li className="flex items-center gap-3 border-t border-border py-3">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full",
          saving ? "bg-muted text-foreground" : "bg-accent-brand-soft text-accent-brand",
        )}
      >
        <Icon className="size-[18px]" aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="text-[15px] font-semibold text-foreground">{target.label}</span>
        <span aria-hidden="true" className="h-1 overflow-hidden rounded-xs bg-muted">
          <span className={cn("block h-full rounded-xs", done ? "bg-positive" : "bg-foreground")} style={{ width: `${target.share * 100}%` }} />
        </span>
        <span className="text-caption text-muted-foreground">
          {shortMoney(target.contributed)} de {shortMoney(target.target)}
        </span>
      </div>
      {done ? (
        <span className="flex shrink-0 items-center gap-1 text-body-sm font-semibold text-positive">
          <Check className="size-3.5" aria-hidden="true" />
          Cumplido
        </span>
      ) : (
        <span className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="text-[11px] text-subtle-foreground">Falta</span>
          <Money value={target.missing} decimals={false} />
        </span>
      )}
    </li>
  );
}

export function HomeTargets({ month, targets, onRegister }: { month: string; targets: MonthTarget[]; onRegister: () => void }) {
  return (
    <section aria-labelledby="home-targets-heading" className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3 pb-1">
        <h2 id="home-targets-heading" className="m-0 text-heading text-foreground">
          Metas de {formatMonthName(month)}
        </h2>
        <Button
          type="button"
          onClick={onRegister}
          className="relative h-9 gap-1.5 rounded-md px-3.5 text-[14px] font-semibold after:absolute after:-inset-1 xl:hidden"
        >
          <Plus className="size-4" aria-hidden="true" />
          Registrar
        </Button>
      </div>
      {targets.length === 0 ? (
        <p className="m-0 border-t border-border py-3 text-body-sm text-muted-foreground">
          Todavía no hay aportes planificados para este mes.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {targets.map((target) => (
            <TargetRow key={`${target.kind}-${target.currency}`} target={target} />
          ))}
        </ul>
      )}
    </section>
  );
}

import { Fragment, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Check,
  ChevronUp,
  CircleAlert,
  CircleCheck,
  Split,
} from "lucide-react";
import type { RoadmapMonth } from "@repo/shared-types";
import { Money } from "../../../components/norte/Money";
import { Button } from "../../../components/ui/button";
import type { GoalWorkspaceItem } from "../../../features/goals/goals";
import { formatCalendarMonth, formatPercentage } from "../../../lib/format";
import type { Money as MoneyValue } from "../../../lib/money";
import { cn } from "../../../lib/utils";
import type { HomeShortfall } from "./HomeStatus";
import {
  contributedLabel,
  countLabel,
  currentFunding,
  monthTitle,
  monthsAway,
  shortMoney,
  shortMonth,
} from "./home-view";

function projectionReason(goal: GoalWorkspaceItem) {
  if (goal.status === "paused" || goal.projection.status === "plan_paused")
    return "Proyección pausada";
  if (goal.projection.status === "available")
    return formatCalendarMonth(goal.projection.completionMonth);
  return {
    target_unavailable: "Objetivo por calcular",
    commitment_absent: "Sin aporte mensual",
    no_future_allocation: "No recibe aportes todavía",
    investment_assumption_unavailable: "Supuesto de inversión no disponible",
    outside_horizon: "No alcanzado dentro del horizonte",
  }[goal.projection.status];
}

const LINE = { past: "bg-foreground/25", future: "bg-border" } as const;
const DOT = {
  past: "size-2.5 bg-foreground",
  current: "size-4 border-4 border-accent-brand bg-background",
  goal: "size-3 border-2 border-foreground bg-background",
  undated: "size-2.5 border-[1.5px] border-subtle-foreground bg-background",
} as const;

function RouteNode({
  dot,
  lineIn,
  lineOut,
  children,
}: {
  dot: keyof typeof DOT;
  lineIn: keyof typeof LINE;
  lineOut: keyof typeof LINE;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3.5">
      <div
        aria-hidden="true"
        className="flex w-[22px] shrink-0 flex-col items-center"
      >
        <span
          className={cn(
            "w-0.5",
            dot === "current" ? "h-1" : "h-2",
            LINE[lineIn],
          )}
        />
        <span className={cn("shrink-0 rounded-full", DOT[dot])} />
        <span className={cn("w-0.5 flex-1", LINE[lineOut])} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-1 pb-[22px]">
        {children}
      </div>
    </div>
  );
}

function CompletedGoals({ goals }: { goals: GoalWorkspaceItem[] }) {
  return (
    <>
      {goals
        .filter((goal) => goal.status === "completed")
        .map((goal) => (
          <p
            key={goal.id}
            className="m-0 flex items-center gap-1.5 text-caption text-foreground"
          >
            <CircleCheck
              className="size-3.5 shrink-0 text-positive"
              aria-hidden="true"
            />
            Cumpliste {goal.name}
          </p>
        ))}
    </>
  );
}

function MonthStatus({ shortfalls }: { shortfalls: HomeShortfall[] }) {
  const done = shortfalls.length === 0;
  const Icon = done ? Check : CircleAlert;
  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-1 text-caption font-medium",
        done ? "text-positive" : "text-negative",
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {done
        ? "Cumplido"
        : `Faltó ${shortfalls.map((shortfall) => shortMoney(shortfall.amount)).join(" · ")}`}
    </span>
  );
}

export function LoadMoreHistory({ onLoad }: { onLoad: () => void }) {
  return (
    <button
      type="button"
      onClick={onLoad}
      className="-my-1.5 flex min-h-11 items-center gap-3.5 rounded-md text-left text-body-sm font-semibold text-accent-brand focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
    >
      <span className="flex w-[22px] justify-center">
        <ChevronUp className="size-3.5" aria-hidden="true" />
      </span>
      Ver meses anteriores
    </button>
  );
}

export function HistoryNode({
  month,
  shortfalls,
}: {
  month: RoadmapMonth;
  shortfalls?: HomeShortfall[];
}) {
  return (
    <RouteNode dot="past" lineIn="past" lineOut="past">
      <div className="flex items-center justify-between gap-2">
        <h3 className="m-0 text-[14px] font-semibold text-foreground">
          {monthTitle(month.month)}
        </h3>
        {shortfalls && <MonthStatus shortfalls={shortfalls} />}
      </div>
      <p className="m-0 text-caption text-muted-foreground">
        {contributedLabel(month.contributions)}
      </p>
      <CompletedGoals goals={month.objectives} />
    </RouteNode>
  );
}

export function CurrentNode({
  month,
  totals,
}: {
  month: RoadmapMonth;
  totals: MoneyValue[];
}) {
  const held = totals.filter((total) => Number(total.amount) !== 0);
  const shown = held.length ? held : totals.slice(0, 1);
  return (
    <RouteNode dot="current" lineIn="past" lineOut="future">
      <h3 className="m-0 text-overline text-accent-brand">
        Estás acá · {monthTitle(month.month)}
      </h3>
      <p className="m-0 text-body-sm text-muted-foreground">
        Llevás ahorrado para tus objetivos
      </p>
      <p className="m-0 flex items-center gap-2.5">
        {shown.map((total, i) => (
          <Fragment key={total.currency}>
            {i > 0 && (
              <span
                aria-hidden="true"
                className="text-[18px] text-subtle-foreground"
              >
                ·
              </span>
            )}
            <Money value={total} size="large" decimals={false} />
          </Fragment>
        ))}
      </p>
      <CompletedGoals goals={month.objectives} />
    </RouteNode>
  );
}

function DeadlineBadge({ delta }: { delta?: number }) {
  if (delta === undefined) return null;
  const late = delta > 0;
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        late
          ? "bg-muted text-muted-foreground"
          : "bg-accent-brand-soft text-accent-brand",
      )}
    >
      {late ? `${countLabel(delta, "mes", "meses")} tarde` : "A tiempo"}
    </span>
  );
}

export function GoalNode({
  goal,
  currentMonth,
  reached = false,
  reallocates = false,
  onComplete,
}: {
  goal: GoalWorkspaceItem;
  currentMonth: string;
  reached?: boolean;
  reallocates?: boolean;
  onComplete?: (goalId: string) => void;
}) {
  const pct =
    goal.progressPercentage === undefined
      ? undefined
      : Math.min(Number(goal.progressPercentage), 100);
  const share = currentFunding(goal, currentMonth)?.percentage;
  const when = reached
    ? `Alcanzado · ${monthTitle(currentMonth)}`
    : goal.projection.status === "available"
      ? `${shortMonth(goal.projection.completionMonth)} · ${monthsAway(currentMonth, goal.projection.completionMonth)}`
      : projectionReason(goal);
  const amounts = goal.targetAmount
    ? `${shortMoney(goal.actualValue)} de ${shortMoney(goal.targetAmount)}`
    : shortMoney(goal.actualValue);

  return (
    <RouteNode dot="goal" lineIn="future" lineOut="future">
      <p className="m-0 text-overline text-subtle-foreground">{when}</p>
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="m-0 min-w-0 truncate text-heading text-foreground">
          {goal.name}
        </h4>
        {pct !== undefined && (
          <span className="shrink-0 text-body-sm font-semibold text-muted-foreground">
            {formatPercentage(pct, 0)}
          </span>
        )}
      </div>
      {pct !== undefined && (
        <span
          aria-hidden="true"
          className="h-1.5 overflow-hidden rounded-[3px] bg-muted"
        >
          <span
            className="block h-full rounded-[3px] bg-accent-brand"
            style={{ width: `${pct}%` }}
          />
        </span>
      )}
      <div className="flex items-center justify-between gap-2">
        <p className="m-0 text-caption text-muted-foreground">
          {!reached && (
            <strong className="font-bold text-foreground">Hoy </strong>
          )}
          <span>{amounts}</span>
        </p>
        {reached ? (
          <Button
            type="button"
            variant="outline"
            aria-label={`Completar ${goal.name}`}
            onClick={() => onComplete?.(goal.id)}
            className="relative h-8 rounded-md px-3 text-[13px] font-semibold after:absolute after:-inset-1.5"
          >
            Completar
          </Button>
        ) : (
          <DeadlineBadge delta={goal.desiredDateDeltaMonths} />
        )}
      </div>
      {reached && reallocates && share && Number(share) > 0 && (
        <p className="m-0 flex items-center gap-1.5 pt-0.5 text-caption text-subtle-foreground">
          <Split className="size-[13px] shrink-0" aria-hidden="true" />
          Al completarlo, su {formatPercentage(share, 0)} se reparte entre los
          demás
        </p>
      )}
    </RouteNode>
  );
}

export function UndatedNode({ goals }: { goals: GoalWorkspaceItem[] }) {
  return (
    <RouteNode dot="undated" lineIn="future" lineOut="future">
      <h3 className="m-0 text-overline text-subtle-foreground">
        Sin fecha proyectada
      </h3>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {goals.map((goal) => (
          <li key={goal.id} className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <h4 className="m-0 truncate text-[15px] font-semibold text-foreground">
                {goal.name}
              </h4>
              <p className="m-0 text-caption text-muted-foreground">
                {projectionReason(goal)}
              </p>
            </div>
            <Link
              to="/app/goals"
              aria-label={`Planificar ${goal.name}`}
              className="-my-2 flex min-h-11 shrink-0 items-center gap-1 text-body-sm font-semibold text-accent-brand no-underline hover:underline"
            >
              Planificar
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </RouteNode>
  );
}

export function RoadmapEmptyState() {
  return (
    <div className="flex flex-col items-center gap-1 py-6 text-center">
      <p className="m-0 text-heading text-foreground">
        Tu hoja de ruta empieza hoy
      </p>
      <p className="m-0 text-body-sm text-muted-foreground">
        Agregá tus finanzas u objetivos para ver cómo cambia tu camino.
      </p>
      <div className="mt-3 flex gap-4 text-body-sm font-semibold">
        <Link to="/app/finances" className="text-accent-brand">
          Ir a Finanzas
        </Link>
        <Link to="/app/goals" className="text-accent-brand">
          Ir a Objetivos
        </Link>
      </div>
    </div>
  );
}

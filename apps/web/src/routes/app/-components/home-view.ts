import BigNumber from "bignumber.js";
import type { RoadmapData, RoadmapMonth } from "@repo/shared-types";
import type { GoalWorkspaceItem } from "../../../features/goals/goals";
import { formatCalendarMonth, formatMoney } from "../../../lib/format";
import { createMoney, type CurrencyCode, type Money } from "../../../lib/money";

type Contribution = RoadmapMonth["contributions"][number];

const TARGETS = [
  ["saving", "ARS", "Ahorro en pesos"],
  ["saving", "USD", "Ahorro en dólares"],
  ["investment", "ARS", "Inversión en pesos"],
  ["investment", "USD", "Inversión en dólares"],
] as const;

export type MonthTarget = {
  kind: "saving" | "investment";
  currency: CurrencyCode;
  label: string;
  target: Money;
  contributed: Money;
  missing: Money;
  share: number;
};

export const shortMoney = (money: Money) => formatMoney(money).replace(/,00$/, "");

export const monthTitle = (month: string) => formatCalendarMonth(month).replace(" de ", " ");

export function shortMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", { month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, monthNumber - 1, 1)))
    .replace(".", "");
}

export const countLabel = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function monthsAway(from: string, to: string) {
  const [fromYear, fromMonth] = from.split("-").map(Number);
  const [toYear, toMonth] = to.split("-").map(Number);
  const total = (toYear - fromYear) * 12 + toMonth - fromMonth;
  if (total <= 0) return "Este mes";
  const years = Math.floor(total / 12);
  const months = total % 12;
  const parts = [years && countLabel(years, "año", "años"), months && countLabel(months, "mes", "meses")].filter(Boolean);
  return `En ${parts.join(" y ")}`;
}

export function activeGoals(roadmap: RoadmapData) {
  const months = [...roadmap.historyMonths, roadmap.currentMonth, ...roadmap.futureMonths];
  const goals = [...months.flatMap((month) => month.objectives), ...roadmap.undatedObjectives];
  return [...new Map(goals.filter((goal) => goal.status !== "completed").map((goal) => [goal.id, goal])).values()];
}

function sum<T>(items: T[], currency: CurrencyCode, pick: (item: T) => Money | undefined) {
  return items.reduce((total, item) => {
    const money = pick(item);
    return money?.currency === currency ? total.plus(money.amount) : total;
  }, new BigNumber(0));
}

export const goalTotals = (goals: GoalWorkspaceItem[]) =>
  (["ARS", "USD"] as const).map((currency) => createMoney(sum(goals, currency, (goal) => goal.actualValue), currency));

export function contributedLabel(contributions: Contribution[]) {
  const parts = (["ARS", "USD"] as const)
    .map((currency) => createMoney(sum(contributions, currency, (item) => item), currency))
    .filter((money) => Number(money.amount) !== 0)
    .map(shortMoney);
  return parts.length ? `Aportaste ${parts.join(" · ")}` : "Sin aportes registrados";
}

export function currentFunding(goal: GoalWorkspaceItem, month: string) {
  return goal.funding.reduce<GoalWorkspaceItem["funding"][number] | undefined>(
    (latest, row) =>
      row.effectiveMonth.slice(0, 7) <= month && (!latest || row.effectiveMonth > latest.effectiveMonth) ? row : latest,
    undefined,
  );
}

// Mirrors the API's deriveShortfalls for the open month: allocated share of the plan vs positive contributions.
export function monthTargets(goals: GoalWorkspaceItem[], contributions: Contribution[], month: string): MonthTarget[] {
  return TARGETS.flatMap(([kind, currency, label]) => {
    const strategy = kind === "saving" ? "save" : "invest";
    const target = sum(
      goals.filter((goal) => goal.strategy === strategy),
      currency,
      (goal) => currentFunding(goal, month)?.allocatedDestinationAmount,
    );
    if (!target.isGreaterThan(0)) return [];
    const contributed = sum(
      contributions.filter((item) => item.kind === kind && Number(item.amount) > 0),
      currency,
      (item) => item,
    );
    return [{
      kind,
      currency,
      label,
      target: createMoney(target, currency),
      contributed: createMoney(contributed, currency),
      missing: createMoney(BigNumber.max(target.minus(contributed), 0), currency),
      share: Math.min(contributed.dividedBy(target).toNumber(), 1),
    }];
  });
}

import { useState } from "react";
import type { RoadmapData } from "@repo/shared-types";
import type { GoalWorkspaceItem } from "../../../features/goals/goals";
import type { HomeShortfall } from "./HomeStatus";
import { activeGoals, goalTotals } from "./home-view";
import {
  CurrentNode,
  GoalNode,
  HistoryNode,
  LoadMoreHistory,
  RoadmapEmptyState,
  UndatedNode,
} from "./RoadmapParts";

function hasRoadmapActivity(roadmap: RoadmapData) {
  const current = roadmap.currentMonth;
  return [
    roadmap.undatedObjectives.length,
    roadmap.futureMonths.length,
    current.objectives.length,
    current.oneTimeExpenses.length,
    current.recurringExpenses.length,
    current.endingExpenses.length,
    current.oneTimeIncomes.length,
    current.recurringIncomes.length,
    current.contributions.length,
    roadmap.historyMonths.length,
  ].some(Boolean);
}

export function Roadmap({
  roadmap,
  completionGoals = [],
  closedMonth,
  shortfalls = [],
  onComplete,
}: {
  roadmap: RoadmapData;
  completionGoals?: GoalWorkspaceItem[];
  closedMonth?: string;
  shortfalls?: HomeShortfall[];
  onComplete?: (goalId: string) => void;
}) {
  const [visibleHistoryCount, setVisibleHistoryCount] = useState(0);
  const currentMonth = roadmap.currentMonth.month;
  const reachedIds = new Set(completionGoals.map((goal) => goal.id));
  const goals = activeGoals(roadmap);
  const projected = [roadmap.currentMonth, ...roadmap.futureMonths]
    .flatMap((month) => month.objectives)
    .filter((goal) => goal.status !== "completed" && !reachedIds.has(goal.id));
  const undated = roadmap.undatedObjectives.filter((goal) => !reachedIds.has(goal.id));

  return (
    <section aria-labelledby="roadmap-heading" className="flex flex-col gap-1 pt-4 pb-8">
      <header className="flex flex-col gap-0.5 pb-3">
        <h2 id="roadmap-heading" className="m-0 font-serif text-[22px] leading-tight font-semibold text-foreground">
          Tu hoja de ruta
        </h2>
        <p className="m-0 text-body-sm text-muted-foreground">Aportes y objetivos proyectados</p>
      </header>
      {visibleHistoryCount < roadmap.historyMonths.length && (
        <LoadMoreHistory onLoad={() => setVisibleHistoryCount((count) => count + 1)} />
      )}
      {roadmap.historyMonths
        .slice(0, visibleHistoryCount)
        .reverse()
        .map((month) => (
          <HistoryNode key={month.month} month={month} shortfalls={month.month === closedMonth ? shortfalls : undefined} />
        ))}
      <CurrentNode month={roadmap.currentMonth} totals={goalTotals(goals)} />
      {completionGoals.map((goal) => (
        <GoalNode key={goal.id} goal={goal} currentMonth={currentMonth} reached reallocates={goals.some((other) => other.id !== goal.id && other.status === "active")} onComplete={onComplete} />
      ))}
      {projected.map((goal) => (
        <GoalNode key={goal.id} goal={goal} currentMonth={currentMonth} />
      ))}
      {undated.length > 0 && <UndatedNode goals={undated} />}
      {!hasRoadmapActivity(roadmap) && completionGoals.length === 0 && <RoadmapEmptyState />}
    </section>
  );
}

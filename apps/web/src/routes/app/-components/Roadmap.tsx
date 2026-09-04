import { useState } from "react";
import type { RoadmapData } from "../../../features/roadmap/roadmap";
import {
  LoadMoreHistory,
  RoadmapEmptyState,
  RoadmapHistory,
  RoadmapTimeline,
  RoadmapUndatedObjectives,
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

export function Roadmap({ roadmap }: { roadmap: RoadmapData }) {
  const [visibleHistoryCount, setVisibleHistoryCount] = useState(0);
  const visibleHistory = roadmap.historyMonths.slice(0, visibleHistoryCount);
  const nextHistory = roadmap.historyMonths[visibleHistoryCount];

  return (
    <section aria-labelledby="roadmap-heading" className="mx-auto w-full max-w-lg">
      <header>
        <h2
          id="roadmap-heading"
          className="font-serif text-3xl font-bold text-[var(--sea-ink)]"
        >
          Tu hoja de ruta
        </h2>
        <p className="mt-2 text-sm text-[var(--sea-ink-soft)]">
          Tu plan, tus aportes y los hitos que proyectan tus objetivos.
        </p>
      </header>
      {nextHistory && (
        <LoadMoreHistory
          month={nextHistory.month}
          onLoad={() => setVisibleHistoryCount((count) => count + 1)}
        />
      )}
      <RoadmapHistory months={visibleHistory} />
      <RoadmapTimeline
        futureMonths={roadmap.futureMonths}
        currentMonth={roadmap.currentMonth}
      />
      <RoadmapUndatedObjectives objectives={roadmap.undatedObjectives} />
      {!hasRoadmapActivity(roadmap) && <RoadmapEmptyState />}
    </section>
  );
}

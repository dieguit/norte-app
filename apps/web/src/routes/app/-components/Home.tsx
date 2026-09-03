import { useState } from "react";
import { Button } from "../../../components/ui/button";
import { formatMonthName } from "../../../lib/format";
import {
  getPreviousCalendarMonth,
  type InitialHomeState,
} from "../../../features/financial/financial";
import type { RoadmapData } from "../../../features/roadmap/roadmap";
import type { GoalWorkspaceItem } from "../../../features/goals/goals";
import { GoalCompletionBanner } from "./GoalCompletionBanner";
import type { CatchUpContribution } from "./ContributionActionSheet";
import { HomeDialogs } from "./HomeDialogs";
import { PreviousMonthStatus } from "./HomeStatus";
import { Roadmap } from "./Roadmap";

export interface HomeProps {
  home: InitialHomeState;
  roadmap: RoadmapData;
  completionGoals?: GoalWorkspaceItem[];
  now?: Date;
}

export function Home({ home, roadmap, completionGoals = [], now }: HomeProps) {
  const [isContributionOpen, setIsContributionOpen] = useState(false);
  const [catchUpContribution, setCatchUpContribution] = useState<CatchUpContribution | null>(null);
  const [completionGoalId, setCompletionGoalId] = useState<string | null>(null);
  const closedMonth = getPreviousCalendarMonth(now);
  const shortfalls = home.previousMonthShortfalls ?? [];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-12">
      <header className="flex items-center justify-between gap-4">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-[var(--sea-ink)] sm:text-4xl">
          Inicio
        </h1>
        <Button
          type="button"
          onClick={() => {
            setCatchUpContribution(null);
            setIsContributionOpen(true);
          }}
        >
          + Registrar
        </Button>
      </header>
      <PreviousMonthStatus
        month={formatMonthName(closedMonth)}
        closedMonth={closedMonth}
        shortfalls={shortfalls}
        onCatchUp={(contribution) => {
          setCatchUpContribution(contribution);
          setIsContributionOpen(true);
        }}
      />
      {completionGoals.map((goal) => (
        <GoalCompletionBanner
          key={goal.id}
          goal={goal}
          onComplete={setCompletionGoalId}
        />
      ))}
      <Roadmap roadmap={roadmap} />
      <HomeDialogs
        isContributionOpen={isContributionOpen}
        setIsContributionOpen={setIsContributionOpen}
        catchUpContribution={catchUpContribution}
        setCatchUpContribution={setCatchUpContribution}
        completionGoalId={completionGoalId}
        setCompletionGoalId={setCompletionGoalId}
      />
    </div>
  );
}

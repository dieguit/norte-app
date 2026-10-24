import { useState } from "react";
import type { RoadmapData } from "@repo/shared-types";
import { MapGrid } from "../../../components/norte/MapGrid";
import { getPreviousCalendarMonth, type InitialHomeState } from "../../../features/financial/financial";
import type { GoalWorkspaceItem } from "../../../features/goals/goals";
import type { CatchUpContribution } from "./ContributionActionSheet";
import { HomeDialogs } from "./HomeDialogs";
import { PreviousMonthAlerts } from "./HomeStatus";
import { HomeTargets } from "./HomeTargets";
import { activeGoals, monthTargets, monthTitle } from "./home-view";
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
  const month = roadmap.currentMonth.month;

  return (
    <div className="relative isolate flex flex-col gap-5 px-5 pt-5">
      <MapGrid className="h-65" />
      <h1 className="m-0 text-display text-foreground">
        <span className="sr-only">Inicio · </span>{" "}
        {monthTitle(month)}
      </h1>
      <PreviousMonthAlerts
        closedMonth={closedMonth}
        shortfalls={shortfalls}
        onCatchUp={(contribution) => {
          setCatchUpContribution(contribution);
          setIsContributionOpen(true);
        }}
      />
      <HomeTargets
        month={month}
        targets={monthTargets(activeGoals(roadmap), roadmap.currentMonth.contributions, month)}
        onRegister={() => {
          setCatchUpContribution(null);
          setIsContributionOpen(true);
        }}
      />
      <Roadmap
        roadmap={roadmap}
        completionGoals={completionGoals}
        closedMonth={closedMonth}
        shortfalls={shortfalls}
        onComplete={setCompletionGoalId}
      />
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

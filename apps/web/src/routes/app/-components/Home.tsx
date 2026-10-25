import { useState } from "react";
import { Plus } from "lucide-react";
import type { RoadmapData } from "@repo/shared-types";
import { Button } from "../../../components/ui/button";
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

  const openContribution = () => {
    setCatchUpContribution(null);
    setIsContributionOpen(true);
  };

  return (
    <div
      data-wide
      className="flex flex-col gap-5 px-5 pt-5 xl:gap-9 xl:px-12 xl:pt-10 xl:pb-12 min-[120rem]:px-24 min-[120rem]:pt-12"
    >
      <div className="flex items-end justify-between gap-4">
        <h1 className="m-0 text-display text-foreground xl:text-[36px] xl:tracking-[-0.6px]">
          <span className="sr-only font-sans text-overline text-accent-brand xl:not-sr-only xl:mb-1.5 xl:block xl:text-xs xl:tracking-[1.6px]">
            Inicio <span className="sr-only">· </span>
          </span>{" "}
          {monthTitle(month)}
        </h1>
        <Button
          type="button"
          onClick={openContribution}
          className="hidden h-11 gap-1.5 rounded-md px-5 text-[15px] font-semibold xl:inline-flex"
        >
          <Plus className="size-4" aria-hidden="true" />
          Registrar aporte
        </Button>
      </div>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:gap-12 min-[120rem]:gap-16">
        <div className="flex flex-col gap-5 xl:w-105 xl:shrink-0 xl:gap-7 min-[120rem]:w-140">
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
            onRegister={openContribution}
          />
        </div>
        <div className="min-w-0 xl:flex-1 xl:self-stretch xl:border-l xl:border-border xl:pl-12 min-[120rem]:pl-16">
          <Roadmap
            roadmap={roadmap}
            completionGoals={completionGoals}
            closedMonth={closedMonth}
            shortfalls={shortfalls}
            onComplete={setCompletionGoalId}
          />
        </div>
      </div>
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

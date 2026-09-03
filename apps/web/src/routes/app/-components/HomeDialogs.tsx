import { GoalCompletionSheet } from "../../../features/goals/GoalCompletionSheet";
import type { CatchUpContribution } from "./ContributionActionSheet";
import { ContributionActionSheet } from "./ContributionActionSheet";

export function HomeDialogs({
  isContributionOpen,
  setIsContributionOpen,
  catchUpContribution,
  setCatchUpContribution,
  completionGoalId,
  setCompletionGoalId,
}: {
  isContributionOpen: boolean;
  setIsContributionOpen: (open: boolean) => void;
  catchUpContribution: CatchUpContribution | null;
  setCatchUpContribution: (contribution: CatchUpContribution | null) => void;
  completionGoalId: string | null;
  setCompletionGoalId: (goalId: string | null) => void;
}) {
  return (
    <>
      <ContributionActionSheet
        open={isContributionOpen}
        onOpenChange={(open) => {
          setIsContributionOpen(open);
          if (!open) setCatchUpContribution(null);
        }}
        catchUpContribution={catchUpContribution}
      />
      <GoalCompletionSheet
        open={completionGoalId !== null}
        goalId={completionGoalId}
        onOpenChange={(open) => {
          if (!open) setCompletionGoalId(null);
        }}
      />
    </>
  );
}

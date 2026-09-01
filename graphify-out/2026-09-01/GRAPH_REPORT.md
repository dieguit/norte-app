# Graph Report - app  (2026-09-01)

## Corpus Check
- 404 files · ~397,184 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 398 nodes · 1002 edges · 20 communities (17 shown, 2 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4ad8db0f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- goals.server.ts
- goals.functions.test.ts
- GoalCompletion.tsx
- saving-contribution.repository.server.ts
- goal-completion.ts
- savings-places.ts
- goal-completion.repository.server.ts
- AllocationImpactComparison.tsx
- goals.ts
- .fallowrc.json
- GoalsWorkspace.tsx
- Roadmap.tsx
- goals.test.ts
- GoalWorkspaceItem
- SavingContributionActions.tsx
- roadmap.ts
- Agent skills
- NORTE
- SavingsPlacesTab.test.tsx

## God Nodes (most connected - your core abstractions)
1. `GoalWorkspaceItem` - 17 edges
2. `buildGoalsWorkspace()` - 15 edges
3. `confirmGoalCompletionInRepository()` - 12 edges
4. `buildGoalLifecycleProposal()` - 12 edges
5. `GoalsWorkspaceSource` - 12 edges
6. `buildGoalCompletionProposal()` - 10 edges
7. `GoalsWorkspaceRows` - 10 edges
8. `getGoalLifecycleStateWithExecutor()` - 10 edges
9. `confirmGoalLifecycleInRepository()` - 10 edges
10. `mapRowsToGoalsWorkspaceSource()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `SavingContributionState` --references--> `GoalsWorkspaceSource`  [EXTRACTED]
  apps/web/src/features/contributions/saving-contribution.repository.server.ts → apps/web/src/features/goals/goals.ts
- `GoalCardProps` --references--> `GoalWorkspaceItem`  [EXTRACTED]
  apps/web/src/routes/app/goals/-components/GoalsWorkspace.tsx → apps/web/src/features/goals/goals.ts
- `getSavingContributionStateWithExecutor()` --calls--> `mapRowsToGoalsWorkspaceSource()`  [EXTRACTED]
  apps/web/src/features/contributions/saving-contribution.repository.server.ts → apps/web/src/features/goals/goals.repository.server.ts
- `getSavingContributionStateWithExecutor()` --calls--> `selectWinningSnapshots()`  [EXTRACTED]
  apps/web/src/features/contributions/saving-contribution.repository.server.ts → apps/web/src/features/goals/goals.repository.server.ts
- `GoalCompletionProps` --references--> `GoalCompletionContext`  [EXTRACTED]
  apps/web/src/features/goals/GoalCompletion.tsx → apps/web/src/features/goals/goal-completion.ts

## Import Cycles
- None detected.

## Communities (20 total, 2 thin omitted)

### Community 0 - "goals.server.ts"
Cohesion: 0.06
Nodes (75): allocationPlanEntries, AllocationPlanEntry, AllocationPlanSnapshot, allocationPlanSnapshots, Expense, ExpenseSource, FinancialGoal, financialGoals (+67 more)

### Community 1 - "goals.functions.test.ts"
Cohesion: 0.08
Nodes (30): GoalLifecycleContext, confirmAllocationChange, confirmGoalCreation, confirmGoalEdit, confirmGoalLifecycle, getAllocationChangeContext, getGoalCreationContext, getGoalEditContext (+22 more)

### Community 2 - "GoalCompletion.tsx"
Cohesion: 0.09
Nodes (29): GoalCompletionContext, GoalCompletionPreviewResult, ConfirmGoalCompletionInput, confirmGoalCompletionSchema, GoalCompletionPreviewInput, goalCompletionPreviewSchema, GoalCompletionRequestInput, goalCompletionRequestSchema (+21 more)

### Community 3 - "saving-contribution.repository.server.ts"
Cohesion: 0.12
Nodes (24): expenses, expenseSources, goalCompletionWithdrawals, goalSavingsPositions, incomes, incomeSources, investmentContributionAllocations, investmentContributions (+16 more)

### Community 4 - "goal-completion.ts"
Cohesion: 0.17
Nodes (22): buildGoalCompletionContext(), buildGoalCompletionProposal(), canonicalAmount(), GoalCompletionProposal, GoalCompletionSavingsPlace, GoalCompletionState, mapGoal(), serializeGoalCompletionState() (+14 more)

### Community 5 - "savings-places.ts"
Cohesion: 0.11
Nodes (19): GoalCompletionWithdrawal, SavingContribution, SavingsPlaceTransfer, savingsPlaceTransfers, CurrencyCode, getSavingsPlaceEntries(), normalizeSavingsPlaceName(), createSavingsPlaceInRepository() (+11 more)

### Community 6 - "goal-completion.repository.server.ts"
Cohesion: 0.14
Nodes (20): confirmGoalCompletionInRepository(), createGoalCompletionPreviewToken(), getGoalCompletionState(), getGoalCompletionStateWithExecutor(), GoalCompletionStateInvalidError, StaleGoalCompletionPreviewError, completionDraft, goal (+12 more)

### Community 7 - "AllocationImpactComparison.tsx"
Cohesion: 0.16
Nodes (14): AllocationImpactBefore, AllocationImpactComparison(), AllocationImpactComparisonProps, AllocationImpactItem, formatGoalProjection(), GoalProjection, SavingContributionSummary, formatDerivedMoney() (+6 more)

### Community 8 - "goals.ts"
Cohesion: 0.14
Nodes (13): addMonthsToMonth(), ContributionAllocationSummary, GOAL_STATUS_LABELS, GoalCompletionWithdrawalSummary, GoalPriority, GoalsAppState, GoalStrategy, InvestmentAvailability (+5 more)

### Community 9 - ".fallowrc.json"
Cohesion: 0.14
Nodes (13): duplicates, minOccurrences, entry, ignorePatterns, rules, unlisted-dependencies, unresolved-imports, unused-exports (+5 more)

### Community 10 - "GoalsWorkspace.tsx"
Cohesion: 0.21
Nodes (8): GoalsFinancialSummary, GoalsWorkspace, GoalCardProps, GoalsWorkspace(), GoalsWorkspaceProps, makeFinancialSummary(), makeWorkspace(), mockInvalidate

### Community 11 - "Roadmap.tsx"
Cohesion: 0.21
Nodes (5): RoadmapMonth, projectionReason(), Roadmap(), goal, roadmap

### Community 12 - "goals.test.ts"
Cohesion: 0.22
Nodes (7): GoalFundingRow, groupGoals(), isGoalCompletionEligible(), createMockWorkspaceSource(), fundingRow(), projectWithFutureRow(), recurringIncome()

### Community 13 - "GoalWorkspaceItem"
Cohesion: 0.47
Nodes (6): GoalWorkspaceItem, RoadmapData, GoalCompletionBanner(), GoalCompletionBannerProps, Home(), HomeProps

### Community 14 - "SavingContributionActions.tsx"
Cohesion: 0.38
Nodes (5): ContributionSummary, SavingContributionActions(), SavingContributionActionsProps, invalidate, posthogCapture

### Community 15 - "roadmap.ts"
Cohesion: 0.33
Nodes (5): Expense, Income, RoadmapFinances, finances, goals

### Community 16 - "Agent skills"
Cohesion: 0.33
Nodes (5): Agent skills, Domain docs, Git behavior, Issue tracker, Triage labels

## Knowledge Gaps
- **80 isolated node(s):** `Git behavior`, `Issue tracker`, `Triage labels`, `Domain docs`, `Planning` (+75 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 120 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `GoalsWorkspaceSource` connect `goal-completion.ts` to `goals.ts`, `goals.server.ts`, `saving-contribution.repository.server.ts`, `goals.test.ts`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `GoalWorkspaceItem` connect `GoalWorkspaceItem` to `goals.functions.test.ts`, `goals.ts`, `GoalsWorkspace.tsx`, `Roadmap.tsx`, `goals.test.ts`, `roadmap.ts`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `buildGoalsWorkspace()` connect `goal-completion.ts` to `goals.ts`, `goals.server.ts`, `goals.test.ts`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `Git behavior`, `Issue tracker`, `Triage labels` to the rest of the system?**
  _80 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `goals.server.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05966386554621849 - nodes in this community are weakly interconnected._
- **Should `goals.functions.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08456659619450317 - nodes in this community are weakly interconnected._
- **Should `GoalCompletion.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08906882591093117 - nodes in this community are weakly interconnected._
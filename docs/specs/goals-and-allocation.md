# Goals and Allocation MVP

## Purpose

Give a user a reliable way to define goals, see their current trajectory, record actual progress, and change the forward plan without losing historical meaning.

User-facing copy is natural Argentine Spanish with voseo. The feature supports the loop: goals -> plan -> actual contributions -> projection -> impact -> plan adjustment.

## Scope

- Goal types: `emergency_fund`, `purchase`, `retirement`, and `other`.
- Goal lifecycle: `active`, `paused`, and `completed`.
- Goal creation, editing, listing, and detail views.
- One global planned monthly contribution.
- Allocation of that plan across active goals.
- Allocation-plan history with effective dates.
- Emergency-fund target calculation and incomplete-data behavior.
- Before/after impact previews for goal and plan changes.
- Completion flow that proposes, but does not silently apply, redistribution.
- Recalculation of progress, projected dates, and roadmap events after confirmed changes.

## Non-goals

- Live FX, user-configurable rates, or currency conversion beyond the fixed
  application-owned ARS-to-USD reference rate.
- Inflation, indexed, or dynamically valued targets.
- Mixed strategies or multiple investments per goal.
- Automatic redistribution, priority-based silent changes, or automatic plan mutation.
- Bank synchronization, account reconciliation, advanced reporting, or a full retirement model.

## Domain rules

- Recurring income and expense records are the source of monthly totals.
- Financial profiles do not duplicate approximate monthly income or expense totals.
- An emergency fund defaults to three months of recurring expenses.

### Goal model

Each goal has an id, name, type, optional fixed target amount, currency, optional desired date, priority, allocation percentage, strategy (`save` or one investment), status, and timestamps. New goals default to `active`; editing must preserve the goal id and history. The allocation percentage always represents a share of the global ARS monthly plan, including for USD goals.

Priority is qualitative only. It must never change allocation without an explicit user action.

### Emergency fund

- Default `emergencyFundMonths` is 3.
- When monthly expenses are known, `targetAmount = monthlyExpenses * emergencyFundMonths`.
- When expenses are unknown, target and completion date are unavailable; show `Fecha por calcular` and prompt for major expenses.
- Never infer an emergency-fund target from income, contribution, or a guessed expense value.

### Lifecycle

- Only `active` goals receive future allocation percentages and projected contributions.
- `paused` goals remain visible with history and current value but receive no future contribution until resumed through an explicit plan change.
- Completing a goal preserves its contributions, progress, and allocation history. It removes the goal from the active allocation plan, but its released percentage is not silently assigned elsewhere.
- A completed goal flow must propose a new valid allocation and require confirmation before persisting it.

### Allocation invariant

- Every persisted active allocation plan must satisfy `sum(active allocations) === 100`.
- The editor may temporarily show totals below or above 100 while the user edits.
- Save/confirm is disabled until the total is exactly 100 and all percentages are in `0..100`.
- Adding, pausing, resuming, or completing a goal must show the proposed redistribution before persistence.
- Future planned contributions use the current allocation; past contributions never change.
- Contribution allocation amounts use decimal-safe arithmetic, round to currency precision, and assign any remainder deterministically so amounts sum exactly to the contribution.
- Actual savings distribute only to active goals in the saving action's currency. Within that currency channel, use compatible goals' global allocation percentages proportionally so the whole recorded amount is assigned. An ARS saving never credits USD goals, and a USD saving never credits ARS goals.

### Allocation history

Persist an allocation-plan snapshot whenever the plan changes:

```ts
interface AllocationPlanSnapshot {
  id: string;
  effectiveFrom: string;
  allocations: Array<{ goalId: string; percent: number }>;
}
```

Historical contribution records store their own allocation snapshot. The UI may show plan-change events and effective dates, but must not recalculate historical contributions from today’s percentages.

### Planned contribution

There is one global planned monthly contribution in ARS. It represents intent, not actual savings. Future monthly contribution for an active ARS goal is `plannedMonthlyContribution * allocationPercent`. For a USD goal, convert that allocated ARS amount with the fixed ARS-per-USD reference rate. The reference-rate estimate does not create a monthly spendable balance.

Changing the monthly plan is a previewable trajectory change. Do not persist it, alter actual progress, or silently change allocations before confirmation.

### Impact preview

For adding/editing goals, changing allocations, changing the monthly plan, pausing/resuming goals, and redistributing after completion:

1. Build a proposed state without mutating persisted state.
2. Project before and after for affected goals.
3. Show `ANTES` and `CON ESTE CAMBIO`, including projected date deltas where calculable.
4. Require explicit confirmation to persist the atomic change.

If a date is unavailable, show the reason (`Fecha por calcular`, `Proyección pendiente`, or `No alcanzado dentro del horizonte`) rather than a fabricated delta.

## Screens/flows

### Goals listing: `/app/goals`

- Header: `Objetivos` and `+ Nuevo objetivo`.
- List active goals first, followed by paused and completed goals when present.
- Each card shows name, type, progress, current/target when calculable, allocation, projected date, and ahead/behind status when a desired date exists.
- Empty state explains the value of creating the first goal and provides the CTA.
- Selecting a card opens goal detail: right `Sheet` on desktop, `Drawer` or detail route on mobile.

### Create goal

1. Choose type; emergency fund is available as the default onboarding goal.
2. Enter name, fixed target/currency when applicable, optional desired date, priority, strategy, and proposed allocation. For a USD goal, explain that the allocation is its share of the global ARS plan and show its approximate monthly USD equivalent using the fixed reference rate; do not ask for an independent USD monthly contribution.
3. Validate the goal and allocation.
4. Show proposed redistribution and impact preview.
5. Confirm once; persist goal and allocation snapshot atomically.
6. Refresh projections and roadmap; show contextual success feedback.

The form must explain that indexed targets and live FX are not supported in this MVP. USD projections use the fixed ARS-to-USD reference rate.

### Goal detail/edit

Show current value and progress, target, allocation, projected date, desired date, strategy, status, associated savings/investments, and a compact goal trajectory. Editing any projection-affecting field uses the impact-preview flow. Status actions are explicit: pause, resume, or complete.

### Allocation editor

Expose all active goals, percentages, and total. Allow temporary invalid totals during editing, but block persistence until 100%. On confirm, create a new allocation snapshot, record a roadmap plan-change event, and recalculate future projections only.

### Planned contribution change

Show current monthly plan, accept a positive new amount, calculate before/after goal dates, and confirm the change. If estimated margin is lower than the new plan, show a neutral warning; do not alter the plan automatically.

### Completed-goal redistribution

When a goal completes, show the released percentage and preserve the completed goal as history. Propose redistribution among remaining active goals, preview its impact, and require confirmation. Until confirmed, the remaining active plan is visibly incomplete rather than silently normalized.

## States

Every screen and flow defines:

- **Loading:** skeleton cards and controls; no misleading zero values.
- **Empty:** actionable explanation and primary CTA.
- **Incomplete data:** distinguish from error. Emergency funds with unknown expenses show `Fecha por calcular`; unsupported currencies outside the ARS-to-USD rule show `Proyección pendiente`.
- **Editing:** local draft may have invalid allocation totals; clearly show the remaining amount to reach 100%.
- **Preview:** before/after values, deltas, and affected goals; no persistence has occurred.
- **Validation error:** inline labels and messages; preserve entered values.
- **Persistence error:** preserve the draft and offer retry; do not partially apply goal and plan changes.
- **Success:** refresh detail/listing/projections/roadmap and show a subtle contextual toast.
- **Projection horizon:** show `No alcanzado dentro del horizonte` after 720 months, never a fake date.

## Acceptance criteria

- A user can create, list, open, edit, pause, resume, and complete a goal on mobile and desktop.
- Emergency fund defaults to three months; known expenses calculate the target, while unknown expenses never produce a guessed target or date.
- No persisted active allocation plan can total anything other than 100%.
- Adding, editing, pausing, resuming, or completing a goal cannot silently redistribute allocations.
- Every confirmed plan change creates an effective-dated allocation snapshot and a roadmap event.
- Historical contributions retain their original goal percentages and amounts after later plan changes.
- Changing allocation or monthly contribution shows a non-mutating before/after preview before confirmation.
- Completed-goal redistribution shows the released percentage and requires confirmation before applying a replacement allocation.
- Confirmed changes update future projections and goal dates without changing actual contribution history.
- USD goal projections use the fixed ARS-to-USD reference rate from the global ARS plan; unsupported currency relationships produce `Proyección pendiente`.
- Targets are fixed amounts only; indexed/inflation behavior is not offered.
- Forms have visible labels, inline validation, keyboard access, focus management for `Drawer`/`Sheet`, and textual equivalents for progress and status.
- User-facing copy follows the PRD’s Argentine Spanish requirement.

## Dependencies

- [Foundations and financial model](./foundations-and-financial-model.md): React shell, shadcn primitives, responsive navigation, `Drawer`/`Sheet`, Clerk-authenticated server actions, formatting utilities, and projection boundaries.
- [NORTE product requirements](../NORTE-PRD-development-spec.md): product principles, scope boundaries, and deferred decisions.
- Goal and profile/plan server actions; preview operations must not mutate state.
- Pure projection functions for goal progress, completion dates, allocation deltas, and horizon handling.
- Shared formatting for money, percentages, month/year dates, and month deltas.

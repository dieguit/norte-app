# Plan Deviations and Recommendations

## Purpose

Define the frontend MVP for explaining a month-close difference between the user's planned and actual contribution, showing its projected effect, and offering deterministic ways to adjust the trajectory.

The experience must answer: **qué cambió, cómo afecta mis objetivos y qué puedo hacer ahora**. Copy is neutral Argentine Spanish and must not imply blame or provide AI advice.

## Scope

- At month close, compare the global planned monthly contribution with explicit actual contributions (`saving` and `investment`) recorded for that month.
- Show the plan amount, actual amount, difference, affected projected goal dates, and available actions.
- Generate recommendations only from these four types:
  - `catch_up`: add a defined extra amount for defined future months.
  - `change_monthly_plan`: replace the global planned monthly contribution.
  - `reallocate_goals`: change active-goal allocation percentages.
  - `use_extra_income`: optionally direct a recorded extraordinary income toward a goal.
- Preview every trajectory-changing action as `Antes` versus `Con este cambio` before persistence.
- Apply a confirmed recommendation, recalculate projections, and add the corresponding roadmap event.
- Support mobile bottom sheets and desktop right panels using the existing responsive patterns.

## Non-goals

- No AI advisor, free-form advice, chat, or generated recommendation types.
- No automatic saving, investment, allocation, or plan mutation.
- No automatic assumption that estimated margin was saved.
- No live or user-configurable FX, conversion beyond the fixed ARS-to-USD
  reference rate, inflation model, retirement model, bank sync, or transaction
  import.
- No final decision on the deviation threshold; keep it configurable/deferred as described below.
- No recommendation history UI beyond the roadmap event created after application.

## Domain rules

### Month-close deviation

- `plannedAmount` is the current global planned monthly contribution for the closed month.
- `actualAmount` is the ARS value of explicit contributions whose `occurredAt` falls in that month: direct ARS contributions use their amount; USD savings and investments use their recorded ARS spent. Estimated margin is never included.
- `shortfall = plannedAmount - actualAmount`.
- A deviation exists for this MVP when `actualAmount < plannedAmount` and the difference changes at least one calculable projected goal date. A positive difference must not be presented as a shortfall.
- If a goal has unknown expenses, an unsupported currency relationship, or another incomplete-data condition, show the incomplete state and do not invent a date or delta.
- Historical contribution allocations remain the allocation snapshot recorded on each contribution. Current allocations apply only to future projections.
- The month-close result is explanatory until the user confirms an action. Viewing it, opening a recommendation, or requesting a preview does not mutate state.

### Deterministic recommendations

- Recommendations are produced by pure rules from the deviation, current plan, goals, projections, contributions, and eligible extraordinary income.
- Each recommendation has a stable type, human-readable title/body, explicit proposed change, and expected impact. The UI renders these values; it does not invent advice.
- `catch_up` must specify the extra amount and exact future months. It adds planned future contributions only for those months and does not rewrite the closed month's actual contribution.
- `change_monthly_plan` must specify the replacement global planned contribution. It changes future projection inputs only.
- `reallocate_goals` must specify the complete active-goal allocation plan. The plan must total exactly 100% before apply; priority does not silently change allocation.
- `use_extra_income` must reference an eligible recorded one-time income and a target goal. It is optional and must state whether the income is allocated as a future contribution; it cannot fabricate income.
- If no deterministic rule produces an eligible action, show the deviation and `Mantener así`; do not fill the gap with generic advice.

### Deferred threshold decision

The trigger threshold remains a product decision. Do not hard-code a percentage, amount, or repeated-pattern threshold in this MVP. Implement the detector behind a single configuration/rule boundary so the eventual policy can choose among any shortfall, percentage, amount, or repeated pattern. Until decided, the PRD's safe baseline is: month close plus a material projected goal-date change.

### Preview and application semantics

- A preview calculates `PlanImpactPreview` from an immutable current snapshot plus a proposed change:
  - `before`: current `GoalProjection[]`;
  - `after`: projections with the proposed change applied in memory;
  - `deltas`: per-goal date/status differences.
- Preview endpoints/repository methods are read-only. They must not create contributions, update the plan, update allocations, consume income, or create roadmap events.
- The UI must show the affected goal, current projected date, proposed projected date, and a plain-language delta. Use approximate month/year precision only.
- Confirm applies the exact proposal the user previewed. The apply operation persists the relevant plan/allocation/contribution change atomically, then recalculates projections and roadmap events.
- Cancel, close, or navigate away discards the proposal and leaves all persisted state unchanged.
- If current data changed between preview and apply, reject or refresh the stale proposal rather than applying against a different snapshot.

## Screens/flows

### Month-close entry

1. Home or Finances exposes the closed-month status when a deviation is eligible.
2. The detail panel/sheet says, for example, `Este mes aportaste menos de lo planificado`.
3. Show `Planeabas aportar`, `Aportaste`, and the shortfall.
4. Show the neutral trajectory consequence, such as `Tu colchón se proyecta aproximadamente 3 semanas más tarde`.
5. Offer deterministic recommendation cards and `Mantener así`.

### Recommendation preview

1. Selecting a trajectory-changing recommendation opens a preview state.
2. Show `ANTES` and `CON ESTE CAMBIO` using `BeforeAfterGoalRow` for each affected goal.
3. Explain the proposed change in concrete values and months.
4. Provide `Confirmar cambio` and `Volver`.
5. Do not persist on selection or preview calculation.

### Apply and return

1. On confirmation, disable duplicate submission and apply the proposal.
2. Refresh Home status, goal projections, contribution summary, and roadmap.
3. Add a `recommendation_applied` roadmap event describing the applied change.
4. Show contextual success feedback, for example `Ajustaste tu plan`.
5. On persistence failure, preserve the proposed values, show an actionable error, and allow retry.

## States

- **Loading:** skeleton for month-close status, recommendation cards, and preview rows; do not show stale recommendation actions as current.
- **Empty/no deviation:** no eligible deviation for the closed month; show the normal monthly status without recommendations.
- **Incomplete-data:** show why a date or impact cannot be calculated, such as `Proyección pendiente` or `Fecha por calcular`; this is not an error.
- **Preview loading:** retain the selected proposal and show a skeleton while recalculating.
- **Preview error:** keep the form/panel open, explain that the impact could not be calculated, and allow retry; no state is changed.
- **Apply loading:** disable confirmation and prevent duplicate application.
- **Success:** refresh contextual data and show a subtle toast or inline confirmation.
- **Persistence error:** preserve the proposal and allow retry without silently reverting unrelated current data.
- **Stale preview:** require a fresh preview when the underlying plan, goals, contributions, income, or projections changed.

## Acceptance criteria

- At month close, the UI compares planned contribution with explicit actual contributions for that month.
- Estimated margin and unrecorded leftover money never count as actual contribution.
- A shortfall view shows plan, actual, difference, and a goal-date consequence when calculable.
- Only `catch_up`, `change_monthly_plan`, `reallocate_goals`, and `use_extra_income` can be rendered as recommendations.
- Recommendation output is deterministic for the same input snapshot and never presents itself as AI advice.
- Every trajectory-changing recommendation provides a before/after preview before confirmation.
- Preview calculation and cancellation leave persisted financial state unchanged.
- Confirming applies only the selected proposal, preserves historical allocation snapshots, recalculates projections, and adds a roadmap event.
- Allocation proposals cannot be applied unless active allocations sum to exactly 100%.
- A changed underlying snapshot cannot accept a stale preview without refreshing it.
- No recommendation is shown when the required projection is unavailable or the deferred threshold/materiality rule is not satisfied.
- Loading, empty, incomplete-data, error, success, apply-loading, and stale-preview states are accessible on mobile and desktop.
- User-facing copy uses neutral Argentine Spanish and voseo; no judgmental language or conversational assistant framing appears.

## Dependencies

- [Foundations](./foundations-and-financial-model.md): app shell, Clerk-authenticated server actions, formatting, responsive Drawer/Sheet, and shared UI primitives.
- [Goals](./goals-and-allocation.md): goal targets, priorities, strategies, allocations, statuses, and projected dates.
- [Contributions](./contributions-and-investments.md): explicit saving/investment actions, month filtering, and historical allocation snapshots.
- [Home and roadmap](./home-and-financial-roadmap.md): `contribution_deviation` and `recommendation_applied` events plus actual/today/projected semantics.
- Projection engine: pure monthly calculations, completion-date horizon, incomplete-data handling, and `PlanImpactPreview`.
- Server-action boundary: read-only preview operations and atomic apply operations;
  actions derive the user from Clerk and scope every query to that user.

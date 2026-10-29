# Agent feature catalog

Every user-facing operation in the web app (plus chat-only features), mapped to the Norte agent tool that performs it. Goal: the agent can do everything the app does from a short user instruction.

Status: ✅ covered · ⚠️ covered with gaps/divergence · ❌ no tool · — not applicable to chat.

Source of truth: web routes `apps/web/src/routes/app/**`, web features `apps/web/src/features/**`, API services `apps/api/src/<feature>/*.service.ts`, agent tools `apps/api/src/mastra/tools/*.ts`, domains `apps/api/src/mastra/agents/domains.ts`.

## 1. Home

| Operation | Web (route → API) | Agent tool | Status | Notes |
|---|---|---|---|---|
| View roadmap (goal projections vs desired date, completion eligibility, recent months) | `/app` → `GET /home` → `HomeService.getHome` | `getRoadmap` (compact digest) | ✅ | Digest instead of raw roadmap (~2.4 KB on demo user). |
| View current-month targets (saving/investment × ARS/USD: contributed vs target, missing) | derived client-side in `home-view.ts:50-105` | `getRoadmap.monthTargets` | ✅ | Ported server-side in the tool. |
| View previous-month shortfalls | `GET /me/profile` (`previousMonthShortfalls`) | `getRoadmap.previousMonth` | ✅ | `ProfileService.getPreviousMonthShortfalls`. |
| Catch up a previous-month shortfall / forgotten saving | `POST /contributions/saving` with `catchUpMonth` | `previewSaving({ catchUpPreviousMonth: true })` → confirm | ✅ | Tool computes the month; older months unsupported. |
| Record saving / investment (ARS/USD, place, ARS spent, rate) | context → preview → confirm `/contributions/saving*` | `previewSaving` → `confirmPendingAction` | ✅ | No context call needed: single place auto-resolved, error asks to pick when several. |
| Complete a reached goal (withdrawals by place, redistribute plan) | `/goals/:id/completion*` | `previewGoalCompletion({ goalId })` → confirm | ✅ | Defaults: single place covering target, proportional redistribution. Eligible only active `save` goals of type `purchase`/`other` with target reached. |

## 2. Goals (Objetivos)

All goal previews derive the allocation in the tool from one shared helper (`planAllocations` in `goal-tools.ts`, built on `rebalanceAllocationEntries`); no prior context call needed.

| Operation | Web (route → API) | Agent tool | Status | Notes |
|---|---|---|---|---|
| List goals (active/paused/completed, progress, projection, share) | `/app/goals` → `GET /goals` | `listGoals` | ✅ | Adds current `share` %. |
| Goal detail: contribution history, completion withdrawals | from `GET /goals` payload | `listGoals({ goalId })` | ✅ | Latest 20 contributions with ids. |
| Create goal | `GET /goals/plan` → `POST /goals/preview` → `POST /goals` | `previewGoalCreation` → confirm | ✅ | `desiredMonth` optional (matches app). Default: new goal gets equal share, others rebalanced proportionally; `share` overrides. Emergency fund: name fixed, USD, amount = 3 × monthly expenses at 1500 ARS/USD; only one active. |
| Edit goal (name, amount, desired month, priority, investment assumptions) | `/goals/:id/preview` → `PATCH /goals/:id` | `previewGoalEdit({ goalId, changes })` → confirm | ✅ | Tool merges partial changes over the current draft. Type/currency/strategy immutable; completed goals not editable. |
| Change monthly dedication % and split between goals | `/goals/allocation/preview` → `PUT /goals/allocation` | `previewAllocationChange({ dedicationPercentage?, share? \| allocations? })` → confirm | ✅ | `share` rebalances others proportionally; omitted fields keep current values. |
| Pause goal | `/goals/:id/lifecycle*` | `previewGoalLifecycle({ goalId, lifecycle: 'pause' })` → confirm | ✅ | Share redistributed proportionally (same as web). Last active goal paused → plan commitment cleared. |
| Resume goal | same | same with `resume`, optional `share` | ✅ | Default equal share (web starts at 0 and makes the user pick). Doesn't restore a cleared commitment. |
| Complete goal | see Home | see Home | ✅ | |
| Correct a contribution (amount, place, USD fields) | `/contributions/saving/:id/preview` → `PATCH` | `listGoals({ goalId })` → `previewSavingEdit` → confirm | ✅ | Full draft required (no cheap getter for partial merge). Keeps original goal split; completed-goal contributions locked. |
| Delete a contribution | `DELETE /contributions/saving/:id` | `listGoals({ goalId })` → `previewSavingDelete` → confirm | ✅ | Blocked for completed goals. |
| Delete / archive goal | — | — | — | Doesn't exist; prompt says so and offers pausing. |
| Change priority | — (not in UI; kept on edit) | `previewGoalEdit` | ✅ | Allowed in chat. |

Enums: type `emergency_fund|purchase|retirement|other`; status `active|paused|completed`; strategy `save|invest`; priority `high|medium|low`; availability `available_now|available_from|long_term`. Transitions: active↔paused; active→completed (eligible only); completed is terminal.

## 3. Finances

All write paths share one stage/record/undo helper in `finance-tools.ts`. Categories are preloaded per turn, so no lookup call before writing.

| Operation | Web (route → API) | Agent tool | Status | Notes |
|---|---|---|---|---|
| Month summary (income, expenses, balance, dedication), any month | `/app/finances` → `GET /finances?month=` | `getFinancesSummary({ month? })` | ✅ | Default current Argentina month. |
| List categories (fixed + custom) | in workspace payload | preloaded per turn; `listCategories` fallback | ✅ | |
| Add expense(s) | `POST /expenses` | `recordExpenses({ items })` | ✅ | 1..100 items, one transaction (`ExpensesService.createMany`), one undo for the batch. Any recurring item stages the whole batch. `uncategorized` only allowed in batches (2+). Chat default one-time; web default recurring (kept: chat entries are mostly one-off). |
| Bulk from list / ticket / card statement (image, PDF) | — | `recordExpenses` | ✅ | Chat-only. Sending it is the instruction: record directly, no "¿los agrego?". Statement: one row per charge incl. taxes/fees/installments, skip previous balance/payments/credits, all in statement closing month. Ticket: one row with the total. |
| Edit expense | `PATCH /expenses/:id` | `updateExpense({ id, changes, effectiveMonth? })` → confirm | ✅ | Partial changes merged over the record. Recurring split at effective month. |
| Delete expense | `DELETE /expenses/:id` | `deleteExpense` → confirm | ✅ | Recurring → ended at month; else physical delete. |
| Add income | `POST /incomes` | `recordIncome` | ✅ | Same helper as expenses. |
| Edit income | `PATCH /incomes/:id` | `updateIncome({ id, changes })` → confirm | ⚠️ | Partial merge. Overwrites the row (no history split), web and chat alike. Product bug. |
| Delete income | `DELETE /incomes/:id` | `deleteIncome` → confirm | ⚠️ | Physical delete, no month cutoff. Product bug. |
| Create custom category | inline in entry create/update | `recordExpenses`/`recordIncome` with custom name | ✅ | Only with explicit user approval. No rename/delete anywhere; prompt says so. |
| View savings places, balances, movements | `/app/finances/savings` | `getFinancesSummary` | ✅ | |
| Create / rename / delete savings place | `POST/PATCH/DELETE /savings-places` | `manageSavingsPlace({ action, placeId?, name? })` | ✅ | Direct write (low risk). Delete blocked when it has movements. |
| Transfer between savings places | `POST /savings-places/transfers` | `transferSavings` → confirm | ✅ | Same currency, ≤ origin balance, no FX. |

## 4. User / settings

| Operation | Web | Agent tool | Status | Notes |
|---|---|---|---|---|
| View notification settings | API only (`GET /me/notifications`) | `getNotificationSettings` | ✅ | Chat is the only UI. One type: `day_close_checkin`. Only for "is it on / what time"; not called before updates. |
| Enable/disable/reschedule daily check-in | API only (`PATCH /me/notifications/:type`) | `updateNotificationSetting` | ✅ | One call, direct write, returns resulting setting. Times `HH:00`/`HH:30`, Argentina time; other times → propose nearest, no write. Setting a time implies `enabled: true`. |
| Link chat account | `/link/whatsapp?token=` | — | — | Web-only by design. Prompt states it (with all rows below) and links to the app. |
| Account/sign out (Clerk) | Clerk widget | — | — | Web-only. |
| Edit financial profile | none (onboarding only) | — | — | Not in app. |

## 5. Chat-only features

| Operation | Agent tool | Notes |
|---|---|---|
| Today's summary (incomes, expenses, contributions) | `getDailySummary` | Argentina day, by `createdAt`. Whole month → `getFinancesSummary`. |
| Reply to daily check-in | channel handler + finance tools | Any reply marks it answered. Router loads notifications + finances when the reply has movements. |
| Undo last write | `undoLastWrite` | Last one-time expense batch or income, 10 min. |
| Tickets / statements (image, PDF) | `recordExpenses`/`recordIncome` | Attachment = instruction → record directly; ask only if unreadable or not financial. |
| Advice / education / "how does Norte work" | — (sources inlined in the advice skill) | Curated sources (~6 KB) inlined, so no `readSource` step; cite the title; general knowledge never attributed to Norte. Router adds finances/goals when the answer needs user data. Not in web app. |
| Relative dates | — (date in context) | Today/month (Argentina) injected per step by the domain router; `getCurrentDate` tool removed (saved one ~3–4 s step). |

## 6. Gaps to close

Missing tools (agent can't do what the app does):
1. ~~Savings places: create, rename, delete, transfer~~ (done).
2. ~~Contribution history with IDs~~ (done: `listGoals({ goalId })`).
3. ~~Previous-month shortfalls + catch-up contribution~~ (done).
4. ~~Finance summary for an arbitrary month~~ (done).

Divergences to decide:
5. ~~Goal `desiredMonth` required by tool~~ (done: optional).
6. Goal priority editable in chat, not in app (kept: allowed).
7. Recurring/one-time default (web: recurring; chat: one-time) (kept).
8. ~~Computed month targets (Home) not returned by any tool~~ (done: `getRoadmap.monthTargets`).

Product bugs (app and chat):
9. Income update/delete overwrites history (expenses preserve it).

## 7. Prompt implications

- Per-domain skill text should state, per operation: the tool chain, which fields have safe defaults (don't ask), and which are truly required (ask once).
- Shared rules already in base prompt: one pending action per user (sequential batch writes), stale previews need re-approval, direct complete instruction → execute in the same turn.
- State unsupported operations explicitly (delete/archive goal, category rename/delete, profile edit) so the agent says "no se puede" instead of improvising.
- Month semantics: chat uses Argentina month; web/API defaults use UTC month. Matters at month boundaries.

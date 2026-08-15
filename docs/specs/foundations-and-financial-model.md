# Foundations and Financial Model

## Purpose

Define the frontend-MVP foundations that let NORTE represent a user's plan,
record real financial actions, and calculate a transparent trajectory toward
their goals. This document owns the shared money model, `FinancialProfile`,
Clerk authentication, server persistence boundary, calculation boundaries, and
cross-cutting UX conventions.

The implementation must preserve NORTE's central distinction:

- **Plan:** future intent, expressed as one monthly contribution and allocations.
- **Actual contribution:** an explicit saving or investment action.
- **Trajectory:** a projection derived from current state and the current plan.

## Scope

- Implement the shared TypeScript domain types and validation for money and the
  financial profile.
- Authenticate users with Clerk and persist user-owned financial data through
  TanStack server actions backed by PostgreSQL/Drizzle.
- Provide pure calculation functions for allocation, monthly cash flow, goal
  projection, completion dates, and impact previews.
- Provide shared formatting for money, percentages, dates, and month deltas.
- Establish form, responsive, accessibility, loading, empty, error, success,
  and incomplete-data conventions used by onboarding and financial features.
- Support `ARS` and `USD` as explicit currencies without inferring exchange
  rates.
- Keep feature components dependent on domain contracts rather than fixtures
  or concrete storage.

## Non-goals

- Bank/Open Banking synchronization, broker integrations, automatic imports, or
  real-time market and FX data.
- Inflation, indexed targets, taxes, fees, volatility, portfolio composition,
  or a full retirement model.
- Mixed strategies within one goal, shared accounts, advanced reporting, or
  transaction reconciliation.
- Persisting formatted values, implementing a global state library, or adding a
  general-purpose API client.

## Domain rules

### Money and currency

Use English identifiers in code and this shape as the authoritative value:

```ts
type CurrencyCode = "ARS" | "USD";

interface Money {
  amount: string; // canonical decimal, never a formatted display string
  currency: CurrencyCode;
}
```

- `amount` must be a finite decimal in canonical form. Domain calculations must
  use decimal-safe arithmetic and must not use binary floating point for money.
- Zero is valid where the field allows it; positive-only fields must reject
  zero and negative values at the validation boundary.
- `currency` is never inferred from a locale, symbol, or formatted input.
- A `Money` value is only directly added, subtracted, allocated, or projected
  with another value in the same currency.
- V1 does not convert ARS to USD or USD to ARS. If a target and its inputs do
  not share a currency, return an explicit unavailable result and render
  **Proyección pendiente**. Never invent an exchange rate.
- User input may contain Argentine separators, but it is normalized to
  `Money` before entering the domain. Invalid input remains visible in the
  form and is not silently coerced.
- Allocation rounding is deterministic: calculate with decimal arithmetic,
  round to currency precision, assign the remainder deterministically, and
  guarantee that allocation amounts sum exactly to the source amount.

### FinancialProfile

```ts
interface FinancialProfile {
  id: string;
  baseCurrency: CurrencyCode;
  approximateMonthlyIncome?: Money;
  approximateMonthlyExpenses?: Money;
  expensesKnowledge: "known" | "unknown";
  plannedMonthlyContribution: Money;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}
```

- All profile money values use `baseCurrency`.
- Onboarding values are approximate planning inputs, not recorded income or
  expenses. Later records are the source for more accurate monthly cash flow.
- `plannedMonthlyContribution` is required and positive. It is intent, not
  actual progress.
- `approximateMonthlyIncome` and known expenses are non-negative. Expenses are
  absent or explicitly unknown when `expensesKnowledge` is `"unknown"`.
- A new profile starts with the emergency-fund goal selected by default.
- With unknown expenses, the emergency-fund target and completion date are
  unavailable. The UI must show **Fecha por calcular**, not a guessed target.
- Profile updates are persisted as one operation from the feature's point of
  view; the repository implementation owns its storage mechanics.

### Goals, plans, and actuals

Use the PRD's `Goal`, `Contribution`, `Investment`, `Income`, and `Expense`
shapes as the frontend domain contracts. The following invariants are
mandatory:

- Every active goal has an allocation percentage; persisted active allocations
  sum exactly to `100`.
- Temporary invalid totals are allowed only while editing. Save is disabled or
  rejected until the total is exactly `100`.
- Priority never silently changes allocation.
- Historical contribution allocations are stored as snapshots. Past actions
  never change when today's allocation changes. A user may explicitly correct
  or delete an action; its correction updates its own snapshot atomically.
- A saving contribution applies the current allocation snapshot.
- New-money investment contributions go directly to the selected investment's
  goal and do not apply global allocation again.
- An existing-savings investment is a same-goal transfer: saved value falls,
  investment value rises, total assets stay unchanged, and goal progress does
  not increase solely because of the transfer.
- Goal progress is current saved value assigned to the goal plus current value
  of its assigned investments, divided by the target. Display progress is
  clamped to `0..100%`.
- A completed goal preserves history, leaves future allocations unchanged, and
  requires an explicit redistribution proposal and confirmation.

### Calculation boundaries

Calculations live in pure domain functions independent of React, repositories,
and formatting. They accept stable domain inputs and return explicit states,
not UI strings.

Required boundaries:

- `calculateAllocationAmounts(money, allocations)`
- `deriveMonthlyCashFlow(incomes, expenses, month)`
- `projectGoals(input)`
- `calculatePlanImpact(beforeInput, afterInput)`
- `buildRoadmapEvents(projection, actuals)`

Rules for the functions:

- `estimatedMargin = totalIncome - totalExpenses`; it is not actual savings.
- Future saving contribution is `plannedMonthlyContribution × allocationPercent`.
- Investment projection uses the PRD monthly-rate formula and is always labeled
  as an estimate, never a guarantee.
- Completion dates have month-level precision only and must stop at 720 months
  (60 years). Return `not_reached_within_horizon` when no date is reached.
- Recalculate after a persisted goal, profile, income, expense, investment, or
  contribution change. Do not run a multi-decade projection on every keystroke.
- Impact previews calculate before and after without mutating persisted state.

## Authentication and persistence boundary

Financial routes require a Clerk session. Screens call typed TanStack server
actions and must not import the database client, `localStorage`, mock fixtures,
or fetch calls directly. Each server action derives the Clerk user ID from the
server-side session; it never accepts a user ID from the browser.

- Clerk provides Google and email sign-in, verification, and account recovery.
  NORTE does not implement password, recovery, or account-management flows.
- Unauthenticated `/app` visits redirect to Clerk sign-in and preserve the
  requested path. After authentication, `/app` renders financial onboarding
  when no `FinancialProfile` exists; otherwise it renders Home.
- Every financial row is owned by its Clerk user ID. Reads and mutations scope
  queries to that ID before returning or changing data.
- Server-action inputs are domain-safe values, not formatted strings. Actions
  return domain entities or an explicit `null`, never component state or
  presentational copy.
- Preview operations belong to pure calculation services and never persist.
- Actions expose persistence failures without discarding entered form values.
  Cross-entity writes that appear atomic to the user are one database
  transaction or server operation.

## Shared UX/accessibility/formatting requirements

- User-facing copy is natural Argentine Spanish with voseo. Code, types,
  repository names, and analytics event names remain English.
- Use visible labels, helper text where needed, inline validation, associated
  error messages, and numeric mobile keyboards for money inputs.
- Keep invalid input in the control so the user can correct it. Normalize only
  after validation succeeds.
- Use `Intl.NumberFormat("es-AR")` and `Intl.DateTimeFormat("es-AR")` behind
  shared utilities such as `formatMoney`, `formatCompactMoney`,
  `formatPercent`, `formatMonthYear`, `formatApproximateYear`, and
  `formatMonthDelta`. Feature components must not duplicate formatting logic.
- Display money with its currency context; do not use a bare `$` when ARS/USD
  could be confused. Never expose the canonical decimal string as UI copy.
- Render app shell and navigation before financial data resolves. Use skeletons
  for loading and contextual, non-blocking toast feedback for success.
- Every feature defines loading, empty, error, success, and incomplete-data
  states. Incomplete data is not an error; explain what is missing and offer a
  next action, for example **Todavía necesitamos conocer tus gastos para
  calcular esta fecha.**
- On mobile, use persistent bottom navigation, large touch targets, a left
  timeline rail, and `Drawer` for short contextual details. Avoid horizontal
  scrolling except an optional compact goal carousel.
- On desktop, use persistent navigation, a centered content area, dominant
  roadmap space, and `Sheet` for contextual details. Do not merely stretch the
  mobile layout.
- Use semantic controls, keyboard navigation, visible focus, sufficient
  contrast, accessible icon labels, and focus management for `Drawer`/`Sheet`.
- Roadmap status and progress must have text or structural equivalents and must
  not depend on color alone. Respect `prefers-reduced-motion`.

## Data/privacy/performance

- Do not log raw financial payloads or put unsanitized amounts in error
  breadcrumbs.
- Do not place sensitive financial values in URLs. Avoid financial amounts in
  analytics unless explicitly approved.
- Client-side checks do not replace Clerk-authenticated server-side ownership
  checks.
- Use stable domain inputs for projection refreshes. Trigger impact previews
  after valid form changes, not every money-input character.
- Avoid rerendering the whole app during money entry. Cache or memoize
  projection results at the feature/domain boundary when inputs are unchanged.
- Do not virtualize the roadmap until measured event volume requires it.

Analytics convention:

- Track product actions such as `onboarding_started`,
  `onboarding_completed`, `goal_created`, `allocation_previewed`,
  `saving_recorded`, `investment_recorded`, and `monthly_plan_changed`.
- Events may include coarse context such as entity type or result state, but
  not raw amounts, balances, free-text financial descriptions, or full domain
  payloads.
- Emit success events only after the repository operation succeeds.

## Acceptance criteria

- A new user can complete onboarding with an emergency-fund goal, approximate
  income, either known expenses or **No sé todavía**, and a positive planned
  contribution, then reach Home.
- Unknown expenses produce no guessed emergency-fund target or date and show an
  incomplete-data explanation.
- A saving action previews deterministic allocations, persists a historical
  allocation snapshot, updates goal progress, and refreshes projections and
  roadmap state.
- Correcting or deleting a saving/investment action atomically updates its
  snapshot, balances, projections, and roadmap state without applying the
  current Plan to that historical action.
- A new-money investment is assigned directly to its investment goal; an
  existing-savings transfer is same-goal only and does not double-count wealth.
- Adding or editing goals and allocations cannot persist an active plan whose
  allocations do not sum to `100`; trajectory-changing changes show a
  before/after impact preview before persistence.
- Same-currency projections calculate with decimal-safe arithmetic, month-level
  dates, and a 60-year safety horizon. Cross-currency projections return an
  explicit unavailable state and render **Proyección pendiente**.
- Monthly cash flow distinguishes estimated margin from actual contributions and
  warns neutrally when the plan exceeds estimated margin.
- Forms preserve user input on validation or persistence errors, and every
  affected screen has loading, empty, error, success, and incomplete states.
- Mobile and desktop layouts meet the responsive and focus-management rules;
  roadmap meaning and progress remain understandable without color.
- Unit tests cover allocation invariants and rounding, profile validation,
  unknown expenses, monthly cash flow, projection horizon, completion dates,
  transfer behavior, impact previews, and actual-vs-planned semantics.

## Dependencies

- React and TypeScript.
- Existing project routing and state patterns; do not add a global state library
  without a demonstrated requirement.
- Clerk for customer authentication and server-side user identity.
- PostgreSQL/Drizzle for durable financial records accessed through TanStack
  server actions.
- Existing shadcn/ui and design tokens, including `Button`, `Card`, `Field`,
  `Input`, `Select`, `Progress`, `Skeleton`, `Toast`, `Drawer`, and `Sheet` as
  applicable.
- React Hook Form and Zod only if already installed or required by the existing
  project conventions for non-trivial forms.
- A decimal-safe arithmetic implementation already approved by the project;
  do not use floating-point arithmetic for authoritative money calculations.
- The existing admin-only hard-coded session is not customer authentication and
  must not be reused for financial accounts.

# Home and Financial Roadmap

## Purpose

Define the frontend MVP contract for the established-user Home at `/` and its
primary surface, `Tu hoja de ruta`. Home must answer, within seconds, whether
the user's recorded actions and current plan are moving their goals forward.

This is a composition contract. Reuse Foundations and the existing feature
contracts for application shell, formatting, repositories, goals, finances,
contributions, projections, recommendations, and primitives. Do not duplicate
their domain rules here.

## Scope

### Home layout

For an established user, render this order without interposing dashboards,
charts, or transaction feeds:

1. Compact monthly status.
2. Financial roadmap.
3. Compact goal summary with `Tus objetivos` and `Ver todos`.
4. Compact contribution allocation with `Próximos aportes` and `Ajustar distribución`.

The monthly status stays short enough for the roadmap to begin near the top of
the first viewport. It includes the current month, plan status, actual versus
planned contribution, and `Registrar aporte`, which opens the existing record
action flow.

### Financial roadmap

Build `FinancialRoadmap` from the projection result and actual domain records,
not from presentation-specific mock data. The roadmap is a unified timeline of
past actions, today, future cash-flow changes, projected milestones, goal
completion, and plan changes.

The event inventory is the existing `RoadmapEventType` contract:

- `income_summary`, `expense_summary`
- `installment_status`, `installment_end`
- `saving_contribution`, `investment_contribution`
- `one_time_income`, `one_time_expense`
- `goal_progress_milestone`, `goal_completed`, `goal_added`
- `allocation_changed`, `monthly_plan_changed`, `contribution_deviation`
- `recommendation_applied`, `available_margin_changed`
- `investment_projection`, `long_term_goal`

Each event preserves its `id`, `type`, `temporalStatus`, `importance`, `date`,
copy, optional amount, related goal/investment, and metadata. Event construction,
projection, grouping, and temporal classification belong in the domain/service
layer; React only renders the result.

### Project result presentation

Projection and plan-change results must be presented in goal terms:

- projected completion month/year, or `Fecha por calcular`, `Proyección
  pendiente`, or an explicit horizon state;
- current progress and allocation where available;
- neutral warnings when planned contribution exceeds estimated margin;
- estimates labelled as estimates, never guarantees;
- before/after goal rows for allocation changes, monthly-plan changes, new goals,
  and trajectory-changing recommendations.

Use `PlanImpactPreview` and `BeforeAfterGoalRow`; previews do not persist state.
After a confirmed change or contribution, refresh Home, projections, and roadmap
and show contextual success feedback rather than a blocking modal.

### Responsive details

Every meaningful roadmap event is an accessible interactive control. On mobile,
tap opens a bottom `Drawer`; on desktop, click opens a contextual right `Sheet`.
The detail surface can show amount, breakdown, related goal, projection
explanation, and the related action. It must not edit the roadmap inline.

Use the existing Drawer/Sheet contract and focus-management behavior from
Foundations. A detail that cannot fit a short mobile Drawer uses the established
full detail route pattern.

## Non-goals

- New calculation, projection, allocation, or recommendation rules.
- A transaction history or full financial activity feed.
- Inline roadmap editing, drag-and-drop, timeline zoom, or arbitrary date-range
  navigation.
- Showing every recurring transaction or installment as a major event.
- Bank synchronization, automatic imports, real-time prices/FX, advanced
  reporting, portfolio analytics, or a financial-health score.
- Cross-currency inference, inflation assumptions, or day-level completion
  precision.
- A separate Home state model that diverges from repository and projection
  contracts.

## Domain rules

- **Plan and actual are distinct.** Planned contribution is intent. Only
  explicit `Ahorré` and `Invertí` actions increase actual goal progress.
- **Historical allocations are immutable snapshots.** Current percentages apply
  only to future contributions. An explicit action correction updates that
  action's snapshot and refreshes the affected roadmap state.
- **Transfers are not new wealth.** A savings-to-investment transfer preserves
  goal value and total assets and must not create a second roadmap contribution.
- **Roadmap temporal semantics are mandatory:** `actual` means recorded past
  action and uses a solid treatment; `today` is the current-state marker and
  uses a strong marker; `projected` is future state and uses lighter/dashed
  treatment. Meaning must not depend on color alone.
- **Timeline scale is adaptive, not proportional.** Show detailed nearby
  months, a prominent `HOY` marker, compressed distant periods, and approximate
  long-term years. Never imply that visual distance equals elapsed time.
- **Routine activity is grouped monthly.** Income and expense summaries are
  grouped; installments show status and one end event, not each installment.
- **Incomplete data is not an error.** Unknown expenses produce `Fecha por
  calcular` for the emergency fund and a prompt to add major expenses.
- **Cross-currency projections do not guess FX.** Show `Proyección pendiente`
  when normalization is unavailable.
- **Completion dates are month-level or approximate-year values.** If the
  projection horizon is exceeded, show the explicit not-reached state.
- **All user-facing copy is natural Argentine Spanish with voseo.** Use the
  centralized money, percentage, month, approximate-year, and delta formatters.

## Screens/flows

### Home

Route: `/app`.

- Load the app shell immediately, then resolve profile, goals, current-month
  contribution summary, projection, and roadmap data through Clerk-authenticated
  server actions.
- Render the four required sections in order.
- `Registrar aporte` enters the existing `Ahorré` flow.
- `Ver todos` links to `/app/goals`.
- Goal cards link to goal detail using the established mobile Drawer/route and
  desktop Sheet behavior.
- `Ajustar distribución` enters the existing allocation editor and impact
  preview flow.

### Roadmap event detail

- Select an event by keyboard or pointer.
- Open Drawer on mobile and Sheet on desktop.
- Show event-specific detail from the event type and metadata, with a related
  goal/action link where available.
- Close with the primitive's close action or Escape; restore focus to the event.

### Record and refresh

The Home CTA may launch `Ahorré` or the global record menu. On successful save,
the owning feature persists the action and refreshes actual progress, projection,
roadmap events, monthly status, and goal summary. The Home surface must not
reimplement contribution allocation or persistence.

### Plan-impact result

For an accepted preview, show `ANTES` and `CON ESTE CAMBIO` with each affected
goal's projected date and a concise delta such as `5 meses antes` or `~1 año más
tarde`. On cancel, leave all state unchanged. On persistence failure, preserve
the user's input and allow retry.

## States

Each Home subsection and the roadmap must define:

- **Loading:** shell remains visible; use skeletons for status, roadmap, goals,
  and allocation areas.
- **Empty:** provide a useful next action without fabricating events or goals.
- **Error:** show a recoverable message and retry; do not discard resolved data.
- **Success:** render current data and use a subtle contextual toast after a
  mutation.
- **Incomplete-data:** explain what is missing and how to add it. For example,
  `Todavía necesitamos conocer tus gastos para calcular esta fecha.`

The roadmap must also handle no events, a horizon-exceeded projection, a
pending cross-currency projection, and a current month with no actual
contribution. These are valid product states, not failures.

## Acceptance criteria

- An established-user `/` renders monthly status, roadmap, goals summary, and
  contribution summary in exactly that order.
- The first viewport prioritizes the roadmap; Home does not become an expense
  tracker or transaction feed.
- A roadmap can render every event type in the existing inventory with its
  temporal status, importance, date, copy, and relevant detail data.
- Actual events, the today marker, and projected events are visually and
  textually distinguishable without relying on color.
- Timeline rendering is adaptive and compressed for distant dates; it is not a
  proportional time scale and has no zoom or drag editing.
- Monthly income, expenses, and installment activity are grouped according to
  the roadmap contract.
- Selecting a meaningful event opens a focus-managed mobile Drawer or desktop
  Sheet, and closing restores focus.
- Recording a real saving or investment updates actual progress and rebuilds the
  affected roadmap without applying current allocations to historical actions.
- A savings-to-investment transfer does not increase goal value or total assets
  solely because of the transfer.
- Allocation, monthly-plan, new-goal, and recommendation changes show a
  non-mutating before/after result before confirmation.
- Home presents projected dates, deltas, estimates, warnings, incomplete data,
  horizon limits, and cross-currency limitations without invented precision.
- Loading, empty, error, success, and incomplete-data states are implemented;
  mutation errors preserve entered data and support retry.
- Mobile uses the established bottom navigation and touch targets; desktop uses
  the established navigation and optional right detail panel.
- All copy is Argentine Spanish/voseo, financial formatting uses shared
  utilities, and keyboard/focus/reduced-motion/accessibility requirements pass.

## Dependencies

- **Foundations:** AppShell, navigation, responsive breakpoints, design tokens,
  shadcn primitives, Drawer, Sheet, ScrollArea, Skeleton, Toast, and focus
  management.
- **Shared contracts:** money/date/percentage formatting, status and warning
  components, repository boundaries, loading/error conventions.
- **Goals:** goal summaries, progress, projected dates, goal detail, allocation
  editor, completion behavior.
- **Finances:** monthly cash flow, income/expense/installment summaries,
  investments, and incomplete expense knowledge.
- **Contributions:** record action menu, saving/investment flows, allocation
  snapshots, and mutation refresh behavior.
- **Projection domain:** `ProjectionResult`, `GoalProjection`, monthly cash flow,
  warnings, completion horizon, and cross-currency states.
- **Roadmap domain:** `RoadmapEvent`, event builder/grouping/classification,
  adaptive period compression, and event-detail mapping.
- **Recommendations/plans:** deterministic recommendations,
  `PlanImpactPreview`, before/after rows, and non-mutating preview/apply flows.
- **Server actions:** Clerk-authenticated reads for established-user data; Home
  must not import mock data or database access directly.

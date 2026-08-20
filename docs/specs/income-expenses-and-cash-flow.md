# Income, Expenses, and Cash Flow

## Purpose

Provide the minimum financial-input experience needed for NORTE to estimate monthly available margin and explain how income, expenses, recurrence, and installments affect the user's trajectory. This is supporting data for goals and the roadmap, not a transaction-first budgeting product.

## Scope

- Add, edit, and delete one-time or recurring income.
- Add, edit, and delete one-time, recurring, or installment expenses.
- Show fixed V1 expense categories in Argentine Spanish.
- Derive monthly cash flow from scheduled income and expenses.
- Show the current month's expected income, expected expenses, estimated margin, planned contribution, and actual contribution on `/app/finances`.
- Show income, expenses, savings/investments, and recent activity on `/app/finances`.
- Recalculate projections and affected roadmap events after persisted changes.
- Show a neutral margin warning when the planned contribution exceeds estimated margin.
- Support mobile bottom sheets and desktop right-side panels for forms and details.

## Non-goals

- No bank synchronization, automatic imports, reconciliation, or shared accounts.
- No custom categories, category CRUD, category budgets, advanced filters, search, reports, or advanced analytics.
- No inflation, live or user-configurable FX, taxes, real-time prices, or
  portfolio analytics. USD goal funding uses the shared fixed ARS-to-USD
  reference rate outside this feature's cash-flow calculations.
- No complex recurrence editor, drag-and-drop roadmap editing, or inline roadmap editing.
- Do not treat estimated margin as actual savings or automatically change the user's plan.

## Domain rules

### Records and money

- Use the existing `Money` model and decimal-safe arithmetic. Formatted strings are UI-only.
- Income has `concept`, `amount`, and either a one-time date or a recurring schedule.
- Expense has `concept`, `category`, and either a one-time date, recurring schedule, or installment schedule.
- Amounts must be positive. Dates and recurrence values must be valid.
- User-facing copy uses natural Argentine Spanish and voseo; code and domain contracts use English.

### Recurrence

- Supported frequencies: weekly, monthly, quarterly, yearly.
- Recurring records have `startDate` and optional `endDate`; one-time records have `date`.
- New recurring records default to monthly (`Todos los meses`).
- Generate only occurrences relevant to the cash-flow/projection horizon; do not materialize an unbounded series.
- Editing a recurring record offers exactly:
  - `Desde este mes en adelante`: preserve history and apply the new value/schedule from the current month.
  - `Sólo este mes`: create a month-specific override without changing the base recurrence.
- Deleting a recurring record offers the same two scopes. Never erase already elapsed historical occurrences.

### Installments

- An installment expense stores installment amount, positive integer count, and first installment date.
- Generate one monthly obligation per installment for the configured count.
- Include active installments in monthly expenses and show their current status, such as `8 de 12 pagadas`.
- Show the final installment as a trajectory event that explains the released monthly amount. Do not promote every installment to a major roadmap event.
- Editing/deleting installments must preserve elapsed obligations and apply only to the selected future scope; do not silently rewrite history.

### Categories

Use only these fixed categories:

| Domain value | Label |
| --- | --- |
| `housing` | Vivienda |
| `groceries` | Supermercado |
| `food` | Comida |
| `delivery` | Delivery |
| `transport` | Transporte |
| `health` | Salud |
| `clothing` | Ropa |
| `entertainment` | Entretenimiento |
| `subscriptions` | Suscripciones |
| `education` | Educación |
| `other` | Otros |

Shortcuts may prefill common concepts such as Alquiler, Obra social, Suscripciones, Servicios, and Otro. Users cannot create or rename categories.

### Monthly cash flow

For each month derive:

```text
totalIncome = recurringIncome + oneTimeIncome
estimatedMargin = totalIncome - totalExpenses
```

- Include an occurrence when its schedule is active in that month.
- `estimatedMargin` is an estimate of available margin, not actual savings and not a balance.
- Planned contribution remains intent. Actual contribution changes only through explicit `Ahorré` or `Invertí` actions.
- The monthly actual-contribution summary is expressed in ARS: direct ARS
  contributions use their amount, while USD savings and investments use their
  persisted ARS spend.
- If `plannedMonthlyContribution > estimatedMargin`, show a neutral warning and leave the plan unchanged.
- If expenses are incomplete or unavailable, label the result as incomplete instead of guessing.
- Recalculation must update the Finances summary, projections, roadmap summaries, and any affected goal dates.

### Editing and deletion

- Income and expense edits/deletions are available from their list item details.
- Persist only valid changes. Preserve entered form values on persistence errors and allow retry.
- Projection-affecting changes trigger recalculation after success and refresh the relevant UI contextually.
- Deleting requires an explicit confirmation and identifies the affected recurrence scope. One-time deletion removes only that record.
- Do not mutate actual contributions, goal allocation snapshots, or historical roadmap facts when changing future income/expenses.

## Screens / flows

### Finances page: `/app/finances`

Order the page as:

1. `Este mes` summary: Ingresos esperados, Gastos esperados, Margen estimado, Aporte planificado, and Aporte real.
2. Margin warning, when applicable.
3. `Ingresos` list with `Agregar ingreso`.
4. `Gastos` list with `Agregar gasto`.
5. `Ahorros e inversiones` with current goal-related assets.
6. `Actividad reciente` as a compact chronological list.

On mobile use persistent bottom navigation and `Drawer` forms/details. On desktop use the navigation/sidebar and a contextual `Sheet`. Do not introduce horizontal scrolling or advanced list controls.

### Add income

1. Open from `Agregar ingreso` or `+ Registrar > Agregar ingreso`.
2. Enter `Concepto` and `Monto`.
3. Choose `Una sola vez` with date or `Recurrente` with frequency and start date; optionally end the recurrence.
4. Validate inline, persist through a Clerk-authenticated server action, close
   the form, and refresh cash flow/projections/roadmap.

### Add expense

1. Open from `Agregar gasto` or `+ Registrar > Agregar gasto`.
2. Enter `Concepto`, `Monto`, and one fixed `Categoría`.
3. Choose `Una sola vez`, `Recurrente`, or `En cuotas`.
4. Show only fields relevant to the selected schedule.
5. Validate inline, persist, and refresh all affected derived data.

### Edit or delete

- Selecting an income or expense opens its detail/edit panel.
- Edit preserves the existing schedule unless the user changes it.
- For recurring or installment records, ask for the supported scope before applying a change.
- Delete confirmation explains whether only this occurrence or the future series is affected.
- On success show contextual refresh and a subtle toast, not a blocking success modal.

### Margin warning

When the plan is above estimated margin, show:

> **Tu plan actual requiere aportar aproximadamente $200.000 más de lo que hoy parece quedarte disponible cada mes.**

Use the actual calculated difference and the user's currency. The warning is informational: it must not reduce planned contribution, create a recommendation automatically, or imply that the user failed.

## States

- **Loading:** skeletons for summary and lists; render the app shell first.
- **Empty:** explain that no income or expenses have been added and offer the relevant CTA. Keep the page useful with unavailable/incomplete summary values.
- **Error:** show a retry action. Preserve unsaved form input and do not discard valid existing data.
- **Success:** close the form, refresh derived data, and show a subtle contextual toast.
- **Incomplete data:** distinguish unknown or missing expenses from errors. Show `Todavía necesitamos conocer tus gastos para calcular esta fecha` or `Fecha por calcular` where projections depend on missing data.
- **Validation:** visible labels, inline errors, numeric mobile keyboard for money, Argentine separator handling, and no submit until required fields are valid.
- **Margin warning:** neutral callout when planned contribution exceeds estimated margin; no automatic plan mutation.

## Acceptance criteria

- `/app/finances` shows the required monthly summary and sections in the specified order.
- A user can create a one-time income and it appears in the correct month's income and cash-flow totals.
- A user can create a monthly recurring income and it contributes to each active future month until its end date, if any.
- A user can create a one-time, recurring, or installment expense using only the fixed category list.
- An installment expense creates the configured number of monthly obligations, reports current progress, and emits one final release event.
- Editing recurring records supports only `Desde este mes en adelante` and `Sólo este mes`; elapsed history remains unchanged.
- Editing and deleting one-time and future recurring/installment data updates derived totals without changing historical actual contributions.
- `estimatedMargin` equals total income minus total expenses with recurring, one-time, and installment components separated.
- The page distinguishes estimated margin, planned contribution, and actual contribution; margin never becomes actual savings automatically.
- When planned contribution exceeds estimated margin, the neutral warning displays the exact shortfall and the plan remains unchanged.
- Successful changes recalculate projections and affected roadmap events; failed persistence preserves form input and offers retry.
- Loading, empty, error, success, incomplete-data, validation, and warning states work on mobile and desktop.
- All user-facing copy is Argentine Spanish, controls are keyboard accessible, and dialogs/sheets manage focus accessibly.

## Dependencies

- [Foundations](./foundations-and-financial-model.md): shared money/profile model, persistence boundary, calculation boundaries, and cross-cutting UX conventions.
- [NORTE product requirements](../NORTE-PRD-development-spec.md): product principles, scope boundaries, and deferred decisions.
- [Project context](../../CONTEXT.md): planned contribution, actual contribution, trajectory, roadmap, and impact-preview vocabulary.
- Clerk-authenticated server actions for profile, income, expenses, and
  investments; projection services must remain independent of React.
- Shared `Money`, date, percentage, warning, empty-state, and formatting components/utilities.

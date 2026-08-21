# Contributions and Investments

## Purpose

Define the frontend MVP for recording actual savings and investments, maintaining the historical allocation context of each action, and showing how those actions change current goal progress and future trajectory.

This feature owns the `+ Registrar` flows for **Ahorré ARS**, **Ahorré USD**, **Invertí ARS**, and **Invertí USD**, investment detail/value updates, and the related refresh of progress, projections, and roadmap events. It complements [Foundations](./foundations-and-financial-model.md) and links to [Goals](./goals-and-allocation.md) for profile, goal, allocation-plan, and projection behavior instead of redefining them here.

## Scope

- Open `+ Registrar` and choose **Ahorré ARS**, **Ahorré USD**, **Invertí ARS**, or **Invertí USD**.
- Record an ARS saving with amount and optional location, or a USD saving with purchase details.
- Record a new-money investment contribution in ARS or USD using the automatic investment allocation channel.
- Preview automatic saving and investment allocation using the active plan.
- Store contribution allocation snapshots and position metadata.
- Show current goal value and actual progress from saved amounts and investment values.
- Show investment detail: current value, estimated annual return, goal, and availability.
- Update an investment's current value through **Actualizar valor**.
- Recalculate goal progress, projections, and affected roadmap events after every confirmed mutation.
- Support mobile bottom sheets and desktop right panels, using the shared app shell and primitives from Foundations.

## Non-goals

- Bank, broker, or market integrations; real-time prices, user-configurable FX,
  or currencies beyond the fixed ARS-to-USD reference rate.
- Tickers, quantities, portfolio composition, dividends, fees, taxes, volatility, or investment advice.
- Mixed strategies or multiple investments per goal in V1.
- Existing-savings transfers or reallocations between savings and investments.
- Do not offer manual allocation editing inside `Ahorré` or `Invertí`.
- Replacing the Goals allocation editor, goal creation, goal completion, or impact-preview rules.
- Treating estimated margin or planned contribution as actual progress.
- A transaction ledger, advanced filters, reports, or reconciliation.

## Domain rules

- A contribution is an actual action. Planned contributions and estimated monthly margin never increase actual goal progress.
- `Ahorré ARS` creates a saving contribution in ARS for active ARS goals with `strategy: "save"`. `Ahorré USD` creates a saving contribution in USD for active USD goals with `strategy: "save"`. Both use the active allocation percentages at confirmation time, normalized within the selected currency channel. Persist explicit `ContributionAllocation` records with the calculated amount for each goal.
- `Invertí ARS` creates an investment contribution in ARS for active ARS goals with `strategy: "invest"`. `Invertí USD` creates an investment contribution in USD for active USD goals with `strategy: "invest"`. Both use the active allocation percentages at confirmation time, normalized within the selected currency channel. Persist explicit `ContributionAllocation` records linking the calculated amount to each goal and its investment position.
- A new-money `Invertí` contribution is automatically distributed only among active, same-currency, investment-strategy goals, normalized within that channel. It does not change the future Plan.
- A USD saving or investment persists the USD amount credited, ARS amount spent, and effective ARS-per-USD rate. Historical purchase data never changes when the application reference rate changes.
- Historical allocations are immutable snapshots for projection purposes. Changing today's allocation must not recalculate past contributions.
- A user may explicitly correct or delete a recorded action. A correction
  atomically updates that action and its own allocation snapshot, then refreshes
  balances, projections, and roadmap state without applying today's allocation.
- Saving and investment allocations are automatic and read-only in the flow. Do not offer manual allocation editing or override percentages inside `Ahorré` or `Invertí`. Active goal percentages in the Plan must total 100%; each contribution distributes its full amount only among compatible active goals (matching currency and strategy), proportionally to their global percentages.
- Allocation amounts use decimal-safe arithmetic, are rounded to currency precision, and receive any remainder deterministically. The displayed and persisted allocation amounts must sum exactly to the contribution amount.
- `progressPercent = currentGoalValue / currentTargetValue * 100`, clamped in the UI to 0–100%. If the target or currency calculation is unavailable, show the appropriate incomplete state from Goals rather than inventing a value.
- Updating investment value changes current goal value and can change projections, completion dates, and roadmap output. The value is an estimate, not a guarantee.
- Confirmed mutations refresh Home, Goals, Finances, projections, and affected roadmap events. Persistence errors retain entered form values and allow retry.
- Use Argentine Spanish and voseo. Required copy includes:
  - **¿Cuánto ahorraste?** / **¿Cuánto invertiste?**
  - **Compré [USD] dólares**
  - **Gasté [ARS] pesos**
  - **Precio del dólar: [ARS] pesos**
  - **¿Dónde está este dinero?** (optional, savings only)
  - **Ej. Alcancía Mercado Pago**
  - **Así se distribuye tu ahorro** / **Así se distribuye tu inversión**
  - **Ahorraste $500.000** / **Invertiste $300.000**
  - **Actualizar valor**

## Screens/flows

### Record ARS saving

1. User opens `+ Registrar` and selects **Ahorré ARS**.
2. Form shows required money field **¿Cuánto ahorraste?** and optional **¿Dónde está este dinero?**.
3. After a valid amount, show **Así se distribuye tu ahorro** with each active ARS saving-strategy goal and its exact amount, normalized within the ARS channel.
4. User confirms. Create the saving contribution with its allocation snapshot.
5. Refresh progress, projections, roadmap, and Home; show contextual success feedback.

### Record USD saving

1. User opens `+ Registrar` and selects **Ahorré USD**.
2. Form shows **Compré [USD] dólares**, **Gasté [ARS] pesos**, and **Precio del dólar: [ARS] pesos**. The price starts with the fixed application reference rate.
3. With any two positive values, calculate the third. When all three are present, changing price or USD updates ARS spent; changing ARS spent updates price. Do not calculate from a single entered value.
4. Enable confirmation only when all three positive, coherent values are available and at least one active USD saving-strategy goal exists.
5. Show **Así se distribuye tu ahorro** with each active USD saving-strategy goal and its exact USD amount, normalized within the USD channel.
6. User confirms. Persist the USD contribution, ARS spent, effective rate, and allocation snapshot; then refresh progress, projections, roadmap, and Home.

### Record ARS investment

1. User opens `+ Registrar` and selects **Invertí ARS**.
2. Form shows required money field **¿Cuánto invertiste?**.
3. After a valid amount, show **Así se distribuye tu inversión** with each active ARS investment-strategy goal and its exact amount, normalized within the ARS channel.
4. User confirms. Create the investment contribution with its allocation snapshot and increment each assigned goal investment position.
5. Refresh progress, projections, roadmap, and Home; show contextual success feedback.

### Record USD investment

1. User opens `+ Registrar` and selects **Invertí USD**.
2. Form shows **Compré [USD] dólares**, **Gasté [ARS] pesos**, and **Precio del dólar: [ARS] pesos**. The price starts with the fixed application reference rate.
3. With any two positive values, calculate the third. When all three are present, changing price or USD updates ARS spent; changing ARS spent updates price. Do not calculate from a single entered value.
4. Enable confirmation only when all three positive, coherent values are available and at least one active USD investment-strategy goal exists.
5. Show **Así se distribuye tu inversión** with each active USD investment-strategy goal and its exact USD amount, normalized within the USD channel.
6. User confirms. Persist the USD investment contribution, ARS spent, effective rate, and allocation snapshot, incrementing each assigned goal investment position; then refresh progress, projections, roadmap, and Home.

### Investment detail and value update

Investment detail is reachable from Finances and related goal detail. Show:

- **Valor actual**.
- **Rentabilidad estimada** as an annual percentage.
- **Objetivo**.
- **Disponibilidad**: `En cualquier momento`, `Desde [fecha]`, or `Largo plazo`.
- **Actualizar valor** CTA.

The update form validates a non-negative value, preserves input on failure, and on success recalculates actual progress, investment projections, completion dates, and roadmap events.

## States

- **Loading:** skeleton for forms, investment detail, and derived progress.
- **Empty:** no investments or no recent contributions; provide the relevant record/create CTA.
- **Incomplete data:** no active compatible goals for **Ahorré ARS** / **Ahorré USD** (no active `strategy: "save"` goals in currency) or **Invertí ARS** / **Invertí USD** (no active `strategy: "invest"` goals in currency), unsupported currency relationship, or missing investment association. Explain what is needed; do not treat it as an error.
- **Validation error:** inline labels and messages for missing/invalid amount, USD purchase fields, or value update. Preserve the user's input.
- **Persistence error:** non-blocking error with retry; never discard entered data.
- **Success:** close the Drawer/Sheet or return to detail, refresh contextual data, and show a subtle toast.
- **Projection estimate:** label investment-derived future values and dates as estimates; never present them as guarantees.

## Acceptance criteria

- `+ Registrar → Ahorré ARS` accepts a positive ARS amount, previews the active ARS saving-strategy goal allocation, and cannot confirm while no active ARS saving goal exists.
- `+ Registrar → Ahorré USD` requires positive, coherent USD bought, ARS spent, and effective rate values; it previews allocation among active USD saving-strategy goals and cannot confirm while none exist.
- `+ Registrar → Invertí ARS` accepts a positive ARS amount, previews the active ARS investment-strategy goal allocation (normalized within that channel), and cannot confirm while no active ARS investment goal exists.
- `+ Registrar → Invertí USD` requires positive, coherent USD bought, ARS spent, and effective rate values; it previews allocation among active USD investment-strategy goals (normalized within that channel) and cannot confirm while none exist.
- Saving and investment preview and persisted allocations use decimal-safe rounding and always sum exactly to the entered amount in the contribution currency.
- Saving and investment confirmations store explicit historical allocation amounts and percentages; later allocation plan changes do not alter them.
- Neither `Ahorré` nor `Invertí` allows manual allocation editing or percentage overrides inside the recording flow.
- A new-money `Invertí` contribution is automatically distributed only among active, same-currency, investment-strategy goals, normalized within that channel, increments the investment position value of each allocated goal, and does not change the future Plan.
- Correcting or deleting a recorded saving/investment action updates its own
  snapshot and derived state atomically; later Plan changes still do not alter
  historical actions.
- Every confirmed saving, investment, correction, deletion, or investment-value update refreshes actual goal progress, projections, and affected roadmap events.
- Goal progress is based on current assigned savings plus current assigned investment value, not on planned contribution or estimated margin.
- Investment detail displays the MVP fields and **Actualizar valor** updates the derived values without adding a new contribution.
- Loading, empty, incomplete-data, validation, persistence-error, and success states exist for each flow.
- Mobile uses accessible bottom sheets and desktop uses accessible right panels; forms have visible labels, keyboard navigation, focus management, and non-color-only progress/status cues.
- User-facing copy is natural Argentine Spanish with voseo.

## Dependencies

- [Foundations](./foundations-and-financial-model.md): app shell, responsive navigation, Drawer/Sheet, shadcn primitives, money/date formatting, Clerk-authenticated server actions, durable persistence, and shared async/error patterns.
- [Goals](./goals-and-allocation.md): Goal entity, active allocation plan, allocation history, goal detail, progress display, target/currency incomplete states, and projection/impact-preview contracts.
- Shared server actions for contributions, finances, and investments; domain models;
  and preview/mutation operations.
- Pure domain calculation services for decimal-safe allocation, current goal value, and projection refresh; React components must not implement authoritative financial arithmetic.
- Roadmap event builder for `saving_contribution`, `investment_contribution`, `goal_progress_milestone`, `investment_projection`, and related actual/today/projected classification.

# Contributions and Investments

## Purpose

Define the frontend MVP for recording actual savings and investments, maintaining the historical allocation context of each action, and showing how those actions change current goal progress and future trajectory.

This feature owns the `+ Registrar` flows for **Ahorré** and **Invertí**, investment detail/value updates, and the related refresh of progress, projections, and roadmap events. It complements [Foundations](./foundations-and-financial-model.md) and links to [Goals](./goals-and-allocation.md) for profile, goal, allocation-plan, and projection behavior instead of redefining them here.

## Scope

- Open `+ Registrar` and choose **Ahorré ARS**, **Ahorré USD**, or **Invertí**.
- Record an ARS saving with amount and optional location, or a USD saving with purchase details.
- Preview automatic saving allocation using the active plan.
- Record an investment contribution by selecting an investment and source:
  - **Dinero nuevo**.
  - **Ahorros que ya tenía**.
- Restrict existing-savings transfers to savings associated with the same goal as the selected investment.
- Show transfer impact before confirmation: the saved position decreases, investment value increases, and total assets do not change.
- Store contribution allocation snapshots and source metadata.
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
- Manual allocation editing inside **Ahorré**.
- Replacing the Goals allocation editor, goal creation, goal completion, or impact-preview rules.
- Treating estimated margin or planned contribution as actual progress.
- A transaction ledger, advanced filters, reports, or reconciliation.

## Domain rules

- A contribution is an actual action. Planned contributions and estimated monthly margin never increase actual goal progress.
- `Ahorré ARS` creates a saving contribution in ARS for active ARS goals. `Ahorré USD` creates a saving contribution in USD for active USD goals. Both use the active allocation percentages at confirmation time, normalized within the selected currency channel. Persist explicit `ContributionAllocation` records with the calculated amount for each goal.
- A USD saving persists the USD amount credited, ARS amount spent, and effective ARS-per-USD rate. Historical purchase data never changes when the application reference rate changes.
- Historical allocations are immutable snapshots for projection purposes. Changing today's allocation must not recalculate past contributions.
- A user may explicitly correct or delete a recorded action. A correction
  atomically updates that action and its own allocation snapshot, then refreshes
  balances, projections, and roadmap state without applying today's allocation.
- Saving allocation is automatic and read-only in the flow. Active goal percentages must total 100%; each saving distributes its full amount only among compatible active goals, proportionally to their global percentages.
- Allocation amounts use decimal-safe arithmetic, are rounded to currency precision, and receive any remainder deterministically. The displayed and persisted allocation amounts must sum exactly to the contribution amount.
- A new-money `Invertí` contribution goes directly to the selected investment's goal. Do not apply global goal allocation again, including when the investment belongs to Retiro. A USD investment is funded by a USD purchase with the same USD, ARS-spent, and effective-rate fields as `Ahorré USD`.
- An existing-savings investment is a transfer, not new wealth. It must reduce the source savings position, increase the selected investment value, preserve total financial assets, and create no new net contribution.
- Existing-savings transfers may only select savings associated with the same goal and currency as the target investment. If no eligible source exists, show an incomplete state rather than allowing the transfer.
- A transfer must not increase goal progress by itself. Goal value remains `actual savings still assigned to the goal + current value of investments assigned to the goal`.
- `progressPercent = currentGoalValue / currentTargetValue * 100`, clamped in the UI to 0–100%. If the target or currency calculation is unavailable, show the appropriate incomplete state from Goals rather than inventing a value.
- Updating investment value changes current goal value and can change projections, completion dates, and roadmap output. The value is an estimate, not a guarantee.
- Confirmed mutations refresh Home, Goals, Finances, projections, and affected roadmap events. Persistence errors retain entered form values and allow retry.
- Use Argentine Spanish and voseo. Required copy includes:
  - **¿Cuánto ahorraste?**
  - **Compré [USD] dólares**
  - **Gasté [ARS] pesos**
  - **Precio del dólar: [ARS] pesos**
  - **¿Dónde está este dinero?**
  - **Ej. Alcancía Mercado Pago**
  - **Dinero nuevo**
  - **Ahorros que ya tenía**
  - **Esta plata ya formaba parte de tu patrimonio. Sólo cambia dónde está.**
  - **Ahorraste $500.000** / **Invertiste $300.000**
  - **Actualizar valor**

## Screens/flows

### Record ARS saving

1. User opens `+ Registrar` and selects **Ahorré ARS**.
2. Form shows required money field **¿Cuánto ahorraste?** and optional **¿Dónde está este dinero?**.
3. After a valid amount, show **Así se distribuye tu ahorro** with each active ARS goal and its exact amount, normalized within the ARS channel.
4. User confirms. Create the saving contribution with its allocation snapshot.
5. Refresh progress, projections, roadmap, and Home; show contextual success feedback.

### Record USD saving

1. User opens `+ Registrar` and selects **Ahorré USD**.
2. Form shows **Compré [USD] dólares**, **Gasté [ARS] pesos**, and **Precio del dólar: [ARS] pesos**. The price starts with the fixed application reference rate.
3. With any two positive values, calculate the third. When all three are present, changing price or USD updates ARS spent; changing ARS spent updates price. Do not calculate from a single entered value.
4. Enable confirmation only when all three positive, coherent values are available and at least one active USD goal exists.
5. Show **Así se distribuye tu ahorro** with each active USD goal and its exact USD amount, normalized within the USD channel.
6. User confirms. Persist the USD contribution, ARS spent, effective rate, and allocation snapshot; then refresh progress, projections, roadmap, and Home.

### Record investment

1. User opens `+ Registrar` and selects **Invertí**.
2. User selects an investment and **Dinero nuevo** or **Ahorros que ya tenía**. For ARS investments, new money uses an ARS amount. For USD investments, new money uses the three USD-purchase fields from **Ahorré USD**.
3. For new money, show the target investment and its goal; explain that the amount goes directly to that goal. For USD investments, explain that ARS is converted before crediting the USD investment.
4. For existing savings, show only eligible same-goal savings, the source reduction, destination increase, and unchanged total assets. Show the transfer copy before confirmation.
5. User confirms. Persist the investment contribution or transfer and refresh all affected derived data.

### Investment detail and value update

Investment detail is reachable from Finances and related goal detail. Show:

- **Valor actual**.
- **Rentabilidad estimada** as an annual percentage.
- **Objetivo**.
- **Disponibilidad**: `En cualquier momento`, `Desde [fecha]`, or `Largo plazo`.
- **Actualizar valor** CTA.

The update form validates a non-negative value, preserves input on failure, and on success recalculates actual progress, investment projections, completion dates, and roadmap events.

## States

- **Loading:** skeleton for forms, investment detail, eligible sources, and derived progress.
- **Empty:** no investments or no recent contributions; provide the relevant record/create CTA.
- **Incomplete data:** no active compatible goals for **Ahorré ARS** or **Ahorré USD**, no eligible same-goal, same-currency savings for a transfer, unsupported currency relationship, or missing investment association. Explain what is needed; do not treat it as an error.
- **Validation error:** inline labels and messages for missing/invalid amount, investment, source, or value. Preserve the user's input.
- **Persistence error:** non-blocking error with retry; never discard entered data.
- **Success:** close the Drawer/Sheet or return to detail, refresh contextual data, and show a subtle toast.
- **Transfer confirmation:** explicitly show that the operation changes location, not total wealth or goal progress.
- **Projection estimate:** label investment-derived future values and dates as estimates; never present them as guarantees.

## Acceptance criteria

- `+ Registrar → Ahorré ARS` accepts a positive ARS amount, previews the active ARS-goal allocation, and cannot confirm while no active ARS goal exists.
- `+ Registrar → Ahorré USD` requires positive, coherent USD bought, ARS spent, and effective rate values; it previews allocation among active USD goals and cannot confirm while none exist.
- Saving preview and persisted allocations use decimal-safe rounding and always sum exactly to the entered amount in the saving currency.
- Saving confirmation stores explicit historical allocation amounts and percentages; later allocation changes do not alter them.
- Correcting or deleting a recorded saving/investment action updates its own
  snapshot and derived state atomically; later Plan changes still do not alter
  historical actions.
- `+ Registrar → Invertí → Dinero nuevo` sends the full amount to the selected investment's goal and does not apply global allocation a second time. New USD investments persist the corresponding ARS spend and effective rate.
- `+ Registrar → Invertí → Ahorros que ya tenía` lists only same-goal, same-currency eligible sources and, after confirmation, decreases savings and increases investment by the same amount.
- An existing-savings transfer leaves total financial assets and goal progress unchanged solely because of the transfer.
- Every confirmed saving, investment, transfer, or investment-value update refreshes actual goal progress, projections, and affected roadmap events.
- Goal progress is based on current assigned savings plus current assigned investment value, not on planned contribution or estimated margin.
- Investment detail displays the MVP fields and **Actualizar valor** updates the derived values without adding a new contribution.
- Loading, empty, incomplete-data, validation, persistence-error, and success states exist for each flow.
- Mobile uses accessible bottom sheets and desktop uses accessible right panels; forms have visible labels, keyboard navigation, focus management, and non-color-only progress/status cues.
- User-facing copy is natural Argentine Spanish with voseo and uses the specified transfer explanation.

## Dependencies

- [Foundations](./foundations-and-financial-model.md): app shell, responsive navigation, Drawer/Sheet, shadcn primitives, money/date formatting, Clerk-authenticated server actions, durable persistence, and shared async/error patterns.
- [Goals](./goals-and-allocation.md): Goal entity, active allocation plan, allocation history, goal detail, progress display, target/currency incomplete states, and projection/impact-preview contracts.
- Shared server actions for contributions, finances, and investments; domain models;
  and preview/mutation operations.
- Pure domain calculation services for decimal-safe allocation, current goal value, transfer accounting, and projection refresh; React components must not implement authoritative financial arithmetic.
- Roadmap event builder for `saving_contribution`, `investment_contribution`, `goal_progress_milestone`, `investment_projection`, and related actual/today/projected classification.

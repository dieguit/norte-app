# Onboarding And Initial Plan

## Purpose

Deliver the first useful NORTE experience for a new user: capture a minimal financial profile, create the first goal, define a planned monthly contribution, and land on Home with a clear but honest starting trajectory.

The experience must communicate the core loop without requiring a full financial history: goals, plan, actual actions, and trajectory. Unknown expenses must remain visibly incomplete rather than being estimated or silently assumed.

## Scope

- Render onboarding at `/app` for an authenticated user without a
  `FinancialProfile`.
- Four-step onboarding flow:
  1. First goal, with `Colchón financiero` selected by default.
  2. Approximate monthly income.
  3. Approximate monthly expenses, including `No sé todavía`.
  4. Planned monthly contribution.
- Create the first `Goal` and `FinancialProfile` on completion.
- Use the emergency-fund rule from the PRD: six months of known monthly expenses by default.
- Route the completed user to `/app` Home.
- New-user Home experience after onboarding:
  - `Tu plan está empezando a tomar forma`.
  - Summary of income, expenses, and planned contribution.
  - Emergency-fund card with an incomplete target/date state when expenses are unknown.
  - CTA `Agregar mis gastos principales` with suggestions for `Alquiler`, `Obra social`, `Servicios`, and `Suscripciones`.
  - Visible roadmap state: `Colchón financiero — Fecha por calcular`.
- Persist through Clerk-authenticated TanStack server actions, not client-side
  storage or mock data.
- Support mobile-first and desktop layouts using the shared app shell and navigation.

## Non-goals

- Account implementation details, bank synchronization, or imported
  transactions.
- A long financial questionnaire or detailed income/expense capture during onboarding.
- Creating additional goals, editing allocations, recording savings/investments, or managing recurring finances in this MVP.
- Calculating an emergency-fund target or completion date when expenses are unknown.
- FX conversion, inflation assumptions, investment projections, recommendations, or plan impact previews.
- Building a second design system, formatting layer, global state library, or bespoke modal pattern.

## Rules

- All user-facing text is natural Argentine Spanish with voseo. Code and contracts remain English.
- Preserve this onboarding copy exactly:
  - Title: `Vamos a construir tu perfil financiero`
  - Intro: `Empecemos con algunos datos básicos. No tienen que ser exactos y podés cambiarlos después.`
  - Expense option: `No sé todavía`
  - Final CTA: `Ver mi plan`
- The first goal is `Colchón financiero`, selected by default. Its target is `monthly expenses × emergencyFundMonths`, with `emergencyFundMonths = 6`.
- Income and expenses collected here are approximate planning inputs. They must not be presented as recorded income, expenses, or actual contributions.
- Planned monthly contribution is intent, not actual progress. It must be greater than zero.
- If expenses are unknown, store `expensesKnowledge: "unknown"`, omit the emergency-fund target, and expose `Fecha por calcular`. Never guess a value or date.
- If expenses are known, validate them as non-negative and calculate the emergency-fund target in the profile/goal domain layer, not in presentation code.
- Completion must persist the profile and goal together from the feature’s perspective; do not navigate to Home until persistence succeeds.
- Persistence failure preserves entered values and offers retry. Success navigates to Home and uses contextual refresh plus a subtle toast, not a blocking modal.
- Use shared `Money`, `ProjectedDate`, `StatusMessage`, `EmptyState`, `WarningCallout`, formatting utilities, shadcn/ui form primitives, and the server-action boundary defined in the PRD. Do not duplicate their behavior here.
- Follow shared responsive and accessibility foundations: visible labels, inline errors, numeric mobile keyboard, keyboard navigation, focus management, sufficient contrast, and reduced-motion support.

## Screens And Flows

### Onboarding

Render a focused, mobile-first step flow at `/app` when the authenticated user
has no `FinancialProfile`, with progress indication and a back action after the
first step. Keep entered values while moving between steps or correcting
validation errors.

#### Step 1: First goal

- Present `Colchón financiero` as the default first goal.
- The implementation may keep this step intentionally narrow: no additional-goal creation in this MVP.
- Store the goal as an active emergency-fund goal using the shared `Goal` model and `emergencyFundMonths: 6`.

#### Step 2: Approximate monthly income

- Ask for approximate monthly income with a labeled money field.
- Allow zero only if the shared profile validation permits it; do not infer income from other fields.

#### Step 3: Approximate monthly expenses

- Offer a labeled money field and an explicit `No sé todavía` choice.
- Selecting `No sé todavía` clears/ignores the numeric expense value and sets the profile’s expense knowledge to unknown.
- Explain the consequence through the incomplete Home state, not a fabricated target.

#### Step 4: Planned monthly contribution

- Ask for the amount the user plans to contribute each month.
- Validate `planned contribution > 0`.
- On `Ver mi plan`, persist the profile and initial goal, mark onboarding
  complete, then render Home at `/app`.

### New-user Home

Use the shared `AppShell` and Home foundations, but render the new-user variant instead of the established-user monthly status/roadmap content.

Top content:

```text
Tu plan está empezando a tomar forma

Ingresos mensuales
~$4.500.000

Gastos mensuales
Todavía no sabemos

Aporte planificado
$600.000
```

Values are dynamic and formatted through shared utilities; the structure and labels remain as above.

Emergency-fund card:

```text
Colchón financiero
Necesitamos conocer mejor tus gastos para calcular cuánto necesitás.
Agregar mis gastos principales
```

Show suggestions `Alquiler`, `Obra social`, `Servicios`, and `Suscripciones`. The CTA may route to the future expense-entry seam, but this MVP only needs to expose the action and preserve the incomplete state if that feature is not yet available.

Roadmap:

```text
Colchón financiero — Fecha por calcular
```

It remains visible as an incomplete projected state. It must not look like an error or imply that the goal is failing.

## States

- **Loading:** show shared skeletons while onboarding/profile persistence or Home data resolves. Render the app shell before financial data when possible.
- **Editing:** current step has visible labels, helper text where needed, inline validation, and preserved input.
- **Invalid:** prevent advancing/submission; identify the field and explain the correction in Argentine Spanish. Do not discard malformed input.
- **Submitting:** disable duplicate completion, retain form values, and expose progress without blocking the whole app unnecessarily.
- **Persistence error:** keep all entered values, show a contextual error with retry, and do not mark onboarding complete or route to Home.
- **Success:** mark `onboardingCompleted`, load Home from persisted state, and show subtle contextual feedback.
- **Incomplete expenses:** use `Todavía no sabemos`, `Necesitamos conocer mejor tus gastos para calcular cuánto necesitás.`, and `Fecha por calcular`. This is a valid product state, not an error or empty state.
- **Empty/missing profile:** render the new-user flow at `/app`; do not render
  a partially fabricated Home.

## Acceptance Criteria

- A new authenticated user without a `FinancialProfile` reaches `/app` and sees
  `Vamos a construir tu perfil financiero` and `Empecemos con algunos datos básicos. No tienen que ser exactos y podés cambiarlos después.`.
- The first goal is `Colchón financiero` by default and is persisted as an active emergency-fund goal.
- The user can enter approximate monthly income using Argentine money input behavior.
- The user can select `No sé todavía` for expenses; the numeric expense value is not used afterward.
- The user can enter a positive planned monthly contribution.
- Invalid required values prevent progression with inline, accessible errors and preserved input.
- `Ver mi plan` persists the profile and goal, sets `onboardingCompleted`, and
  renders Home at `/app` only after success.
- A failed persistence attempt keeps the form state and allows retry.
- With known expenses, the emergency-fund target equals six times monthly expenses and is available to the shared goal/projection foundations.
- With unknown expenses, no target or completion date is calculated; Home shows `Todavía no sabemos` and `Fecha por calcular`.
- New-user Home shows `Tu plan está empezando a tomar forma`, the three summary labels, the incomplete emergency-fund card, the four expense suggestions, and the visible roadmap state.
- The Home experience does not claim actual progress or actual savings merely because a plan was created.
- Mobile uses the shared bottom navigation and touch targets; desktop uses the shared navigation/sidebar layout without stretching mobile structure.
- Keyboard navigation, focus treatment, labels, error associations, contrast, and reduced-motion behavior meet the shared accessibility foundation.
- Tests cover onboarding validation/persistence behavior, emergency-fund target calculation, unknown-expense behavior, and the new-user Home rendering states.

## Dependencies

- Shared Phase 1 foundations from the PRD: React shell, shadcn/ui tokens/primitives, responsive navigation, Clerk, server actions, and formatting utilities.
- Shared domain types and rules: `FinancialProfile`, `Goal`, `Money`, emergency-fund calculation, and `onboardingCompleted`.
- Clerk-authenticated server actions for profile reads/updates and goal creation.
- Shared validation and money normalization for Argentine separators.
- Shared Home/app-shell primitives: `AppShell`, `MobileBottomNav`, `DesktopSidebar`, `Money`, `ProjectedDate`, `StatusMessage`, `EmptyState`, and `WarningCallout`.
- A roadmap read/model seam capable of representing an incomplete emergency-fund projected event, or a feature-local adapter until the roadmap foundation is available.
- No analytics payload contains raw financial amounts. Authentication and durable
  persistence are required; bank integrations remain out of scope.

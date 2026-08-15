# NORTE — Product Requirements Document (PRD) / Development Specification

**Status:** Draft v1  
**Product:** NORTE  
**Target:** Mobile-first responsive web application  
**Frontend:** React + TypeScript + shadcn/ui  
**Primary UI language:** Spanish (Argentina)  
**Document purpose:** Development source of truth for the first functional NORTE product experience.

---

# 1. Executive summary

NORTE is a personal financial planning application centered on **goals and future trajectory**, not on retrospective expense tracking.

The product should answer, as quickly as possible:

> **¿Voy camino a cumplir mis objetivos?**

The core product loop is:

**Objetivos → Plan → Acciones reales → Recalcular trayectoria → Mostrar impacto → Ajustar plan**

Income, expenses, savings, installments, and investments are not the center of the product. They are inputs that explain and modify the user's trajectory toward their goals.

The most differentiated visual element is the **financial roadmap**: a unified timeline that connects:

- past financial actions;
- the current state;
- future cash-flow changes;
- projected milestones;
- goal completion dates;
- changes to the user's plan.

Apply **YAGNI** when a feature does not directly support the core loop.

---

# 2. Product principles

## 2.1 Goals first

NORTE should not feel like an expense tracker with goals added on top.

The hierarchy is:

1. Where the user is going.
2. Whether they are on track.
3. What changed the trajectory.
4. What the user can do next.
5. Supporting financial data.

The hierarchy is **not** transactions → categories → charts → goals.

## 2.2 Plan and reality are different concepts

NORTE must never assume that money left after expenses was actually saved.

Example:

- Monthly planned contribution: $800,000.
- Estimated monthly margin: $1,000,000.
- Actual contribution recorded by the user: $500,000.

Actual goal progress increases only from explicit real actions:

- **Ahorré**
- **Invertí**

Therefore:

**Past = actual recorded actions.**  
**Future = current projected plan.**

## 2.3 Every important change should expose its consequence

When the user changes goal allocations, planned monthly contribution, goals, investment strategy, or accepts a recommendation, NORTE should show the impact on future goal dates before confirmation whenever the impact is meaningful.

Signature interaction:

**Antes → Con este cambio**

## 2.4 Neutral, non-judgmental language

Use:

> “Este mes aportaste menos de lo planificado. Tu colchón se proyecta aproximadamente 3 semanas más tarde.”

Do not use:

> “No cumpliste tu meta.”

## 2.5 Progressive financial profile

The user does not need to provide every financial detail before receiving value.

The initial onboarding creates a basic profile. NORTE becomes more accurate as the user adds expenses, income, savings, investments, and goals.

---

# 3. Language requirements

All user-facing content must use **natural Argentine Spanish** and voseo.

Examples:

- “¿Cuánto ganás?”
- “Podés cambiarlo después.”
- “Ahorraste $500.000.”
- “Si hacés este cambio…”

Do not use “tú”, literal English translations, unnecessary financial jargon, artificial motivational copy, or AI-sounding language.

Code, variable names, interfaces, components, and API contracts should use English.

---

# 4. Scope

## 4.1 In scope

1. Basic financial-profile onboarding.
2. Home dashboard.
3. Unified financial roadmap.
4. Goal management.
5. Goal allocation percentages.
6. Planned monthly contribution.
7. Recording real savings.
8. Recording investments.
9. Income management.
10. Expense management.
11. Recurring income and expenses.
12. Installments.
13. Basic investment management.
14. Goal projections.
15. Investment growth projection.
16. Plan deviations.
17. Deterministic actionable recommendations.
18. Before/after impact previews.
19. Mobile bottom sheets.
20. Desktop contextual right panels.

## 4.2 Explicitly out of scope

- bank synchronization;
- Open Banking / Open Finance;
- automatic transaction import;
- real-time market prices;
- broker integrations;
- real-time FX;
- stock selection/advice;
- taxes;
- advanced portfolio analytics;
- category budget limits;
- custom category management;
- shared/family accounts;
- WhatsApp;
- conversational financial assistant;
- free-form purchase simulator;
- advanced reporting;
- financial-health scores;
- gamification;
- account reconciliation;
- drag-and-drop roadmap editing;
- timeline zoom.

---

# 5. Technical baseline

## 5.1 Frontend

Required:

- React
- TypeScript
- shadcn/ui
- responsive mobile-first implementation

Recommended:

- existing project routing solution or React Router;
- React Hook Form + Zod for non-trivial forms;
- shadcn/Tailwind design tokens;
- `Intl.NumberFormat` / `Intl.DateTimeFormat`.

Do not add global-state libraries unless a real requirement appears.

Prefer local component state for local interactions, feature-level context/reducers for coordinated UI state, and a query/cache layer only when a real backend is connected.

## 5.2 shadcn/ui mapping

Expected primitives:

- `Button`
- `Card`
- `Input`
- `Field`
- `Select`
- `RadioGroup`
- `Progress`
- `Badge`
- `Separator`
- `Skeleton`
- `Toast`
- `Drawer` for mobile bottom sheets
- `Sheet` for desktop right panels
- `Sidebar` for desktop navigation if appropriate
- `ScrollArea`
- `Calendar` / date-picker composition

Custom domain components should compose these primitives.

---

# 6. Suggested frontend structure

```text
src/
  app/
    router/
    providers/
    layouts/

  components/
    ui/
    shared/

  features/
    onboarding/
    home/
    goals/
    finances/
    income/
    expenses/
    contributions/
    investments/
    roadmap/
    recommendations/

  domain/
    money/
    goals/
    projections/
    roadmap/
    cashflow/
    types/

  services/
    repositories/
    api/
    mocks/

  lib/
    formatting/
    dates/
    validation/

  fixtures/
```

Feature code must not depend directly on mock data. Persistence must go through repository/service interfaces.

---

# 7. Navigation and routing

Primary routes:

- `/` → **Inicio**
- `/goals` → **Objetivos**
- `/finances` → **Finanzas**
- `/onboarding` → onboarding

Global action:

**+ Registrar**

Options:

1. Ahorré
2. Invertí
3. Agregar ingreso
4. Agregar gasto

Contextual details should be deep-linkable when practical, e.g. `/goals/:goalId`.

Responsive rendering:

- desktop → right panel;
- mobile → bottom sheet when short, full detail route when necessary.

---

# 8. Core domain model

## 8.1 Money

Do not use formatted strings as calculation values.

```ts
type CurrencyCode = "ARS" | "USD";

interface Money {
  amount: string; // decimal representation
  currency: CurrencyCode;
}
```

Use decimal-safe arithmetic for authoritative calculations. Formatting belongs at the UI boundary.

## 8.2 Financial profile

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

Onboarding values are approximate planning inputs; explicit income/expense records later provide a more accurate picture.

---

# 9. Goal model

```ts
type GoalType =
  | "emergency_fund"
  | "purchase"
  | "retirement"
  | "other";

type GoalPriority = "high" | "medium" | "low";
type GoalStatus = "active" | "completed" | "paused";

interface Goal {
  id: string;
  name: string;
  type: GoalType;

  targetAmount?: Money;
  desiredDate?: string;

  priority: GoalPriority;
  allocationPercent: number;

  strategy: GoalStrategy;
  status: GoalStatus;

  emergencyFundMonths?: number;

  createdAt: string;
  updatedAt: string;
}

type GoalStrategy =
  | { type: "save" }
  | { type: "invest"; investmentId: string };
```

V1 supports one strategy per goal. Do not implement mixed multi-investment strategies.

## 9.1 Emergency fund

Default: **6 months of expenses**.

If expenses are known:

```text
target = monthly expenses × emergencyFundMonths
```

If expenses are unknown:

- target is not calculable;
- projected completion date is unavailable;
- UI shows **Fecha por calcular**;
- user is prompted to add major expenses.

---

# 10. Goal allocation rules

Every active goal has a percentage.

Example:

```text
Colchón 50%
Auto 30%
Retiro 20%
```

Invariant:

```text
Sum(activeGoal.allocationPercent) === 100
```

Allow temporary invalid totals while editing, but do not persist until total equals 100.

Priority is qualitative; allocation is quantitative. Priority must never silently modify allocation.

---

# 11. Planned monthly contribution

There is one global planned monthly contribution.

Example:

```text
$800.000 / month
```

It represents intent, not actual progress.

Future projection distributes it by goal allocation.

---

# 12. Contribution model

```ts
type ContributionType = "saving" | "investment";

interface Contribution {
  id: string;
  type: ContributionType;
  amount: Money;
  occurredAt: string;

  sourceType?: "new_money" | "existing_savings";
  locationLabel?: string;
  investmentId?: string;

  allocations: ContributionAllocation[];

  createdAt: string;
}

interface ContributionAllocation {
  goalId: string;
  percent: number;
  amount: Money;
}
```

Historical allocations must be stored explicitly. Never recalculate past contributions using today's percentages.

---

# 13. Recording “Ahorré”

Flow:

```text
+ Registrar -> Ahorré
```

Fields:

1. **¿Cuánto ahorraste?** — required.
2. **¿Dónde está este dinero?** — optional free text.

Placeholder:

**Ej. Alcancía Mercado Pago**

Before confirmation show automatic allocation.

Example for $500k and 50/30/20:

```text
Así se distribuye tu ahorro

Colchón financiero   $250.000
Auto                  $150.000
Retiro                $100.000
```

Allocation is not editable in this flow.

On confirm:

1. Create contribution.
2. Store allocation snapshot.
3. Recalculate goal progress.
4. Recalculate projections.
5. Rebuild affected roadmap events.
6. Refresh Home.
7. Show subtle success feedback.

---

# 14. Investment model

```ts
type InvestmentAvailability =
  | { type: "anytime" }
  | { type: "from_date"; date: string }
  | { type: "long_term" };

interface Investment {
  id: string;
  name: string;
  currentValue: Money;
  expectedAnnualReturnPercent: number;
  goalId?: string;
  availability: InvestmentAvailability;
  updatedAt: string;
}
```

V1 does not model ticker, quantity, broker, dividends, fees, taxes, volatility, or portfolio composition.

---

# 15. Recording “Invertí”

Flow:

```text
+ Registrar -> Invertí
```

Fields:

1. Amount.
2. Investment.
3. Source:
   - **Dinero nuevo**
   - **Ahorros que ya tenía**

## New money

If the selected investment belongs to Retiro, the whole contribution goes to Retiro. Do not apply global allocation again.

## Existing savings

This is a transfer, not new wealth.

The operation must:

1. reduce relevant saved amount;
2. increase investment value;
3. preserve total financial assets;
4. avoid creating new net contribution.

For V1, only allow transfers from savings associated with the **same goal** as the target investment.

Copy:

> **Esta plata ya formaba parte de tu patrimonio. Sólo cambia dónde está.**

---

# 16. Income

```ts
type RecurrenceFrequency =
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly";

type Schedule =
  | {
      type: "recurring";
      frequency: RecurrenceFrequency;
      startDate: string;
      endDate?: string;
    }
  | {
      type: "one_time";
      date: string;
    };

interface Income {
  id: string;
  concept: string;
  amount: Money;
  schedule: Schedule;
  createdAt: string;
  updatedAt: string;
}
```

Form:

- Concepto
- Monto
- Recurrente / Una sola vez

Recurring default:

**Todos los meses**

---

# 17. Expenses

```ts
type ExpenseCategory =
  | "housing"
  | "groceries"
  | "food"
  | "delivery"
  | "transport"
  | "health"
  | "clothing"
  | "entertainment"
  | "subscriptions"
  | "education"
  | "other";

type ExpenseSchedule =
  | {
      type: "recurring";
      frequency: RecurrenceFrequency;
      startDate: string;
      endDate?: string;
    }
  | {
      type: "one_time";
      date: string;
    }
  | {
      type: "installments";
      installmentAmount: Money;
      installmentCount: number;
      firstInstallmentDate: string;
    };

interface Expense {
  id: string;
  concept: string;
  category: ExpenseCategory;
  schedule: ExpenseSchedule;
  createdAt: string;
  updatedAt: string;
}
```

Categories in UI:

- Vivienda
- Supermercado
- Comida
- Delivery
- Transporte
- Salud
- Ropa
- Entretenimiento
- Suscripciones
- Educación
- Otros

Shortcuts may prefill Alquiler, Obra social, Suscripciones, Servicios, Otro.

No category CRUD.

---

# 18. Monthly cash flow

For each month derive:

```ts
interface MonthlyCashFlow {
  month: string;

  recurringIncome: Money;
  oneTimeIncome: Money;
  totalIncome: Money;

  recurringExpenses: Money;
  installmentExpenses: Money;
  oneTimeExpenses: Money;
  totalExpenses: Money;

  estimatedMargin: Money;
}
```

Calculation:

```text
estimatedMargin = totalIncome - totalExpenses
```

This is an estimate of available margin, not actual savings.

If planned contribution > estimated margin, show a neutral warning; never change the plan automatically.

Example:

> **Tu plan actual requiere aportar aproximadamente $200.000 más de lo que hoy parece quedarte disponible cada mes.**

---

# 19. Installments

Given:

```text
$120.000 × 12
first installment: Jan 2026
```

generate 12 monthly obligations.

Roadmap may show current status:

> **Cuotas — $120.000/mes · 8 de 12 pagadas**

and final event:

> **Terminás las cuotas de la notebook**
>
> **Liberás $120.000 por mes**

Do not render each installment as a major roadmap event.

---

# 20. Projection engine

Projection runs in monthly periods and should live in pure domain functions independent of React.

```ts
interface ProjectionInput {
  asOfDate: string;
  profile: FinancialProfile;
  goals: Goal[];
  contributions: Contribution[];
  investments: Investment[];
  incomes: Income[];
  expenses: Expense[];
}

interface ProjectionResult {
  goalProjections: GoalProjection[];
  monthlyCashFlows: MonthlyCashFlow[];
  roadmapEvents: RoadmapEvent[];
  warnings: ProjectionWarning[];
}
```

---

# 21. Goal progress

Conceptually:

```text
current goal value
=
actual savings still assigned to goal
+
current value of investments assigned to goal
```

A savings→investment transfer must not increase goal progress by itself.

```text
progressPercent = currentGoalValue / currentTargetValue × 100
```

UI progress is clamped to 0–100%.

---

# 22. Future contribution projection

For each future month:

```text
goalMonthlyContribution
=
plannedMonthlyContribution
× allocationPercent
```

For `save`:

```text
futureValue(n+1) = futureValue(n) + monthlyGoalContribution
```

For `invest`:

```text
monthlyRate = (1 + annualRate)^(1/12) - 1

futureValue(n+1)
=
futureValue(n) × (1 + monthlyRate)
+ monthlyGoalContribution
```

All investment projections must be presented as estimates, never guarantees.

---

# 23. Completion date

For goals with a calculable target, iterate monthly until:

```text
projectedGoalValue >= projectedTargetValue
```

Display:

- `Marzo de 2027`
- `Aprox. 2055`

Never show fake day-level precision.

Projection safety:

```ts
MAX_PROJECTION_YEARS = 60;
MAX_PROJECTION_MONTHS = 720;
```

If not reached within horizon, return an explicit `not_reached_within_horizon` state rather than a fake date.

---

# 24. Currency limitation for V1

Cross-currency projection is intentionally unresolved.

Rules:

1. Same-currency goal and contributions → calculate normally.
2. Different currencies without an explicit normalization strategy → do not infer exchange rate.
3. UI shows **Proyección pendiente** rather than generating a fake conversion.

Real-time FX is out of scope.

The demo fixture may contain a USD goal with a precomputed date, but production calculation must not infer FX.

---

# 25. Inflation/indexed goals

Do not add macroeconomic assumptions in V1.

Architect for future target strategies, but implement only a fixed target amount initially.

---

# 26. Goal creation and redistribution

Goal types:

- Colchón financiero
- Compra / ahorro
- Retiro
- Otro

Generic fields:

- Nombre
- Monto objetivo
- Moneda
- Fecha deseada — optional
- Prioridad
- Porcentaje de aportes

Adding a goal cannot silently break the 100% allocation invariant.

Flow:

1. Enter goal.
2. Propose new allocation.
3. Show impact preview.
4. User accepts/edits.
5. Persist goal + new allocation atomically.

---

# 27. Allocation history

Persist allocation-plan snapshots:

```ts
interface AllocationPlanSnapshot {
  id: string;
  effectiveFrom: string;
  allocations: Array<{
    goalId: string;
    percent: number;
  }>;
}
```

This ensures:

- past contributions preserve original allocation;
- future contributions use current allocation;
- roadmap can explain plan changes.

---

# 28. Goal completion

When a goal completes:

1. mark it completed;
2. preserve history;
3. remove it from future allocation;
4. do not silently redistribute its percentage;
5. propose a new distribution;
6. require confirmation.

Copy:

> **Completaste tu colchón financiero**

> **El 50% de tus aportes que estaba destinado a este objetivo ahora está disponible para tus otros objetivos.**

---

# 29. Recommendations

V1 supports only:

```ts
type RecommendationType =
  | "catch_up"
  | "change_monthly_plan"
  | "reallocate_goals"
  | "use_extra_income";
```

Recommendations are deterministic rules, not a general AI advisor.

Examples:

- **Ponerte al día:** add extra amount for next N months.
- **Cambiar el plan:** reduce planned contribution.
- **Redistribuir:** move allocation toward a higher-priority goal.
- **Usar ingreso extraordinario:** optionally direct bonus toward a goal.

No recommendation mutates state before user confirmation.

---

# 30. Impact preview

```ts
interface PlanImpactPreview {
  before: GoalProjection[];
  after: GoalProjection[];
  deltas: GoalProjectionDelta[];
}
```

Required for:

- allocation changes;
- monthly-plan changes;
- adding a goal;
- trajectory-changing recommendations.

UI:

```text
ANTES

Auto
Agosto 2028

Retiro
Aprox. 2055


CON ESTE CAMBIO

Auto
Marzo 2028
5 meses antes

Retiro
Aprox. 2056
~1 año más tarde
```

---

# 31. Roadmap domain model

```ts
type RoadmapTemporalStatus =
  | "actual"
  | "today"
  | "projected";

type RoadmapImportance =
  | "routine"
  | "trajectory"
  | "milestone";

type RoadmapEventType =
  | "income_summary"
  | "expense_summary"
  | "installment_status"
  | "installment_end"
  | "saving_contribution"
  | "investment_contribution"
  | "one_time_income"
  | "one_time_expense"
  | "goal_progress_milestone"
  | "goal_completed"
  | "goal_added"
  | "allocation_changed"
  | "monthly_plan_changed"
  | "contribution_deviation"
  | "recommendation_applied"
  | "available_margin_changed"
  | "investment_projection"
  | "long_term_goal";

interface RoadmapEvent {
  id: string;
  type: RoadmapEventType;
  temporalStatus: RoadmapTemporalStatus;
  importance: RoadmapImportance;
  date: string;
  title: string;
  description?: string;
  amount?: Money;
  goalId?: string;
  investmentId?: string;
  metadata?: Record<string, unknown>;
}
```

---

# 32. Roadmap event inventory

The UI must support all of these.

## Grouped monthly income

> **Ingresos del mes**
>
> **+$5.350.000**
>
> Sueldo + freelance

`routine`

## Grouped monthly expenses

> **Gastos del mes**
>
> **−$3.300.000**
>
> Vivienda, supermercado, salud, servicios y otros

`routine`

## Installment status

> **Cuotas**
>
> $120.000/mes · 8 de 12 pagadas

## Installment end

> **Terminás las cuotas de la notebook**
>
> **Liberás $120.000 por mes**

`trajectory`

## Saving contribution

> **Ahorraste $500.000**
>
> Distribuido entre tus objetivos

## Investment contribution

> **Invertiste $300.000**
>
> ETF para retiro

## One-time income

> **Bono anual**
>
> **+$2.000.000**

## One-time expense

> **Vacaciones**
>
> **−$1.500.000**

## Goal milestone

> **Colchón de 3 meses**
>
> $9.000.000 acumulados

`milestone`

## Goal completed

> **Colchón financiero completo**
>
> $18.000.000
>
> 6 meses de gastos cubiertos

`milestone`

## Goal added

> **Agregaste un nuevo objetivo**
>
> Cambiar el auto

## Allocation changed

> **Cambiaste la distribución de tus aportes**
>
> Auto 20% → 30%
>
> Retiro 30% → 20%

## Planned contribution changed

> **Ajustaste tu aporte mensual**
>
> $700k → $800k por mes
>
> El auto se adelanta aproximadamente 4 meses

## Contribution deviation

> **Aportaste menos de lo planificado**
>
> Plan $800k · Real $500k
>
> El colchón se retrasó ~3 semanas

## Recommendation applied

> **Ajustaste tu plan**
>
> Sumaste $150k adicionales para septiembre y octubre
>
> Recuperás la fecha original del colchón

## Available margin changed

> **Tenés $200.000 más disponibles por mes**
>
> Terminó un gasto recurrente

## Investment projection

> **ETF para retiro**
>
> Valor proyectado: ~$18M
>
> Rentabilidad estimada: 8% anual

## Long-term goal

> **Retiro**
>
> Objetivo de largo plazo

---

# 33. Roadmap behavior

Visually distinguish:

- actual past;
- today;
- projected future.

Required semantics:

```text
actual -> solid line
today -> strong marker
projected -> lighter/dashed line
```

Do not rely only on color.

Timeline is adaptive, not proportional:

```text
MAY 2026
JUN 2026
JUL 2026

HOY · AGO 2026

SEP 2026
OCT 2026
...
MAR 2027
...
AGO 2028
...
2030
...
2055
```

Near-term periods have more detail. Long-term periods are compressed.

Routine activity is grouped monthly; do not show every transaction.

---

# 34. Roadmap interaction

Every meaningful event is interactive.

Mobile:

- tap → `Drawer`.

Desktop:

- click → right `Sheet`.

Detail may show:

- amount;
- breakdown;
- related goal;
- projection explanation;
- related action.

No inline roadmap editing.

---

# 35. Home — established user

Order is mandatory:

1. Compact monthly status.
2. Roadmap.
3. Compact goal summary.
4. Compact contribution allocation.

## Monthly status

Example:

### AGOSTO

**Vas bien con tu plan**

**$500k de $800k aportados este mes**

CTA:

**Registrar aporte**

Keep this compact enough that the roadmap begins near the top of the first viewport.

## Roadmap

Title:

**Tu hoja de ruta**

This is the largest and most differentiated Home section.

## Goals summary

**Tus objetivos** + **Ver todos**

Compact cards only.

## Contribution summary

**Próximos aportes**

**50% Colchón · 30% Auto · 20% Retiro**

CTA:

**Ajustar distribución**

---

# 36. Home — new user

After onboarding with unknown expenses:

# Tu plan está empezando a tomar forma

```text
Ingresos mensuales
~$4.500.000

Gastos mensuales
Todavía no sabemos

Aporte planificado
$600.000
```

Goal:

### Colchón financiero

> **Necesitamos conocer mejor tus gastos para calcular cuánto necesitás.**

CTA:

**Agregar mis gastos principales**

Suggestions:

- Alquiler
- Obra social
- Servicios
- Suscripciones

Roadmap remains visible in incomplete state:

> **Colchón financiero — Fecha por calcular**

---

# 37. Onboarding

Title:

# Vamos a construir tu perfil financiero

Intro:

> **Empecemos con algunos datos básicos. No tienen que ser exactos y podés cambiarlos después.**

Four steps:

1. First goal — emergency fund selected by default.
2. Approximate monthly income.
3. Approximate monthly expenses, with **No sé todavía**.
4. Planned monthly contribution.

Final CTA:

**Ver mi plan**

No login, bank sync, or long financial questionnaire in this flow.

---

# 38. Goals page

Route:

`/goals`

Title:

**Objetivos**

CTA:

**+ Nuevo objetivo**

Cards show:

- name;
- progress;
- current/target where calculable;
- allocation;
- projected date;
- behind/ahead status when desired date exists.

---

# 39. Goal detail

Example:

### Cambiar el auto

```text
Progreso
37%

Objetivo
USD 20.000

Asignación
30%

Fecha proyectada
Agosto de 2028

Fecha deseada
Diciembre de 2028

Estrategia
Ahorrar
```

Also show associated savings/investments and a small goal-specific trajectory when useful.

Desktop: right `Sheet`.  
Mobile: `Drawer` if short, detail route if too long.

---

# 40. Finances page

Route:

`/finances`

Top:

**Este mes**

- Ingresos esperados
- Gastos esperados
- Margen estimado
- Aporte planificado
- Aporte real

Then:

## Ingresos
Recurring + one-time. CTA **Agregar ingreso**.

## Gastos
Recurring + installments + one-time. CTA **Agregar gasto**.

## Ahorros e inversiones
Current goal-related assets.

## Actividad reciente
Small chronological list.

No advanced filters/search/reports.

---

# 41. Investment detail

Example:

### ETF para retiro

```text
Valor actual
$10M

Rentabilidad estimada
8% anual

Objetivo
Retiro

Disponibilidad
Largo plazo
```

CTA:

**Actualizar valor**

Updating value triggers progress/projection/roadmap recalculation.

---

# 42. Plan deviation flow

At month close compare actual contribution vs plan.

Example:

# Este mes aportaste menos de lo planificado

```text
Planeabas aportar
$800k

Aportaste
$500k
```

Impact:

> **Tu colchón ahora se proyecta aproximadamente 3 semanas más tarde.**

Actions:

- **Ponerte al día**
- **Ajustar tu plan**
- **Mantener así**

Any trajectory-changing action shows before/after preview before persistence.

---

# 43. UI states

Every feature must define:

- loading;
- empty;
- error;
- success;
- incomplete-data.

Incomplete data is not an error.

Example:

> **Todavía necesitamos conocer tus gastos para calcular esta fecha.**

Use skeletons for loading.

Success should usually be contextual refresh + subtle toast, not a blocking modal.

Persistence errors must preserve entered form data and allow retry.

---

# 44. Form behavior

Requirements:

- visible labels;
- helper text where needed;
- inline validation;
- numeric mobile keyboard for money;
- preserve invalid user input for correction;
- normalize money before domain use.

Money input should handle Argentine separators reliably.

---

# 45. Responsive requirements

## Mobile

Primary target:

- persistent bottom navigation;
- large touch targets;
- timeline rail toward the left;
- bottom `Drawer` for contextual details;
- avoid horizontal scroll except optional compact goal carousel.

## Desktop

- persistent navigation/sidebar;
- central content;
- optional right detail panel;
- roadmap given dominant space.

Do not simply stretch mobile UI.

---

# 46. Accessibility

Required:

- semantic controls;
- keyboard navigation;
- visible focus;
- associated labels/errors;
- focus management for Drawer/Sheet;
- roadmap meaning not based only on color;
- textual progress equivalents;
- sufficient contrast;
- accessible icon labels;
- respect reduced-motion preference.

---

# 47. Domain component inventory

Shared:

- `AppShell`
- `MobileBottomNav`
- `DesktopSidebar`
- `GlobalRecordButton`
- `Money`
- `Percentage`
- `ProjectedDate`
- `StatusMessage`
- `EmptyState`
- `WarningCallout`

Goals:

- `GoalCard`
- `CompactGoalCard`
- `GoalProgress`
- `GoalDetail`
- `AllocationSummary`
- `AllocationEditor`
- `GoalImpactRow`

Contributions:

- `RecordActionMenu`
- `SavingForm`
- `SavingAllocationPreview`
- `InvestmentContributionForm`

Finances:

- `MonthlyCashFlowSummary`
- `IncomeList`
- `ExpenseList`
- `InstallmentItem`
- `InvestmentCard`

Roadmap:

- `FinancialRoadmap`
- `RoadmapSegment`
- `RoadmapEventItem`
- `RoadmapMilestone`
- `TodayMarker`
- `CompressedPeriod`
- `RoadmapEventDetail`

Recommendations:

- `RecommendationCard`
- `PlanImpactPreview`
- `BeforeAfterGoalRow`

---

# 48. Formatting utilities

Centralize formatting:

```ts
formatMoney(money: Money): string
formatCompactMoney(money: Money): string
formatPercent(value: number): string
formatMonthYear(date: string): string
formatApproximateYear(date: string): string
formatMonthDelta(months: number): string
```

Examples:

- `$4.500.000`
- `$4,5M`
- `50%`
- `Marzo de 2027`
- `Aprox. 2055`
- `~3 meses antes`

Never duplicate financial formatting logic inside feature components.

---

# 49. Repository boundary

Feature components should depend on interfaces, not concrete mock/API implementations.

```ts
interface GoalsRepository {
  list(): Promise<Goal[]>;
  get(id: string): Promise<Goal>;
  create(input: CreateGoalInput): Promise<Goal>;
  update(id: string, input: UpdateGoalInput): Promise<Goal>;
}

interface ContributionsRepository {
  list(): Promise<Contribution[]>;
  recordSaving(input: RecordSavingInput): Promise<Contribution>;
  recordInvestment(input: RecordInvestmentInput): Promise<Contribution>;
}

interface FinancesRepository {
  getProfile(): Promise<FinancialProfile>;
  updateProfile(input: UpdateFinancialProfileInput): Promise<FinancialProfile>;

  listIncome(): Promise<Income[]>;
  createIncome(input: CreateIncomeInput): Promise<Income>;

  listExpenses(): Promise<Expense[]>;
  createExpense(input: CreateExpenseInput): Promise<Expense>;

  listInvestments(): Promise<Investment[]>;
  createInvestment(input: CreateInvestmentInput): Promise<Investment>;
  updateInvestment(id: string, input: UpdateInvestmentInput): Promise<Investment>;
}
```

---

# 50. Suggested API shape

```text
GET    /profile
PATCH  /profile

GET    /goals
POST   /goals
GET    /goals/:id
PATCH  /goals/:id

POST   /plans/allocation-preview
POST   /plans/apply-allocation
POST   /plans/contribution-preview
PATCH  /plans/monthly-contribution

GET    /income
POST   /income
PATCH  /income/:id
DELETE /income/:id

GET    /expenses
POST   /expenses
PATCH  /expenses/:id
DELETE /expenses/:id

GET    /investments
POST   /investments
PATCH  /investments/:id

GET    /contributions
POST   /contributions/savings
POST   /contributions/investments

GET    /roadmap
GET    /projections

GET    /recommendations
POST   /recommendations/:id/apply
```

Preview endpoints must not mutate state.

---

# 51. Demo data

Established user fixture:

```text
Income: ARS 4,500,000/month
Expenses: ARS 3,300,000/month
Planned contribution: ARS 800,000/month
Actual contribution this month: ARS 500,000
```

### Colchón financiero

```text
Target: ARS 18,000,000
Current: ARS 11,500,000
Progress: 64%
Allocation: 50%
Priority: High
Projected: March 2027
Strategy: Save
```

### Cambiar el auto

```text
Target: USD 20,000
Progress: 37%
Allocation: 30%
Priority: Medium
Projected demo fixture: August 2028
Strategy: Save
```

### Retiro

```text
Allocation: 20%
Projected horizon: ~2055
Strategy: Invest
```

### ETF para retiro

```text
Current value: ARS 10,000,000
Expected annual return: 8%
Availability: Long term
Goal: Retirement
```

---

# 52. Analytics

Suggested events:

```text
onboarding_started
onboarding_completed
onboarding_expenses_unknown_selected

home_viewed
roadmap_event_opened

goal_created
goal_updated
goal_completed

allocation_previewed
allocation_changed

saving_record_started
saving_recorded

investment_record_started
investment_recorded

income_added
expense_added
investment_created

recommendation_viewed
recommendation_impact_previewed
recommendation_applied

monthly_plan_changed
```

Avoid raw financial amounts in analytics unless explicitly approved.

---

# 53. Privacy/security

- Do not log raw financial payloads in production.
- Do not send amounts into error breadcrumbs unless sanitized.
- Do not store production financial state in localStorage unless deliberately required.
- Keep mock storage isolated from production.
- Do not put sensitive financial values in URLs.
- Client-side authorization never replaces backend authorization once accounts exist.
- Auth is outside this PRD, but code must not assume globally accessible user data.

---

# 54. Performance

- Render app shell before financial data resolves.
- Avoid full multi-decade projection on every keystroke.
- Memoize/cache projection results from stable domain inputs.
- Trigger impact previews after valid form changes, not every input character.
- Do not rerender the whole app on money-input keystrokes.
- Only virtualize the roadmap if real event volume proves it necessary.

Correctness and simplicity before premature optimization.

---

# 55. Validation

Profile:

- planned contribution > 0
- approximate income >= 0
- approximate expenses >= 0 when known

Goal:

- name required
- allocation 0–100
- target > 0 when required
- desired date not in past for new goals
- emergency-fund months > 0

Allocation plan:

- exactly 100 before save

Income:

- concept required
- amount > 0
- valid schedule

Expense:

- concept required
- category required
- amount > 0
- installment count positive integer
- first installment date required

Investment:

- name required
- value >= 0
- valid numeric expected return
- availability date required for `from_date`

Contribution:

- amount > 0
- active goal exists for `Ahorré`
- allocations equal total contribution
- investment selected for `Invertí`

---

# 56. Allocation rounding

Percentage allocation can produce fractions.

Implement deterministic remainder handling:

1. Calculate using decimal-safe arithmetic.
2. Round to currency precision.
3. Assign remaining minor-unit difference deterministically.
4. Guarantee:

```text
sum(allocation amounts) === contribution amount
```

Displayed allocations must always add up exactly to the user's contribution.

---

# 57. Editing/deletion

V1 allows correcting:

- income;
- expenses;
- goals;
- investments;
- contributions.

Projection-affecting edits trigger recalculation.

Recurring income/expense edits offer only:

- **Desde este mes en adelante**
- **Sólo este mes**

No complex recurrence editor.

---

# 58. Acceptance criteria — critical flows

## Onboarding

1. New user sees “Vamos a construir tu perfil financiero”.
2. Emergency fund is default.
3. User can enter approximate income.
4. User can choose “No sé todavía” for expenses.
5. User enters planned contribution.
6. Completes onboarding.
7. Lands on Home.
8. Unknown expenses produce incomplete emergency-fund target/date, never guessed values.

## Record savings

1. Tap `+ Registrar`.
2. Choose `Ahorré`.
3. Enter $500k.
4. See 50/30/20 allocation preview.
5. Confirm.
6. Allocation snapshot stored.
7. Goal progress updates.
8. Roadmap adds actual event.
9. Projections refresh.

## Record new-money investment

1. Choose `Invertí`.
2. Select ETF.
3. Select Dinero nuevo.
4. Contribution goes directly to ETF's goal.
5. Global goal allocation is not applied.

## Transfer existing savings

1. Choose existing savings.
2. Only same-goal eligible source shown.
3. Saved position decreases.
4. Investment increases.
5. Goal total is unchanged solely by transfer.
6. Total financial assets unchanged solely by transfer.

## Add goal

1. Create new goal.
2. Redistribution required.
3. Proposed allocation shown.
4. Impact preview shown.
5. Nothing saved before confirmation.
6. Persisted allocations sum 100.
7. Roadmap records plan change.

## Plan deviation

1. Compare actual vs planned.
2. Show impact in goal-date terms.
3. Offer corrective actions.
4. Trajectory-changing action previews before/after.
5. Applying updates projections and roadmap.

---

# 59. Testing priorities

Highest-risk logic is calculations.

Unit test:

1. Allocation invariant.
2. Allocation rounding.
3. Historical allocation snapshot.
4. Emergency-fund target.
5. Unknown-expense behavior.
6. Recurring income.
7. Recurring expenses.
8. Installment schedule.
9. Installment end.
10. Monthly cash flow.
11. Planned vs actual.
12. Save projection.
13. Compound investment projection.
14. Completion date.
15. Projection horizon exceeded.
16. Savings→investment transfer without double count.
17. Goal completion/released allocation.
18. Before/after delta.
19. Grouped roadmap income.
20. Grouped roadmap expenses.
21. Actual/today/projected classification.

Also test critical forms and end-to-end user flows.

---

# 60. Definition of Done

A feature is done when:

- requirements and acceptance criteria pass;
- mobile and desktop behavior exists;
- all user-facing copy is Argentine Spanish;
- loading/empty/error/incomplete states exist;
- keyboard accessibility works;
- calculation logic has tests;
- shared formatting utilities are used;
- fixtures do not leak into production logic;
- existing design tokens/components are reused;
- no unrelated features were added.

---

# 61. Development phases

## Phase 1 — Foundation
- React shell
- shadcn theme/primitives
- responsive nav
- Drawer/Sheet
- repositories
- mock data
- formatting

## Phase 2 — Basic profile
- onboarding
- profile persistence
- new-user Home
- emergency fund incomplete state

## Phase 3 — Financial entities
- income
- expenses
- installments
- investments
- goals
- planned contribution
- allocation editor

## Phase 4 — Actual contributions
- Ahorré
- allocation preview
- Invertí
- existing-savings transfer
- actual progress

## Phase 5 — Projection engine
- cash flow
- saving projection
- investment projection
- completion dates
- warnings

## Phase 6 — Roadmap
- event builder
- timeline
- past/today/future
- grouping
- compression
- Drawer/Sheet details

## Phase 7 — Plan changes
- goal redistribution
- allocation history
- before/after
- completed-goal redistribution

## Phase 8 — Deviations/recommendations
- monthly deviation
- catch-up
- plan change
- reallocation
- extraordinary income

## Phase 9 — Hardening
- responsive pass
- accessibility
- calculation tests
- errors
- consistency
- performance

---

# 62. Deferred product decisions

## Cross-currency goals

How should ARS contributions be projected against a USD target?

Do not invent FX behavior.

## Inflation/indexed targets

How should goals like cars/houses change price over time?

V1 uses fixed target calculations.

## Roadmap materiality

What makes an individual event important enough to show instead of grouping it?

V1 may explicitly mark fixture/manual events as material.

## Deviation threshold

Should a recommendation trigger on any shortfall, a percentage, an amount, or repeated pattern?

V1 can trigger at month close when actual < planned and the difference materially moves a projected goal date.

## Retirement calculation

A full retirement model requires additional assumptions. V1 treats retirement as a long-term investment goal with a fixture/projected horizon rather than a full retirement engine.

---

# 63. Core implementation success condition

A user should understand this loop without explanation:

1. **Tengo objetivos.**
2. **Tengo un plan de cuánto aportar.**
3. **Registro lo que realmente ahorré o invertí.**
4. **NORTE actualiza mi hoja de ruta.**
5. **Veo cuándo llegaría a cada objetivo.**
6. **Si cambia algo, veo cómo cambia el futuro.**
7. **Puedo ajustar el plan.**

Within seconds, Home should communicate:

> **“Esta app me muestra hacia dónde van mis finanzas y cómo las decisiones de hoy cambian mis objetivos futuros.”**

If the product instead feels primarily like an app for expenses, transactions, and categories, the implementation has missed the core requirement.

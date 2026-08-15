# NORTE Product Requirements Document

**Status:** Draft v2  
**Product:** NORTE  
**Target:** Mobile-first responsive web application  
**Primary UI language:** Spanish (Argentina)

## Product intent

NORTE is a personal financial-planning product centered on goals and future
trajectory, not retrospective expense tracking. It should quickly answer:

> **¿Voy camino a cumplir mis objetivos?**

The product loop is:

**Objetivos -> Plan -> Acciones reales -> Recalcular trayectoria -> Mostrar impacto -> Ajustar plan**

Income, expenses, savings, installments, and investments are inputs to that
trajectory. The financial roadmap is the primary differentiated surface: a
single timeline connecting actual history, today, future cash-flow changes,
projected milestones, goal completion, and plan changes.

## Product principles

- Goals and trajectory take priority over transactions, categories, and charts.
- A plan is future intent. Actual goal progress changes only through explicit
  recorded savings or investments.
- Meaningful trajectory changes show an **Antes -> Con este cambio** preview
  before confirmation.
- Use neutral, non-judgmental Argentine Spanish with voseo.
- Onboarding is progressive: incomplete data is honest and actionable, never
  fabricated.
- Apply YAGNI. Features that do not serve the product loop are out of scope.

## Specification suite

Implementation detail is owned by the following feature specifications. Each
is self-contained and links to its dependencies instead of duplicating shared
rules.

1. [Foundations and financial model](./specs/foundations-and-financial-model.md)
2. [Onboarding and initial plan](./specs/onboarding-and-initial-plan.md)
3. [Goals and allocation](./specs/goals-and-allocation.md)
4. [Contributions and investments](./specs/contributions-and-investments.md)
5. [Income, expenses, and cash flow](./specs/income-expenses-and-cash-flow.md)
6. [Home and financial roadmap](./specs/home-and-financial-roadmap.md)
7. [Plan deviations and recommendations](./specs/plan-deviations-and-recommendations.md)

## Shared boundaries

- Production MVP: React, TypeScript, existing shadcn/ui primitives, Clerk
  authentication, TanStack server actions, and PostgreSQL/Drizzle persistence.
  Screens invoke server actions; server actions derive the authenticated user
  and access the database.
- Code, component names, types, and API contracts are English. User-facing
  content is natural Argentine Spanish with voseo.
- The domain glossary is maintained in [CONTEXT.md](../CONTEXT.md).
- Use decimal-safe money arithmetic. Formatted values are only for display.
- Mobile uses bottom navigation and contextual Drawers; desktop uses persistent
  navigation and contextual Sheets. Accessibility, loading, error, empty,
  success, and incomplete-data states are mandatory for every feature.
- No bank synchronization, automatic imports, real-time FX/market data, broker
  integration, tax handling, advanced analytics, shared accounts, chat advisor,
  gamification, or roadmap drag/zoom are included in the MVP.

## Deferred product decisions

The feature specifications must preserve these boundaries rather than invent a
solution:

- Cross-currency projection and FX normalization.
- Inflation or indexed goal targets.
- Full retirement modeling.
- Roadmap event materiality beyond the documented grouped-event rules.
- The threshold that makes a month-close deviation actionable.

## Planning workflow

Each feature specification is planned through its own Wayfinder map. The map
resolves the feature's remaining decisions into implementation tasks; it does
not expand the MVP beyond this document's scope. Pencil prototypes in
`docs/norte.pen` are reviewed in the relevant feature's future Wayfinder
session, not during this documentation split.

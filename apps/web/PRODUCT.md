# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Argentine adults managing personal finances who need to understand how everyday decisions affect their long-term goals.

## Product Purpose

Norte is a personal financial-planning product that helps people answer: "¿Voy camino a cumplir mis objetivos?" It connects goals, a future plan, recorded actions, recalculated trajectory, and the impact of changes so people can adjust their plan with clarity.

## Positioning

Norte is goal- and trajectory-led, rather than a retrospective expense tracker: its financial roadmap joins actual history, the present, future cash-flow changes, projected milestones, goal completion, and plan changes in one view.

## Operating Context

People use Norte when setting financial goals, recording savings or investments, considering relevant purchases or installment plans, and revising income, expenses, or priorities. The product must distinguish future intent from actual recorded progress.

## Capabilities and Constraints

- The MVP supports onboarding, goals and allocation, contributions and investments, income, expenses, installments, cash flow, a financial roadmap, plan-impact previews, and deterministic recommendations.
- User-facing copy is neutral Argentine Spanish with voseo; code, component names, types, and API contracts are English.
- The product uses React, TypeScript, shadcn/ui primitives, Clerk authentication, TanStack server actions, PostgreSQL/Drizzle persistence, and decimal-safe money arithmetic.
- The MVP excludes bank synchronization, automatic imports, real-time FX or market data, broker integration, tax handling, advanced analytics, shared accounts, chat advisors, gamification, and roadmap drag or zoom.
- Cross-currency projection and FX normalization, inflation or indexed targets, full retirement modeling, roadmap event materiality, and actionable deviation thresholds remain undecided.

## Brand Commitments

Norte uses calm, non-judgmental language: money decisions must not be moralized, blamed, or made shameful.

## Evidence on Hand

- Product requirements: `../../docs/NORTE-PRD-development-spec.md`
- Feature specifications: `../../docs/specs/`
- Existing visual assets: `public/images/`
- Do not fabricate testimonials, customers, benchmarks, pricing, licensing, or deployment claims.

## Product Principles

- Prioritize goals and trajectory over transactions, categories, and charts.
- Treat plans as future intent; only explicit recorded savings or investments change actual goal progress.
- Show meaningful trajectory changes as an "Antes -> Con este cambio" preview before confirmation.
- Keep incomplete data honest and actionable rather than fabricated.
- Apply YAGNI: exclude features that do not serve the core product loop.

## Accessibility & Inclusion

Preserve responsive mobile-first behavior, keyboard access, focus management, reduced-motion support, clear loading/error/empty/incomplete states, and information that does not rely on color alone.

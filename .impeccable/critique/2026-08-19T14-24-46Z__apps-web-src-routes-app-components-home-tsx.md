---
target: Home and financial onboarding
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
timestamp: 2026-08-19T14-24-46Z
slug: apps-web-src-routes-app-components-home-tsx
---
# Home and Financial Onboarding Critique

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of system status | 3 | Plan assumptions and retry status are visible. |
| 2 | Match system / real world | 2 | ARS contribution under an `Ahorrar USD` label is cognitively awkward. |
| 3 | User control and freedom | 2 | Mobile fixed navigation interferes with the final action. |
| 4 | Consistency and standards | 2 | Home remains a generic stack of equal-weight cards. |
| 5 | Error prevention | 2 | Responsive test does not catch the CTA collision. |
| 6 | Recognition rather than recall | 3 | Rate and effective month are disclosed in context. |
| 7 | Flexibility and efficiency | 2 | Final onboarding action requires scrolling around fixed navigation. |
| 8 | Aesthetic and minimalist design | 3 | Calm visual language, but the contribution amount is repeated. |
| 9 | Error recovery | 3 | Server error preserves fields, focuses the alert, and retries. |
| 10 | Help and documentation | 1 | Projection horizon language is unexplained. |
| **Total** | | **23/40** | **Needs focused refinement** |

## Design Specificity Verdict

The calm palette, Fraunces/Geist pairing, and Argentine copy fit Norte, but the composition remains category-interchangeable. Income and expense cards dominate before the goal trajectory, while the distinctive Plan-to-actual relationship is visually secondary. The deterministic detector reported zero source-pattern violations; browser inspection found the mobile CTA collision that static scanning missed.

## What's Working

- The four-step onboarding has clear progress and accessible screen-reader context.
- The final preview discloses destination currency, planning rate, and effective month before persistence.
- Persistence failures preserve values, focus the error, and offer a clear retry action.

## Priority Issues

- **P1 Mobile CTA overlap:** At 390px, the fixed bottom navigation overlaps the step-four action region. Reserve navigation plus safe-area space or avoid the fixed app navigation during onboarding.
- **P2 Trajectory hierarchy:** Home gives income and expenses more visual priority than projected completion and Goal progress. Promote trajectory and current-vs-target status; make cash inputs supporting context.
- **P2 Repeated contribution copy:** Step four renders the same ARS amount in both `Equivale a ...` and `Aportás ...`. Keep one statement and pair it directly with the USD estimate.
- **P2 Incomplete progress context:** `Tus avances` shows only zero and an empty-state sentence, without `0 de target` or percentage. Show the relationship to the Goal target.

## Persona Red Flags

- A mobile first-time user can reach the final decision with the primary action partially covered by navigation.
- A financially anxious user may read `Ahorrar USD` as an instruction to purchase dollars rather than a destination estimate funded in ARS.
- A returning user cannot quickly scan current-versus-target progress from `Tus avances`.

## Minor Observations

- `No alcanzado dentro del horizonte` exposes internal modeling language without explaining the 60-year horizon.
- The added Home sections preserve the visual system, but repeated card treatment weakens hierarchy.

## Questions to Consider

- Should onboarding hide app navigation until completion, or should the content reserve a larger safe-area footer?
- Should Home lead with projected trajectory, or retain income/expenses as the first summary?

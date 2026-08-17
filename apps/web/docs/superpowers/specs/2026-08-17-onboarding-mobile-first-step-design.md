# Onboarding Mobile First-Step Design

## Goal

Make the first financial-onboarding step complete without scrolling on a 390 x 844 mobile viewport, so its primary action is visible immediately.

## Scope

- Reduce the mobile `/app` header height from 64px to 56px while preserving its logo, account control, and accessible touch targets.
- Reduce mobile-only spacing around the onboarding progress indicator and form shell.
- Make only step 1's goal options denser on mobile.
- Keep the emergency-fund explanation available in a collapsed native disclosure; show its concise recommendation in the option row.
- Preserve the current four-step flow, selected defaults, validation, copy meaning, desktop layout, and steps 2 through 4.

## Layout Requirement

At 390 x 844, the header, progress indicator, full step-1 content, and `Continuar` must fit in the viewport without page scrolling. The primary action remains in normal document flow rather than becoming sticky.

## Verification

- Existing FinancialOnboarding behavior tests pass.
- Typecheck passes, followed by the full test suite.
- Browser inspection at 390 x 844 confirms the no-scroll requirement, readable labels, keyboard focus, and a usable disclosure.
- Desktop inspection confirms the existing layout is preserved.

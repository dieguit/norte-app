# App Subtle Grid Surface Design

## Goal

Align `/app` with Norte's homepage by revealing the existing sand grid behind the application content while preserving the calm, operational character of the product.

## Scope

- Let the global grid remain visible through the app content area.
- Keep the navigation surfaces readable with their existing translucent header treatment.
- Give dashboard cards a lightly translucent white surface, retaining their borders, ambient shadow, text contrast, and existing responsive layouts.

## Exclusions

- No changes to routes, content, data, interactions, navigation structure, or component APIs.
- No new assets, dependencies, tokens, or visual effects.

## Verification

- Typecheck passes.
- Existing app-shell and home tests pass, followed by the full suite.
- Inspect `/app` at desktop and mobile widths to confirm the grid is subtle and text remains readable.

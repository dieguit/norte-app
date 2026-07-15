# Onboarding Questionnaire Design

## Scope

Replace the current three-step English assessment at `/onboarding` with the Spanish questionnaire in `apps/web/src/onboarding/preguntas.md`. Each P1-P23 is one wizard step. Questions P16-P20 repeat once for each credit card selected in P15.

The existing welcome, draft persistence, navigation, visual shell, and completion state remain. A Spanish welcome screen precedes P1 but does not collect an answer.

## Step Definition And Flow

- Replace the static field-only step definition with a declarative question definition that includes fields, controls, validation, and answer-based visibility.
- The route derives its active steps from the current answers on every render. Navigation and progress use this active list, so non-applicable follow-ups and absent cards are not counted.
- Back navigation never clears answers. When an earlier answer makes a later follow-up inapplicable, that follow-up is omitted from navigation and progress.
- P6 appears only when P5 includes `Aportes de un tercero`.
- P7 shows amount and month/year for `Aguinaldo` or `Otro ya confirmado`; `No` has no follow-up.
- P8 shows frequency, percentage, and expected next increase when the user reports an increase.
- P10 opens four independent concept, monthly-payment, and month/year rows after `Si`.
- P13 contains one decision field for each discretionary expense with a completed amount in P12.
- P14 opens three independent concept-and-amount rows after `Si`.
- P15 selects zero to five cards. Selecting zero proceeds directly to the closing questions; selecting cards creates P16-P20 for each card.
- P17 presents modes A, B, and C. Mode A is visible but disabled as `Proximamente`; B and C show their respective manual fields. P18 and P19 remain available for every card.

## Fields And Validation

- All visible copy, navigation labels, errors, completion copy, and placeholders are in Spanish and follow Norte's direct, lightly ironic tone.
- Use single-choice controls for choices and yes/no answers, checkboxes for P2, P3, and P5, numeric fields for amounts, text fields for concepts, and month/year inputs for dated events.
- P2 and P3 permit at most two choices. P9, P11, and P12 render every former table row as an independent field in their corresponding question step; they are not HTML tables. `Otro` rows pair a concept field with an amount.
- Required inputs follow the minimum requirements in the questionnaire: P4; P9 or its direct total; P11 or its direct total; P12; P16; and P17 with either manual mode. Other fields do not block forward navigation. There is no separate skip button.
- Validate non-negative amounts, selection limits, and basic email and WhatsApp formats. Values may be approximate; validation never requires exact financial data.
- Disabled upload controls are not interactive and do not save a filename or file data.

## Persistence And Errors

- Keep local and server drafts as JSON. Expand the answer schema to support strings, numbers, booleans, and string lists for multi-select answers.
- Restoring a draft rebuilds conditional steps and repeated card steps from its saved answers.
- Saving retains the existing local-first behavior. A failed remote save does not advance and displays an actionable Spanish retry message.
- No Excel export, OCR, upload processing, upload storage, or database migration is in scope.

## Testing

- Update onboarding tests for Spanish labels and required-step saving.
- Add focused tests for conditional visibility, P2/P3 selection limits, independent former-table fields, repeated card steps, disabled uploads, JSON list persistence, and save failure behavior.
- Run the web test suite, type check, and production build.

## Non-Goals

- Processing or storing uploaded card statements or movement screenshots.
- Exporting the Excel contract described in `preguntas.md`.
- Changing unrelated application-shell or landing-page behavior.

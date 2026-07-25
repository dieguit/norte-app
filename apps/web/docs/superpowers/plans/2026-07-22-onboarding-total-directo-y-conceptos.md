# Total directo y conceptos de gastos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow direct-total entry for daily expenses and discretionary spending, while preserving declared names for discretionary custom expenses in reduction decisions.

**Architecture:** Keep expense-mode selection, visibility, filtering, and validation in the onboarding definition, following `p9_modo`. Keep the personalized `p13` label as a route rendering concern because it is derived from the live form answer. Extend the fixed CSV contract with the two mode values and the direct total for discretionary spending.

**Tech Stack:** TypeScript, React 19, TanStack React Form, Vitest, Testing Library.

---

### Task 1: Specify and implement the expense modes in the onboarding definition

**Files:**
- Modify: `src/onboarding/definition.ts:686-770,1027-1259`
- Test: `src/onboarding/draft.test.ts:614-618`

- [ ] **Step 1: Add failing definition tests for both modes, filtering, validation, and direct-total `p13` visibility.**

Add these cases after the existing `p13` visibility test. They make the expected values and error messages explicit:

```ts
it('shows only the selected daily-expense mode and filters hidden answers', () => {
  const p11 = onboardingSteps.find(({ id }) => id === 'p11')!

  expect(getVisibleFields(p11, { p11_modo: 'Tengo el total en la cabeza' })
    .map(({ id }) => id)).toEqual(['p11_modo', 'var_total_directo'])
  expect(filterAnswersForActiveSteps({
    p11_modo: 'Tengo el total en la cabeza',
    var_comida: 1000,
    var_total_directo: 5000,
  })).toEqual({ p11_modo: 'Tengo el total en la cabeza', var_total_directo: 5000 })
})

it('requires a positive total or detailed daily expense and names positive others', () => {
  const p11 = onboardingSteps.find(({ id }) => id === 'p11')!

  expect(validateStep(p11, { p11_modo: 'Tengo el total en la cabeza' }))
    .toEqual({ var_total_directo: 'Ingresá un total aproximado mayor a cero.' })
  expect(validateStep(p11, { p11_modo: 'Quiero desglosar' }))
    .toEqual({ var_comida: 'Completá al menos un gasto de vida diaria.' })
  expect(validateStep(p11, { p11_modo: 'Quiero desglosar', var_otro1_monto: 500 }))
    .toEqual({ var_otro1_concepto: 'Debe ingresar el concepto.' })
})

it('shows direct total mode and fixed reduction choices for discretionary spending', () => {
  const p12 = onboardingSteps.find(({ id }) => id === 'p12')!
  const p13 = onboardingSteps.find(({ id }) => id === 'p13')!

  expect(getVisibleFields(p12, { p12_modo: 'Tengo el total en la cabeza' })
    .map(({ id }) => id)).toEqual(['p12_modo', 'd_total_directo'])
  expect(filterAnswersForActiveSteps({
    p12_modo: 'Tengo el total en la cabeza',
    d_salidas: 1000,
    d_total_directo: 5000,
  })).toEqual({ p12_modo: 'Tengo el total en la cabeza', d_total_directo: 5000 })
  expect(getVisibleFields(p13, { p12_modo: 'Tengo el total en la cabeza' })
    .map(({ id }) => id)).toEqual([
      'e13_salidas', 'e13_ropa', 'e13_delivery', 'e13_susc', 'e13_hobbies',
    ])
})

it('requires a positive discretionary total or detail and a name for positive others', () => {
  const p12 = onboardingSteps.find(({ id }) => id === 'p12')!

  expect(validateStep(p12, { p12_modo: 'Tengo el total en la cabeza' }))
    .toEqual({ d_total_directo: 'Ingresá un total aproximado mayor a cero.' })
  expect(validateStep(p12, { p12_modo: 'Quiero desglosar' }))
    .toEqual({ d_salidas: 'Completá al menos un gasto de gustitos.' })
  expect(validateStep(p12, { p12_modo: 'Quiero desglosar', d_otro1_monto: 500 }))
    .toEqual({ d_otro1_concepto: 'Debe ingresar el concepto.' })
})
```

- [ ] **Step 2: Run the focused definition test to verify it fails.**

Run: `pnpm --filter @repo/web test -- src/onboarding/draft.test.ts`

Expected: FAIL because `p11_modo`, `p12_modo`, and `d_total_directo` do not exist and `p13` has no direct-total visibility.

- [ ] **Step 3: Add the mode fields and conditional visibility.**

At the start of both `p11.fields` and `p12.fields`, add the required selector below; give every detailed field in that step `visibleWhen: (answers) => answers.p11_modo === "Quiero desglosar"` or `answers.p12_modo === "Quiero desglosar"`, respectively. Keep the existing field IDs and labels.

```ts
{
  id: 'p11_modo',
  type: 'radio',
  label: '¿total en la cabeza o desglosás?',
  options: ['Tengo el total en la cabeza', 'Quiero desglosar'],
  required: true,
},
```

Put `var_total_directo` after the detailed `p11` fields and make it visible only for `p11_modo === 'Tengo el total en la cabeza'`. Add the equivalent `p12_modo` selector and this new `p12` field:

```ts
{
  id: 'd_total_directo',
  type: 'number',
  label: 'Total aproximado ($)',
  visibleWhen: (answers) => answers.p12_modo === 'Tengo el total en la cabeza',
},
```

Change each `p13` field visibility to preserve the existing positive-amount condition in detailed mode and expose only non-`otro` fixed categories in direct-total mode:

```ts
visibleWhen: (answers: OnboardingAnswers) =>
  answers.p12_modo === 'Tengo el total en la cabeza'
    ? !id.startsWith('e13_otro')
    : hasPositiveAmount(answers, answerId),
```

- [ ] **Step 4: Make the mode-aware validations explicit.**

Replace the current `p11` and `p12` special cases with mode checks. Reuse `hasPositiveAmount` for each detail key, preserve the existing generic `otherPairsMap` validation, and use these direct-total errors:

```ts
if (step.id === 'p11') {
  const mode = answers.p11_modo
  const detailKeys = [
    'var_comida', 'var_transporte', 'var_farmacia',
    'var_otro1_monto', 'var_otro2_monto', 'var_otro3_monto',
  ]
  if (mode === 'Tengo el total en la cabeza' && !hasPositiveAmount(answers, 'var_total_directo')) {
    errors.var_total_directo = 'Ingresá un total aproximado mayor a cero.'
  } else if (mode === 'Quiero desglosar' && !detailKeys.some((key) => hasPositiveAmount(answers, key))) {
    errors.var_comida = 'Completá al menos un gasto de vida diaria.'
  }
}

if (step.id === 'p12') {
  const mode = answers.p12_modo
  const detailKeys = [
    'd_salidas', 'd_ropa', 'd_delivery', 'd_susc', 'd_hobbies',
    'd_otro1_monto', 'd_otro2_monto', 'd_otro3_monto',
  ]
  if (mode === 'Tengo el total en la cabeza' && !hasPositiveAmount(answers, 'd_total_directo')) {
    errors.d_total_directo = 'Ingresá un total aproximado mayor a cero.'
  } else if (mode === 'Quiero desglosar' && !detailKeys.some((key) => hasPositiveAmount(answers, key))) {
    errors.d_salidas = 'Completá al menos un gasto de gustitos.'
  }
}
```

Do not infer or migrate legacy `p11`/`p12` modes. Their missing required selector must remain incomplete, as agreed.

- [ ] **Step 5: Run the focused definition test to verify it passes.**

Run: `pnpm --filter @repo/web test -- src/onboarding/draft.test.ts`

Expected: PASS.

### Task 2: Render declared discretionary-other names in reduction decisions

**Files:**
- Modify: `src/routes/onboarding.tsx:545-577`
- Test: `src/routes/onboarding.test.tsx:997-1024`

- [ ] **Step 1: Add a failing route test for a declared `Otro` label.**

Add a test that restores a draft at `p13` with detailed modes and a named custom discretionary expense, then asserts the decision legend uses the declared name:

```tsx
it('uses the declared discretionary-other concept in reduction decisions', async () => {
  localStorage.clear()
  localStorage.setItem('onboarding-welcome-seen', 'true')
  setDraft({
    p1_pesa: 'Otra',
    ing_total: 500000,
    p8a_tiene_vencimiento: 'No',
    extra_tiene: 'No',
    p9_modo: 'Tengo el total en la cabeza',
    fijo_total_directo: 100000,
    p10_tiene_vencimiento: 'No, si pienso en el próximo año, todos son permanentes: van a estar ahí mes a mes.',
    p11_modo: 'Tengo el total en la cabeza',
    var_total_directo: 100000,
    p12_modo: 'Quiero desglosar',
    d_otro1_concepto: 'Regalos',
    d_otro1_monto: 5000,
  })

  render(<OnboardingPage />)

  expect(await screen.findByText('Regalos')).toBeDefined()
  expect(screen.queryByText('Otro 1')).toBeNull()
})
```

- [ ] **Step 2: Run the focused route test to verify it fails.**

Run: `pnpm --filter @repo/web test -- src/routes/onboarding.test.tsx`

Expected: FAIL because the `e13_otro1` field renders its static `Otro 1` label.

- [ ] **Step 3: Derive the displayed label in the existing field renderer.**

Inside `renderField`, derive a local label only for `e13_otroN`; keep `OnboardingField.label` as a string and avoid changing the shared field type. Use that local label in the non-radio `<label>` and the radio/checkbox `<legend>`:

```tsx
const otherIndex = field.id.match(/^e13_otro([1-3])$/)?.[1]
const concept = otherIndex ? formAnswers[`d_otro${otherIndex}_concepto`] : undefined
const fieldLabel =
  typeof concept === 'string' && concept.trim() !== '' ? concept.trim() : field.label
```

Replace each rendered `{field.label}` in that closure with `{fieldLabel}`. The positive-concept validation from Task 1 ensures the fallback cannot appear for a visible detailed custom decision.

- [ ] **Step 4: Run the focused route test to verify it passes.**

Run: `pnpm --filter @repo/web test -- src/routes/onboarding.test.tsx`

Expected: PASS.

- [ ] **Step 5: Update route-test drafts that must advance beyond `p11` or `p12`.**

Add `p11_modo: 'Tengo el total en la cabeza'` wherever those drafts already use `var_total_directo`, and add `p12_modo: 'Quiero desglosar'` wherever they already use `d_salidas` or another detailed `d_*` value. In `advanceToCard`, use:

```ts
p9_modo: 'Tengo el total en la cabeza',
fijo_total_directo: 1,
p11_modo: 'Tengo el total en la cabeza',
var_total_directo: 1,
p12_modo: 'Quiero desglosar',
d_salidas: 1,
```

This keeps unrelated route tests on their intended later step rather than stopping at a newly required selector.

### Task 3: Export the new answers in the admin CSV contract

**Files:**
- Modify: `src/admin/csv.ts:44-49`
- Test: `src/admin/csv.test.ts:63-97,162-235`

- [ ] **Step 1: Add failing CSV expectations for both modes and the discretionary direct total.**

In the expected header list, add `p11_modo` immediately before the daily-expense fields and `p12_modo` immediately before discretionary-expense fields; add `d_total_directo` after the discretionary-other amount columns. Add these values to the scalar-answer fixture and expected row:

```ts
p11_modo: 'Quiero desglosar',
p12_modo: 'Quiero desglosar',
d_total_directo: 123000,
```

Keep the existing detailed `var_*` and `d_*` fixture values in this test. The expected row needs the same three entries.

- [ ] **Step 2: Run the focused CSV test to verify it fails.**

Run: `pnpm --filter @repo/web test -- src/admin/csv.test.ts`

Expected: FAIL because the new header fields are absent from `csvHeaders` and thus omitted from exported rows.

- [ ] **Step 3: Extend the fixed CSV header contract.**

Update `csvHeaders` in the matching order. `toAdminCsvRow` already copies finite scalar values by header name, so no serializer branching is needed:

```ts
'p11_modo',
'var_comida', 'var_transporte', 'var_farmacia',
'var_otro1_concepto', 'var_otro1_monto',
'var_otro2_concepto', 'var_otro2_monto',
'var_otro3_concepto', 'var_otro3_monto',
'var_total_directo',
'p12_modo',
'd_salidas', 'd_ropa', 'd_delivery', 'd_susc', 'd_hobbies',
'd_otro1_concepto', 'd_otro1_monto',
'd_otro2_concepto', 'd_otro2_monto',
'd_otro3_concepto', 'd_otro3_monto',
'd_total_directo',
```

- [ ] **Step 4: Run the focused CSV test to verify it passes.**

Run: `pnpm --filter @repo/web test -- src/admin/csv.test.ts`

Expected: PASS.

- [ ] **Step 5: Run the complete web verification suite.**

Run: `pnpm --filter @repo/web test && pnpm --filter @repo/web check-types && pnpm --filter @repo/web build && git diff --check`

Expected: all commands exit 0.


No commit is included: repository instructions require an explicit user request before committing.

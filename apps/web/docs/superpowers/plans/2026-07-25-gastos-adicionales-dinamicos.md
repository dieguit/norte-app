# Gastos Adicionales Dinamicos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make daily-expense and discretionary-expense additional items dynamic, capped at five, and export them through semantic fixed CSV columns.

**Architecture:** `onboarding/definition.ts` replaces fixed scalar fields with repeated collections and owns collection validation plus P13 visibility. The existing repeated-items UI renders both collections unchanged. `admin/csv.ts` flattens each collection into five semantic slots and exports the five discretionary reduction decisions.

**Tech Stack:** React 19, TanStack Form, TypeScript, Vitest, Testing Library.

---

### Task 1: Define Dynamic Additional Expenses

**Files:**
- Modify: `apps/web/src/onboarding/definition.ts:3-69, 689-885, 1164-1388`
- Test: `apps/web/src/onboarding/draft.test.ts:692-741`

- [ ] **Step 1: Write the failing definition tests**

Replace the `p11` and `p12` legacy-other assertions with tests that exercise the collections and the P13 follow-up visibility:

```ts
expect(validateStep(p11, {
  p11_modo: 'Quiero desglosar',
  var_otros: [{ concepto: '', monto: 500, desde: '', hasta: '' }],
})).toEqual({ 'var_otros.0.concepto': 'Debe ingresar el concepto.' })

expect(validateStep(p12, {
  p12_modo: 'Quiero desglosar',
  d_otros: [{ concepto: 'Regalos', monto: 500, desde: '', hasta: '' }],
})).toEqual({})

expect(getVisibleFields(p13, {
  p12_modo: 'Quiero desglosar',
  d_otros: [{ concepto: 'Regalos', monto: 500, desde: '', hasta: '' }],
}).map(({ id }) => id)).toEqual(['e13_gustito_adicional1'])

expect(getVisibleFields(p13, {
  p12_modo: 'Quiero desglosar',
  d_otros: [{ concepto: 'Regalos', monto: 0, desde: '', hasta: '' }],
})).toEqual([])
```

Keep the direct-total filtering assertions and add collection filtering:

```ts
expect(filterAnswersForActiveSteps({
  p11_modo: 'Tengo el total en la cabeza',
  var_otros: [{ concepto: 'Mascota', monto: 1000, desde: '', hasta: '' }],
  var_total_directo: 5000,
})).toEqual({ p11_modo: 'Tengo el total en la cabeza', var_total_directo: 5000 })
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `pnpm --filter @repo/web test -- src/onboarding/draft.test.ts`

Expected: FAIL because `var_otros`, `d_otros`, and `e13_gustito_adicional1` are not declared or validated.

- [ ] **Step 3: Replace the scalar fields and add minimal collection helpers**

In `definition.ts`, replace the six `var_otro[1-3]_*` declarations with:

```ts
{
  id: 'var_otros',
  type: 'repeated',
  label: 'Otros gastos diarios',
  addLabel: 'Agregar otro',
  maxItems: 5,
  helpText: 'No hace falta que llenes todos',
  itemFields: [
    { key: 'concepto', type: 'text', label: 'Concepto', required: true },
    { key: 'monto', type: 'number', label: 'Monto ($)', required: true },
  ],
  visibleWhen: (answers) => answers.p11_modo === 'Quiero desglosar',
},
```

Replace the six `d_otro[1-3]_*` declarations with:

```ts
{
  id: 'd_otros',
  type: 'repeated',
  label: 'Otros gustitos',
  addLabel: 'Agregar otro',
  maxItems: 5,
  helpText: 'No hace falta que llenes todos',
  itemFields: [
    { key: 'concepto', type: 'text', label: 'Concepto', required: true },
    { key: 'monto', type: 'number', label: 'Monto ($)', required: true },
  ],
  visibleWhen: (answers) => answers.p12_modo === 'Quiero desglosar',
},
```

Add these helpers adjacent to `hasPositiveOther`:

```ts
function repeatedItems(answers: OnboardingAnswers, id: string): ExtraIncome[] {
  const value = answers[id]
  return Array.isArray(value)
    ? value.filter((item): item is ExtraIncome => typeof item === 'object' && item !== null)
    : []
}

function hasPositiveRepeatedItem(answers: OnboardingAnswers, id: string, index?: number) {
  const items = repeatedItems(answers, id)
  const candidates = index === undefined ? items : [items[index]]
  return candidates.some((item) => hasPositiveAmount({ monto: item?.monto }, 'monto'))
}
```

Inside `validateStep`, add a local validator after the generic field loop and call it from the P11/P12 detailed branches:

```ts
const validateRepeatedExpenses = (id: string) => {
  repeatedItems(normalizedAnswers, id).forEach((item, index) => {
    const rawAmount = item.monto
    const hasAmount = rawAmount !== '' && rawAmount !== undefined && rawAmount !== null
    const amount = typeof rawAmount === 'string' ? Number(rawAmount) : rawAmount
    if (hasAmount && (typeof amount !== 'number' || !Number.isFinite(amount))) {
      errors[`${id}.${index}.monto`] = 'Ingresá un número válido.'
    } else if (hasAmount && typeof amount === 'number' && amount < 0) {
      errors[`${id}.${index}.monto`] = 'El monto no puede ser negativo.'
    } else if (typeof amount === 'number' && amount > 0 && item.concepto.trim() === '') {
      errors[`${id}.${index}.concepto`] = 'Debe ingresar el concepto.'
    }
  })
}
```

Remove the `var_otro*` and `d_otro*` entries from `otherPairsMap`, add `hasPositiveRepeatedItem(normalizedAnswers, 'var_otros')` and `hasPositiveRepeatedItem(normalizedAnswers, 'd_otros')` to the corresponding detailed minimum checks, then call `validateRepeatedExpenses('var_otros')` and `validateRepeatedExpenses('d_otros')` in their respective detailed branches.

Generate P13's five additional decision fields with `Array.from({ length: 5 }, (_, index) => ...)`:

```ts
{
  id: `e13_gustito_adicional${index + 1}`,
  type: 'radio',
  label: `Gustito adicional ${index + 1}`,
  options: ['Lo llevo a cero', 'Lo reduzco a la mitad', 'No lo toco ni en crisis'],
  visibleWhen: (answers) =>
    answers.p12_modo === 'Quiero desglosar' &&
    hasPositiveRepeatedItem(answers, 'd_otros', index),
}
```

Retain the five named base P13 fields and their direct-total behavior. Remove the three legacy P13 fields `e13_otro1..3`.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `pnpm --filter @repo/web test -- src/onboarding/draft.test.ts`

Expected: PASS.

### Task 2: Render Both Collections And Dynamic P13 Labels

**Files:**
- Modify: `apps/web/src/routes/onboarding.tsx:545-552`
- Test: `apps/web/src/routes/onboarding.test.tsx:480-504, 1095-1144`

- [ ] **Step 1: Write the failing route tests**

Add a test that advances to P11 and P12, adds five entries in each, and confirms each “Agregar otro” button disappears after the fifth row. Reuse the existing P9 repeated-item test pattern and assert the rendered labels are `Concepto 1` through `Concepto 5`.

Replace the legacy discretionary-other decision test with this persisted collection input and expected decision label:

```ts
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
  d_otros: [{ concepto: 'Regalos', monto: 5000, desde: '', hasta: '' }],
})

expect(await screen.findByText('Regalos')).toBeDefined()
expect(screen.queryByText('Gustito adicional 1')).toBeNull()
```

- [ ] **Step 2: Run the focused UI test to verify it fails**

Run: `pnpm --filter @repo/web test -- src/routes/onboarding.test.tsx`

Expected: FAIL because the legacy scalar fields still render and P13 does not resolve `d_otros` concepts.

- [ ] **Step 3: Resolve P13 labels from the repeated collection**

Replace the legacy regex and scalar lookup in `renderField` with a lookup for the new decision ID:

```ts
const additionalIndex = field.id.match(/^e13_gustito_adicional([1-5])$/)?.[1]
const additional = additionalIndex && Array.isArray(formAnswers.d_otros)
  ? formAnswers.d_otros[Number(additionalIndex) - 1]
  : undefined
const concept =
  typeof additional === 'object' && additional !== null
    ? additional.concepto
    : undefined
```

Keep the existing fallback to `field.label` so blank or malformed drafts remain renderable. No component change is required: the `repeated` switch branch already renders any repeated field through `OnboardingRepeatedItems` and that component enforces `maxItems`.

- [ ] **Step 4: Run the focused UI test to verify it passes**

Run: `pnpm --filter @repo/web test -- src/routes/onboarding.test.tsx`

Expected: PASS.

### Task 3: Export Semantic CSV Slots

**Files:**
- Modify: `apps/web/src/admin/csv.ts:44-51, 72-111`
- Test: `apps/web/src/admin/csv.test.ts:62-345`

- [ ] **Step 1: Write the failing CSV contract and flattening tests**

Replace the legacy header expectations with:

```ts
...[1, 2, 3, 4, 5].flatMap((number) => [
  `gasto_diario_adicional_${number}_concepto`,
  `gasto_diario_adicional_${number}_monto`,
]),
...[1, 2, 3, 4, 5].flatMap((number) => [
  `gustito_adicional_${number}_concepto`,
  `gustito_adicional_${number}_monto`,
  `decision_gustito_adicional_${number}`,
]),
```

Add a row test with five `var_otros`, five `d_otros`, and five `e13_gustito_adicionalN` values. Assert the first and fifth values land in their matching semantic columns. Add a shorter-row case that verifies all unused daily, discretionary, and decision cells equal `''`.

- [ ] **Step 2: Run the focused CSV test to verify it fails**

Run: `pnpm --filter @repo/web test -- src/admin/csv.test.ts`

Expected: FAIL because the current contract exports only legacy `var_otro*`, `d_otro*`, and `e13_otro*` columns.

- [ ] **Step 3: Implement fixed-slot flattening for both collections**

Replace the old daily/discretionary header groups with the semantic generated groups from the preceding test. In `toAdminCsvRow`, add a five-slot loop for each collection:

```ts
for (let index = 0; index < 5; index++) {
  const number = index + 1
  const item = Array.isArray(answers.var_otros) ? answers.var_otros[index] : undefined
  row[`gasto_diario_adicional_${number}_concepto`] =
    item && typeof item === 'object' ? fixedOtherValue(item.concepto) : ''
  row[`gasto_diario_adicional_${number}_monto`] =
    item && typeof item === 'object' ? fixedOtherAmount(item.monto) : ''
}
```

Then add the discretionary loop:

```ts
for (let index = 0; index < 5; index++) {
  const number = index + 1
  const item = Array.isArray(answers.d_otros) ? answers.d_otros[index] : undefined
  row[`gustito_adicional_${number}_concepto`] =
    item && typeof item === 'object' ? fixedOtherValue(item.concepto) : ''
  row[`gustito_adicional_${number}_monto`] =
    item && typeof item === 'object' ? fixedOtherAmount(item.monto) : ''
  row[`decision_gustito_adicional_${number}`] =
    value(answers, `e13_gustito_adicional${number}`)
}
```

Do not add fallback reads for `var_otro*`, `d_otro*`, or `e13_otro*`.

- [ ] **Step 4: Run the focused CSV test to verify it passes**

Run: `pnpm --filter @repo/web test -- src/admin/csv.test.ts`

Expected: PASS.

### Task 4: Run Web Verification

**Files:**
- Modify: none

- [ ] **Step 1: Run the complete web test suite**

Run: `pnpm --filter @repo/web test`

Expected: PASS.

- [ ] **Step 2: Run static checks and production build**

Run: `pnpm --filter @repo/web check-types && pnpm --filter @repo/web build`

Expected: both commands exit 0.

- [ ] **Step 3: Check the final diff for whitespace errors**

Run: `git diff --check`

Expected: no output and exit 0.

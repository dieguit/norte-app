# Compras necesarias dinámicas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace fixed planned-purchase fields with up to five required dynamic purchases and export five fixed CSV slots.

**Architecture:** Define `compras_necesarias` as a repeated field in `p14`; the existing `OnboardingRepeatedItems` component renders its concept, amount, and monthly date controls without a component change. Keep the list validation in `validateStep`, and flatten it into five fixed CSV slots in the admin export.

**Tech Stack:** TypeScript, React 19, TanStack form/router, Zod, Vitest, Testing Library.

## Global Constraints

- Retain the `p14_tiene_compras` Sí/No selector; show the collection only for “Sí”.
- Reuse the current month/year dropdown and its values such as `oct-27`.
- Cap the collection at exactly five entries; use `Agregar compra` as the add button label.
- A “Sí” answer requires at least one entry and uses the exact message `Agregá una compra o elegí "No".` when missing.
- Each added entry requires concept, amount, and date; retain existing invalid and negative amount messages.
- Remove `n1_*` through `n3_*` without migration or compatibility.
- Export exactly `compra_necesaria_1_{concepto,monto,fecha}` through `compra_necesaria_5_{concepto,monto,fecha}` in insertion order.
- Add no component or dependency.

---

### Task 1: Define and Validate Dynamic Purchases

**Files:**
- Modify: `src/onboarding/definition.ts:3-37, 864-911, 1139-1167, 1384-1396`
- Modify: `src/components/onboarding-repeated-items.tsx:45-54`
- Test: `src/onboarding/draft.test.ts:423-484`
- Test: `src/routes/onboarding.test.tsx:1060-1089`

**Interfaces:**
- Consumes: `OnboardingField` repeated-field support and `OnboardingRepeatedItems` convention for `concepto`, `monto`, and month keys.
- Produces: `answers.compras_necesarias` as an `ExtraIncome[]` whose items include optional `fecha: string`; active P14 fields and validation errors keyed as `compras_necesarias.<index>.<field>`.

- [ ] **Step 1: Write failing P14 definition and validation tests**

Replace the current P14 assertions in `draft.test.ts` with a test that expects the visible fields for “Sí” to be `p14_tiene_compras` and `compras_necesarias`, then asserts the repeated field configuration:

```ts
const purchases = getVisibleFields(step('p14'), { p14_tiene_compras: 'Sí' })[1]
expect(purchases).toMatchObject({
  id: 'compras_necesarias', type: 'repeated', addLabel: 'Agregar compra', maxItems: 5,
  itemFields: [
    { key: 'concepto', type: 'text', label: 'Concepto', required: true },
    { key: 'monto', type: 'number', label: 'Monto ($)', required: true },
    { key: 'fecha', type: 'month', label: 'Fecha', required: true },
  ],
})
```

In the same test, cover filtering and validation:

```ts
expect(filterAnswersForActiveSteps({
  p14_tiene_compras: 'No',
  compras_necesarias: [{ concepto: 'Auto', monto: 1000, desde: '', hasta: '', fecha: 'oct-27' }],
})).toEqual({ p14_tiene_compras: 'No' })

expect(validateStep(step('p14'), { p14_tiene_compras: 'Sí' })).toEqual({
  compras_necesarias: 'Agregá una compra o elegí "No".',
})

expect(validateStep(step('p14'), {
  p14_tiene_compras: 'Sí',
  compras_necesarias: [{ concepto: '', monto: '', desde: '', hasta: '', fecha: '' }],
})).toEqual({
  'compras_necesarias.0.concepto': 'Este campo es requerido.',
  'compras_necesarias.0.monto': 'Este campo es requerido.',
  'compras_necesarias.0.fecha': 'Este campo es requerido.',
})
```

In `routes/onboarding.test.tsx`, replace the planned-purchases helper-only test with an interaction test that navigates to P14, selects “Sí”, adds and removes purchases, and checks the five-item cap:

```tsx
await user.click(screen.getByRole('radio', { name: /^sí$/i }))
await user.click(screen.getByRole('button', { name: /agregar compra/i }))
expect(screen.getByLabelText(/^Concepto 1$/)).toBeDefined()
expect(screen.getByLabelText(/^Monto \(\$\) 1$/)).toBeDefined()
expect(screen.getByLabelText(/^Fecha 1$/)).toBeDefined()
await user.selectOptions(screen.getByLabelText(/^Fecha 1$/), 'oct-27')
await user.type(screen.getByLabelText(/^Concepto 1$/), 'Auto')
await user.click(screen.getByRole('button', { name: /Eliminar Auto/i }))
expect(screen.queryByLabelText(/^Concepto 1$/)).toBeNull()

for (let index = 1; index <= 5; index++) {
  await user.click(screen.getByRole('button', { name: /agregar compra/i }))
  expect(screen.getByLabelText(new RegExp(`^Concepto ${index}$`))).toBeDefined()
}
expect(screen.queryByRole('button', { name: /agregar compra/i })).toBeNull()
```

- [ ] **Step 2: Run the definition test to verify it fails**

Run: `pnpm --filter @repo/web test -- src/onboarding/draft.test.ts src/routes/onboarding.test.tsx`

Expected: FAIL because P14 still declares `n1_*` through `n3_*`, does not expose `compras_necesarias`, and has no collection validation.

- [ ] **Step 3: Implement the minimum P14 data and validation changes**

In `definition.ts`:

```ts
export type ExtraIncome = {
  concepto: string;
  monto: string | number;
  desde: string;
  hasta: string;
  fecha?: string;
};
```

Allow `fecha` in `extraIncomeSchema`, initialize it to `""` in `OnboardingRepeatedItems.handleAdd`, then replace the six `n1_*` through `n3_*` field definitions with:

```ts
{
  id: 'compras_necesarias',
  type: 'repeated',
  label: 'Compras necesarias',
  addLabel: 'Agregar compra',
  maxItems: 5,
  helpText: 'No hace falta que llenes todos',
  itemFields: [
    { key: 'concepto', type: 'text', label: 'Concepto', required: true },
    { key: 'monto', type: 'number', label: 'Monto ($)', required: true },
    { key: 'fecha', type: 'month', label: 'Fecha', required: true },
  ],
  visibleWhen: (answers) => answers.p14_tiene_compras === 'Sí',
},
```

Add a `step.id === 'p14'` branch after the P12 validation. For “Sí”, require a nonempty `compras_necesarias` list, call `validateRepeatedExpenses('compras_necesarias')`, and for every item set `Este campo es requerido.` for blank `concepto`, blank `monto`, or blank `fecha`. Do not restore the deleted scalar pair map or legacy fields.

- [ ] **Step 4: Run the definition test to verify it passes**

Run: `pnpm --filter @repo/web test -- src/onboarding/draft.test.ts src/routes/onboarding.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the definition change**

```bash
git add src/onboarding/definition.ts src/onboarding/draft.test.ts src/routes/onboarding.test.tsx src/components/onboarding-repeated-items.tsx
git commit -m "feat(onboarding): add dynamic planned purchases"
```

### Task 2: Export Five Fixed Purchase Slots

**Files:**
- Modify: `src/admin/csv.ts:59-61, 128-139`
- Test: `src/admin/csv.test.ts:63-123, 173-246, 346-407`

**Interfaces:**
- Consumes: `answers.compras_necesarias`, an ordered array of items with `concepto`, `monto`, and `fecha`.
- Produces: `compra_necesaria_1_concepto`, `_monto`, `_fecha` through slot 5 in `csvHeaders` and `toAdminCsvRow`.

- [ ] **Step 1: Write failing CSV contract and flattening tests**

In `csv.test.ts`, replace the six `n1_*` through `n3_*` expected headers with:

```ts
...[1, 2, 3, 4, 5].flatMap((number) => [
  `compra_necesaria_${number}_concepto`,
  `compra_necesaria_${number}_monto`,
  `compra_necesaria_${number}_fecha`,
]),
```

Replace scalar purchase sample answers with an ordered collection. Add assertions for all populated and unused slots:

```ts
compras_necesarias: [
  { concepto: 'Lavarropas', monto: 500000, fecha: 'oct-27', desde: '', hasta: '' },
  { concepto: 'Anteojos', monto: 100000, fecha: 'nov-27', desde: '', hasta: '' },
]

expect(row.compra_necesaria_1_concepto).toBe('Lavarropas')
expect(row.compra_necesaria_1_monto).toBe(500000)
expect(row.compra_necesaria_1_fecha).toBe('oct-27')
for (let slot = 3; slot <= 5; slot++) {
  expect(row[`compra_necesaria_${slot}_concepto`]).toBe('')
  expect(row[`compra_necesaria_${slot}_monto`]).toBe('')
  expect(row[`compra_necesaria_${slot}_fecha`]).toBe('')
}
```

Also assert `csvHeaders` no longer contains `n1_concepto`.

- [ ] **Step 2: Run the CSV test to verify it fails**

Run: `pnpm --filter @repo/web test -- src/admin/csv.test.ts`

Expected: FAIL because the headers and row flattener still use the retired `n1_*` through `n3_*` fields.

- [ ] **Step 3: Implement fixed purchase-slot CSV flattening**

Replace the retired headers in `csvHeaders` with the five three-column groups. Before returning the row, flatten the collection using the existing safe scalar helpers:

```ts
for (let index = 0; index < 5; index++) {
  const number = index + 1
  const item = Array.isArray(answers.compras_necesarias)
    ? answers.compras_necesarias[index]
    : undefined
  row[`compra_necesaria_${number}_concepto`] =
    item && typeof item === 'object' ? fixedOtherValue(item.concepto) : ''
  row[`compra_necesaria_${number}_monto`] =
    item && typeof item === 'object' ? fixedOtherAmount(item.monto) : ''
  row[`compra_necesaria_${number}_fecha`] =
    item && typeof item === 'object' ? fixedOtherValue(item.fecha) : ''
}
```

Do not add an old-field fallback.

- [ ] **Step 4: Run focused verification**

Run: `pnpm --filter @repo/web test -- src/onboarding/draft.test.ts src/routes/onboarding.test.tsx src/admin/csv.test.ts`

Expected: PASS.

- [ ] **Step 5: Run static verification**

Run: `pnpm --filter @repo/web lint`

Expected: PASS with no TypeScript errors.

- [ ] **Step 6: Commit the CSV contract**

```bash
git add src/admin/csv.ts src/admin/csv.test.ts
git commit -m "feat(admin): export dynamic planned purchases"
```

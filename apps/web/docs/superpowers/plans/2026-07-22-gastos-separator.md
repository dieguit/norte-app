# Gastos Separator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fieldless onboarding card that explains the three expense categories immediately before fixed payments.

**Architecture:** Define the card as a normal `OnboardingStep` in the existing ordered `onboardingSteps` array. The existing route already renders fieldless steps, validates them successfully, persists their next index, and tracks their standard step events, so no route implementation or new state is needed.

**Tech Stack:** React 19, TanStack Start/Form, TypeScript, Vitest, Testing Library.

---

## File Structure

- `src/onboarding/definition.ts` — canonical onboarding step order and copy; receives the new fieldless `p8b` step.
- `src/onboarding/draft.test.ts` — verifies the definition order and that the card needs no answer.
- `src/routes/onboarding.test.tsx` — verifies back/forward navigation through the rendered card.

### Task 1: Define and verify the expense-classification step

**Files:**
- Modify: `src/onboarding/draft.test.ts:249-261`
- Modify: `src/onboarding/definition.ts:518-519`

- [ ] **Step 1: Write the failing definition test**

Add this test after `resumes at the first incomplete step` in `src/onboarding/draft.test.ts`:

```ts
  it('places a fieldless expense classifier before fixed payments', () => {
    const classifier = onboardingSteps.find(({ id }) => id === 'p8b')!
    const activeSteps = getActiveSteps({})

    expect(classifier).toMatchObject({
      title: 'Ahora vamos a los gastos',
      intro: 'Los vamos a mirar en tres grupos: los pagos fijos, que tenés que pagar sí o sí todos los meses, como el alquiler o el colegio; los gastos necesarios que cambian según el mes y tus decisiones, pero siempre están, como la comida o la nafta; y, por último, los gustitos. Esos vienen después.',
      fields: [],
    })
    expect(activeSteps.findIndex(({ id }) => id === 'p8b')).toBe(
      activeSteps.findIndex(({ id }) => id === 'p9') - 1,
    )
    expect(validateStep(classifier, {})).toEqual({})
    expect(getFirstIncompleteStep({
      nombre: 'Ada',
      contacto_canal: 'Email',
      email: 'ada@example.com',
      p1_pesa: 'Otra',
      p2_ultimo: 'Comida (comprar más barato)',
      p3_primero: 'Comida (comprar más barato)',
      ing_total: 500000,
      p5_fuentes: ['Sueldo fijo (relación de dependencia)'],
      p8a_tiene_vencimiento: 'No',
      extra_tiene: 'No',
    })).toBe(activeSteps.findIndex(({ id }) => id === 'p9'))
  })
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `rtk pnpm --filter @repo/web test -- src/onboarding/draft.test.ts`

Expected: FAIL because no step with id `p8b` exists.

- [ ] **Step 3: Add the minimal fieldless step**

Insert this object between the existing `p7` and `p9` objects in `src/onboarding/definition.ts`:

```ts
  {
    id: 'p8b',
    title: 'Ahora vamos a los gastos',
    intro:
      'Los vamos a mirar en tres grupos: los pagos fijos, que tenés que pagar sí o sí todos los meses, como el alquiler o el colegio; los gastos necesarios que cambian según el mes y tus decisiones, pero siempre están, como la comida o la nafta; y, por último, los gustitos. Esos vienen después.',
    fields: [],
  },
```

Do not alter `getFirstIncompleteStep`: it already relies on `validateStep`, and a fieldless step yields `{}`, so existing saved drafts resume at the first incomplete data-entry step.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `rtk pnpm --filter @repo/web test -- src/onboarding/draft.test.ts`

Expected: PASS.

### Task 2: Verify rendered navigation through the card

**Files:**
- Modify: `src/routes/onboarding.test.tsx:947-969`

- [ ] **Step 1: Write the failing route test**

Add this test before `shows the repeated-fields helper for expiring payments (p10)` in `src/routes/onboarding.test.tsx`:

```tsx
  it('shows the expense classifier before fixed payments and returns to it', async () => {
    const user = userEvent.setup()
    setDraft({
      p1_pesa: 'Otra',
      ing_total: 500000,
      p8a_tiene_vencimiento: 'No',
      extra_tiene: 'No',
    })
    render(<OnboardingPage />)

    await screen.findByRole('heading', { name: /lo que pagás sí o sí/i })
    await user.click(screen.getByRole('button', { name: /volver/i }))

    expect(await screen.findByRole('heading', { name: 'Ahora vamos a los gastos' })).toBeDefined()
    expect(screen.getByText(/Los vamos a mirar en tres grupos/)).toBeDefined()
    expect(screen.queryByLabelText(/total aproximado/i)).toBeNull()

    await continueStep(user)
    expect(await screen.findByRole('heading', { name: /lo que pagás sí o sí/i })).toBeDefined()
  })
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `rtk pnpm --filter @repo/web test -- src/routes/onboarding.test.tsx`

Expected: FAIL because navigating back from `p9` lands on `p7`, not the missing classifier card.

- [ ] **Step 3: Run the focused test after Task 1's implementation**

Run: `rtk pnpm --filter @repo/web test -- src/routes/onboarding.test.tsx`

Expected: PASS. No route code change is needed because the generic renderer already supports `fields: []`.

### Task 3: Run the web verification suite

**Files:**
- Verify only: `src/onboarding/definition.ts`, `src/onboarding/draft.test.ts`, `src/routes/onboarding.test.tsx`

- [ ] **Step 1: Run the complete test suite**

Run: `rtk pnpm --filter @repo/web test`

Expected: PASS.

- [ ] **Step 2: Run TypeScript checking**

Run: `rtk pnpm --filter @repo/web check-types`

Expected: PASS with exit code 0.

- [ ] **Step 3: Build the web package**

Run: `rtk pnpm --filter @repo/web build`

Expected: PASS with exit code 0.

- [ ] **Step 4: Check the diff for whitespace errors**

Run: `rtk git diff --check`

Expected: no output and exit code 0.

- [ ] **Step 5: Leave changes uncommitted**

Do not commit: this repository's local instructions require an explicit user request before creating commits.

# Gastos post-cierre visibles al elegir archivo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar los datos opcionales de gastos post-cierre al elegir cualquiera de las dos rutas de resumen disponibles.

**Architecture:** `onboardingSteps` mantiene una única condición por tarjeta para la sección post-cierre. La condición acepta los modos archivo y mes a mes sin observar el resultado de la carga; la validación deja de exigir cantidad de cuotas porque todos estos datos son opcionales.

**Tech Stack:** TypeScript, React 19, Vitest, Testing Library.

## Global Constraints

- No cambiar el esquema, API ni persistencia: reutilizar `t{n}_postcierre*`.
- Mostrar la sección al seleccionar archivo o mes a mes; no mostrarla en la ruta de WhatsApp.
- Ningún campo post-cierre bloquea el avance, incluida la cantidad de cuotas después de elegir "Sí".
- No hacer commits salvo solicitud expresa del usuario.

---

## File Structure

- Modify: `src/onboarding/definition.ts` - visibilidad y validación de los campos post-cierre por tarjeta.
- Modify: `src/onboarding/draft.test.ts` - pruebas unitarias de visibilidad, filtrado y validación.
- Modify: `src/routes/onboarding.test.tsx` - prueba de la presentación inmediata en la ruta de archivo.

### Task 1: Mostrar inmediatamente los datos post-cierre

**Files:**
- Modify: `src/onboarding/draft.test.ts:32-110`
- Modify: `src/routes/onboarding.test.tsx:525-563`
- Modify: `src/onboarding/definition.ts:897-1026,1397-1431`

**Interfaces:**
- Consumes: `getVisibleFields(step, answers)`, `filterAnswersForActiveSteps(answers)` y `validateStep(step, answers)` de `src/onboarding/definition.ts`, además de `OnboardingPage` y `advanceToCard` de sus pruebas existentes.
- Produces: Los cuatro controles post-cierre son visibles con `t1_cuotas_modo: 'Subir foto o archivo'` sin `t1_upload_url`; `validateStep` no devuelve error para `t1_postcierre_cuotas_cantidad` vacío.

- [ ] **Step 1: Escribir las pruebas unitarias que fallen**

En `src/onboarding/draft.test.ts`, reemplazar los dos casos que distinguen el estado antes y después del upload por estos casos, manteniendo el orden visual de los IDs:

```ts
it('shows optional post-close fields immediately in upload mode', () => {
  const step = onboardingSteps.find(({ id }) => id === 't1_p16')!

  expect(getVisibleFields(step, {
    t1_cuotas_modo: 'Subir foto o archivo',
  }).map(({ id }) => id)).toEqual([
    't1_cuotas_modo', 't1_upload_url',
    't1_postcierre', 't1_postcierre_cuotas', 't1_postcierre_upload',
  ])

  expect(getVisibleFields(step, {
    t1_cuotas_modo: 'Subir foto o archivo',
    t1_postcierre_cuotas: 'Sí',
  }).map(({ id }) => id)).toContain('t1_postcierre_cuotas_cantidad')
})

it('does not require post-close installment quantity', () => {
  const step = onboardingSteps.find(({ id }) => id === 't1_p16')!

  expect(validateStep(step, {
    t1_cuotas_modo: 'Subir foto o archivo',
    t1_upload_url: 'file-key',
    t1_postcierre_cuotas: 'Sí',
  })).toEqual({})
})
```

Keep the existing filtering test, but remove its unnecessary `t1_upload_url` entry so it proves post-close answers remain active before the statement upload.

- [ ] **Step 2: Escribir la prueba de interfaz que falle**

En `src/routes/onboarding.test.tsx`, reemplazar `reveals optional post-close inputs after uploading the statement` por el siguiente caso. Eliminar su mock de `XMLHttpRequest` y carga de archivo porque ya no forman parte del comportamiento.

```tsx
it('shows optional post-close inputs immediately in the statement upload route', async () => {
  const user = userEvent.setup()
  await advanceToCard(1)
  await user.click(screen.getByRole('radio', { name: 'Subir foto o archivo' }))

  expect(screen.getByLabelText(/cuánto gastaste desde el cierre/i)).toBeDefined()
  expect(screen.getByRole('group', { name: '¿Algo de eso fue en cuotas?' })).toBeDefined()
  expect(screen.getByLabelText(/subí una captura de los últimos movimientos/i)).toBeDefined()
  expect(screen.queryByLabelText('¿En cuántas cuotas?')).toBeNull()

  await user.click(within(screen.getByRole('group', {
    name: '¿Algo de eso fue en cuotas?',
  })).getByRole('radio', { name: 'Sí' }))
  expect(screen.getByLabelText('¿En cuántas cuotas?')).toBeDefined()
})
```

- [ ] **Step 3: Run the focused tests to verify they fail**

Run: `rtk pnpm --filter @repo/web test src/onboarding/draft.test.ts src/routes/onboarding.test.tsx -t "optional post-close"`

Expected: FAIL because upload mode exposes only `t1_upload_url` before upload completion, and validation reports a missing installment quantity.

- [ ] **Step 4: Implement the minimal definition change**

In the card `flatMap` in `src/onboarding/definition.ts`, delete `hasUploadedStatement` and change the shared condition to:

```ts
const postCierreVisible = (answers: OnboardingAnswers) =>
  manualMode(answers) || uploadMode(answers);
```

Retain that condition on `t{n}_postcierre`, `t{n}_postcierre_cuotas`, `t{n}_postcierre_cuotas_cantidad`, and `t{n}_postcierre_upload`. In `validateStep`, delete `uploadUrl`, `hasPostCloseFields`, and the block that requires `t{n}_postcierre_cuotas_cantidad`; leave the existing required statement upload validation intact.

- [ ] **Step 5: Run the focused tests to verify they pass**

Run: `rtk pnpm --filter @repo/web test src/onboarding/draft.test.ts src/routes/onboarding.test.tsx -t "optional post-close"`

Expected: PASS.

- [ ] **Step 6: Run the affected test files and type check**

Run: `rtk pnpm --filter @repo/web test src/onboarding/draft.test.ts src/routes/onboarding.test.tsx`

Expected: PASS.

Run: `rtk pnpm --filter @repo/web lint`

Expected: PASS with no TypeScript errors.

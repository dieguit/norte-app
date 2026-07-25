# Gastos post-cierre en archivo y cuotas mes a mes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pedir y persistir opcionalmente los gastos post-cierre para tarjetas con resumen cargado y cuotas informadas mes a mes.

**Architecture:** La definición de onboarding seguirá siendo la fuente única de visibilidad, filtrado y validación. Los campos `t{n}_postcierre*` ya existen, por lo que solo se amplía su condición de visibilidad al camino de archivo cuando el upload terminó; la UI se actualiza automáticamente al cambiar el valor guardado del upload.

**Tech Stack:** TypeScript, React 19, TanStack Form, Vitest, Testing Library.

---

## File structure

- Modify: `src/onboarding/definition.ts` - determina qué campos de cada tarjeta son visibles y valida los datos activos.
- Modify: `src/onboarding/draft.test.ts` - cubre la visibilidad, limpieza y validación de los campos de post-cierre.
- Modify: `src/routes/onboarding.test.tsx` - prueba la revelación de la sección después de subir un resumen desde la interfaz.

### Task 1: Habilitar la Capa 2 en la definición de tarjeta

**Files:**
- Modify: `src/onboarding/draft.test.ts:32-119`
- Modify: `src/onboarding/definition.ts:949-1071,1397-1423`

- [ ] **Step 1: Escribir las pruebas unitarias que fallen**

En `src/onboarding/draft.test.ts`, reemplazar el caso que espera solo el upload y agregar estas expectativas. Mantener el orden de los IDs porque representa el orden visual del paso.

```ts
it('shows post-close fields only after a statement upload succeeds', () => {
  const step = onboardingSteps.find(({ id }) => id === 't1_p16')!

  expect(getVisibleFields(step, { t1_cuotas_modo: 'Subir foto o archivo' })
    .map(({ id }) => id)).toEqual(['t1_cuotas_modo', 't1_upload_url'])

  expect(getVisibleFields(step, {
    t1_cuotas_modo: 'Subir foto o archivo',
    t1_upload_url: 'onboarding/device/t1_upload_url/object',
  }).map(({ id }) => id)).toEqual([
    't1_cuotas_modo', 't1_upload_url', 't1_postcierre',
    't1_postcierre_cuotas', 't1_postcierre_upload',
  ])
})

it('shows post-close installment quantity in upload mode only after selecting Sí', () => {
  const step = onboardingSteps.find(({ id }) => id === 't1_p16')!
  const answers = {
    t1_cuotas_modo: 'Subir foto o archivo',
    t1_upload_url: 'onboarding/device/t1_upload_url/object',
    t1_postcierre_cuotas: 'Sí',
  }

  expect(getVisibleFields(step, answers).map(({ id }) => id))
    .toContain('t1_postcierre_cuotas_cantidad')
  expect(validateStep(step, answers)).toEqual({
    t1_postcierre_cuotas_cantidad: 'Elegí una opción para continuar.',
  })
})

it('keeps post-close upload answers in upload mode and removes them after changing route', () => {
  const postCloseAnswers = {
    p15_tarjetas: 1,
    t1_cuotas_modo: 'Subir foto o archivo',
    t1_upload_url: 'file-key',
    t1_postcierre: 25000,
    t1_postcierre_cuotas: 'Sí',
    t1_postcierre_cuotas_cantidad: '3',
    t1_postcierre_upload: 'movement-key',
  }

  expect(filterAnswersForActiveSteps(postCloseAnswers)).toEqual(postCloseAnswers)
  expect(filterAnswersForActiveSteps({
    ...postCloseAnswers,
    t1_cuotas_modo: 'No lo tengo a mano, que Norte me lo pida después por WhatsApp',
  })).toEqual({
    p15_tarjetas: 1,
    t1_cuotas_modo: 'No lo tengo a mano, que Norte me lo pida después por WhatsApp',
  })
})
```

- [ ] **Step 2: Ejecutar las pruebas para comprobar que fallan**

Run: `rtk pnpm --filter @repo/web test src/onboarding/draft.test.ts`

Expected: FAIL. La expectativa con `t1_upload_url` debe recibir únicamente `t1_cuotas_modo` y `t1_upload_url`; la validación no exige todavía la cantidad de cuotas en ruta de archivo.

- [ ] **Step 3: Implementar la condición compartida mínima**

En el `flatMap` de tarjetas de `src/onboarding/definition.ts`, conservar `manualMode` y `uploadMode`, y agregar una condición local para la Capa 2:

```ts
const postCloseMode = (answers: OnboardingAnswers) =>
  manualMode(answers) ||
  (uploadMode(answers) && typeof answers[`t${n}_upload_url`] === 'string')
```

Usar `postCloseMode` como `visibleWhen` de `t${n}_postcierre`,
`t${n}_postcierre_cuotas` y `t${n}_postcierre_upload`.

Cambiar también la condición de `t${n}_postcierre_cuotas_cantidad` a:

```ts
visibleWhen: (answers) =>
  postCloseMode(answers) && answers[`t${n}_postcierre_cuotas`] === 'Sí'
```

En `validateStep`, extender la condición que exige `t{n}_postcierre_cuotas_cantidad` para que aplique cuando el modo sea mes a mes o cuando sea archivo con `t{n}_upload_url` presente. No hacer obligatorio el monto, la captura ni la respuesta sobre cuotas.

```ts
const hasPostCloseFields =
  mode === 'Copiar el renglón mes a mes' ||
  (mode === 'Subir foto o archivo' && typeof answers[`${prefix}_upload_url`] === 'string')

if (
  hasPostCloseFields &&
  answers[`${prefix}_postcierre_cuotas`] === 'Sí' &&
  !answers[`${prefix}_postcierre_cuotas_cantidad`]
) {
  errors[`${prefix}_postcierre_cuotas_cantidad`] = 'Elegí una opción para continuar.'
}
```

- [ ] **Step 4: Ejecutar las pruebas unitarias para comprobar que pasan**

Run: `rtk pnpm --filter @repo/web test src/onboarding/draft.test.ts`

Expected: PASS.

### Task 2: Cubrir la revelación posterior al upload en la interfaz

**Files:**
- Modify: `src/routes/onboarding.test.tsx:536-546,787-888`

- [ ] **Step 1: Escribir la prueba de interfaz que falle**

Reemplazar `shows only upload field for the statement path` por un caso que confirme que post-cierre no está antes de cargar y sí está después de una carga exitosa. Reutilizar el mock de `XMLHttpRequest` ya usado en `successfully uploads statement PDF...` para resolver el `PUT` con estado 200.

```tsx
it('reveals optional post-close inputs after uploading the statement', async () => {
  const user = userEvent.setup()
  await advanceToCard(1)
  await user.click(screen.getByRole('radio', { name: 'Subir foto o archivo' }))

  expect(screen.queryByLabelText(/cuánto gastaste desde el cierre/i)).toBeNull()
  expect(screen.queryByRole('group', { name: '¿Algo de eso fue en cuotas?' })).toBeNull()

  const mockXHR = {
    open: vi.fn(),
    setRequestHeader: vi.fn(),
    send: vi.fn(),
    upload: {} as any,
    status: 200,
    onload: null as any,
  }
  mockXHR.send.mockImplementation(() => {
    mockXHR.upload.onprogress?.({ lengthComputable: true, loaded: 1, total: 1 })
    mockXHR.onload?.()
  })
  vi.stubGlobal('XMLHttpRequest', function MockXMLHttpRequest() {
    return mockXHR
  })
  const file = new File(['a'], 'resumen.pdf', { type: 'application/pdf' })
  await user.upload(
    screen.getByLabelText('Subir foto o archivo', { selector: 'input[type="file"]' }),
    file,
  )

  expect(await screen.findByLabelText(/cuánto gastaste desde el cierre/i)).toBeDefined()
  expect(screen.getByRole('group', { name: '¿Algo de eso fue en cuotas?' })).toBeDefined()
  expect(screen.getByLabelText(/subí una captura de los últimos movimientos/i)).toBeDefined()
  expect(screen.queryByLabelText('¿En cuántas cuotas?')).toBeNull()
})
```

Add a second assertion path in the same test after choosing `Sí`:

```tsx
await user.click(within(screen.getByRole('group', {
  name: '¿Algo de eso fue en cuotas?',
})).getByRole('radio', { name: 'Sí' }))
expect(screen.getByLabelText('¿En cuántas cuotas?')).toBeDefined()
```

- [ ] **Step 2: Ejecutar la prueba de interfaz**

Run: `rtk pnpm --filter @repo/web test src/routes/onboarding.test.tsx -t "reveals optional post-close inputs after uploading the statement"`

Expected: PASS. No se requiere cambiar `src/routes/onboarding.tsx`: al persistirse y aplicarse `t1_upload_url`, el render ya recalcula `getVisibleFields`.

- [ ] **Step 3: Ejecutar la verificación final**

Run: `rtk pnpm --filter @repo/web test src/onboarding/draft.test.ts src/routes/onboarding.test.tsx && rtk pnpm --filter @repo/web check-types`

Expected: PASS para ambas suites y sin errores de TypeScript.

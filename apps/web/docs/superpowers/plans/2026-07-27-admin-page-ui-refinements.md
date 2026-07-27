# Admin Page UI Refinements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the admin row status chips, reorder file list placement above the report section divider, render readable report URL text, and open report links in a new window.

**Architecture:** `AdminPage` component logic updates in `src/components/admin-page.tsx` with corresponding component integration test assertions in `src/components/admin-page.test.tsx`.

**Tech Stack:** React 19, Vitest, Testing Library, Tailwind CSS.

## Global Constraints

- Chip order in "Estado" column: `Informe Enviado` (green) if `reportSentOn` exists > `Informe Listo` if `hasReport` exists > `Completado` / `Borrador`.
- File attachments section must be rendered directly below `Ver resultados` action buttons, before the report section divider line (`border-t border-[var(--line)]`).
- Link text for `Ver informe` must open in a new window (`target="_blank" rel="noreferrer"`).
- Visible URL string must be displayed next to report action buttons when `hasReport` is true.

---

### Task 1: Update Status Column Chips & Expanded Row Layout

**Files:**
- Modify: `src/components/admin-page.tsx:320-440`
- Modify: `src/components/admin-page.test.tsx:50-200`

- [ ] **Step 1: Write failing UI tests for status chips and file placement**

```tsx
it('renders Informe Enviado green chip and Informe Listo chip based on report state', async () => {
  // Test that device with reportSentOn renders "Informe Enviado"
  // Test that device with hasReport: true & reportSentOn: null renders "Informe Listo"
})

it('renders file attachments section directly below Ver resultados and before the report section divider', async () => {
  // Test container structure order
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `rtk pnpm test src/components/admin-page.test.tsx`

- [ ] **Step 3: Implement status chip logic and layout reordering in AdminPage**

Update `AdminPage` table row status column:
```tsx
<td>
  {device.reportSentOn ? (
    <span className="demo-pill bg-[color-mix(in_oklab,#2e7d32_15%,transparent)] text-[#1b5e20] border-[#2e7d32]/30 font-bold">
      Informe Enviado
    </span>
  ) : device.hasReport ? (
    <span className="demo-pill font-bold">
      Informe Listo
    </span>
  ) : (
    <span className="demo-pill font-bold">
      {device.status === 'completed' ? 'Completado' : 'Borrador'}
    </span>
  )}
</td>
```

Reorder `id={`files-container-${device.deviceId}`}` inside `AdminPage`:
1. Render action buttons (`Ver resultados`, `Descargar CSV`).
2. Render `deviceState.files` listing (loading state, error state, `No se encontraron archivos.`, or files list).
3. Render divider line `<div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[var(--line)]">`.
4. Render report controls block.

- [ ] **Step 4: Run test to verify it passes**

Run: `rtk pnpm test src/components/admin-page.test.tsx`

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/admin-page.tsx src/components/admin-page.test.tsx
rtk git commit -m "feat(admin): update status chips and file attachments placement"
```

### Task 2: Add Visible Link Text and New Window Target for Reports

**Files:**
- Modify: `src/components/admin-page.tsx:350-375`
- Modify: `src/components/admin-page.test.tsx:120-220`

- [ ] **Step 1: Write failing UI tests for report URL text and target=_blank**

```tsx
it('renders report link with target=_blank and displays full URL text', async () => {
  // Assert target="_blank" and rel="noreferrer" on "Ver informe" link
  // Assert text content containing window.location.origin + '/informe/' + deviceId
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `rtk pnpm test src/components/admin-page.test.tsx`

- [ ] **Step 3: Update Ver informe anchor and add visible link text**

```tsx
<a
  href={`/informe/${device.deviceId}`}
  target="_blank"
  rel="noreferrer"
  className="inline-flex h-8 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-2.5 text-sm font-medium text-[var(--sea-ink)] hover:bg-[var(--chip-bg)]"
>
  Ver informe
</a>
<span className="font-mono text-xs text-[var(--sea-ink-soft)] break-all select-all">
  {`${window.location.origin}/informe/${device.deviceId}`}
</span>
```

- [ ] **Step 4: Run full test suite and check-types**

Run: `rtk pnpm test src/components/admin-page.test.tsx && rtk pnpm check-types`

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/admin-page.tsx src/components/admin-page.test.tsx
rtk git commit -m "feat(admin): render readable report URL text and open report link in new tab"
```

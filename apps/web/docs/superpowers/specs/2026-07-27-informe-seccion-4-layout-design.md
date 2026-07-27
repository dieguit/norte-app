# Informe Section 4 Layout & Styling Spec

**Goal:** Realign all 6 feature cards to the left side of Section 4 in `InformePage`, stack the roadmap image and WhatsApp preview on the right side, and increase feature card padding and typography sizes.

## 1. Component Layout (`src/components/informe-page.tsx`)

Replace the existing two split grids in block 4 with a single responsive two-column grid (`md:grid-cols-[1.2fr_0.8fr]`):

### Left Column (`1.2fr`)
Contains all 6 feature articles in order:
1. Tus finanzas se actualizan solas
2. Todos tus objetivos, en una sola hoja de ruta
3. Tu camino cambia cuando cambia tu vida
4. Podés probar antes de decidir
5. Podés preguntarle antes de gastar
6. Recibí alertas inteligentes en tu WhatsApp

### Right Column (`0.8fr`)
Contains stacked visual previews:
1. `img` `/images/roadmap.webp` with `alt="Hoja de ruta financiera de Norte"`.
2. Existing WhatsApp preview container (`#0b141a` dark panel).

## 2. Card Styling & Typography

Each feature article card:
- Container: `rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-5 sm:p-6`
- Heading `h3`: `text-lg font-semibold text-[var(--sea-ink)]`
- Description `p`: `mt-1.5 text-base leading-relaxed text-[var(--sea-ink-soft)]`

## 3. Component Test (`src/components/informe-page.test.tsx`)

Update assertions in `informe-page.test.tsx` to match the single section contract:
- Ensure all 6 feature titles, texts, image src, WhatsApp content, and CTA button are asserted.


# Norte Design System · v0.1

Source of truth for visuals: `docs/design.pen`, boards **Norte DS · Fundamentos**, **Norte DS · Componentes** and **Norte DS · Pautas**. Reference screens live in the same file (Finanzas · Resumen A, Gastos, Ingresos, Ahorros).

Status: designed in `.pen` only. Code still uses the legacy `--sea-*` tokens and unthemed shadcn grays; see [Migration](#migration).

## Principles

1. **Hierarchy before decoration.** Every screen answers, in order: how am I doing → where is it going → what do I want to look at.
2. **One surface, dividers over cards.** Cards only when they carry structure. No stacked cards.
3. **Minimal and modern, map-flavored.** Brand (Norte = north) shows up as the compass mark and a faint map grid, never as forced metaphors.
4. **Reading first, adding fast.** Pages are glanceable; the floating `+` keeps capture one tap away.

## Tokens

Role-based. Components never use raw values. Names match shadcn variables so shadcn primitives pick them up without changes. Dark mode = a second set of role values (not shipped yet).

### Color roles

| Token | Light | Use |
|---|---|---|
| `--background` | `#FFFFFF` | Screen background |
| `--foreground` | `#14202D` | Primary text, amounts |
| `--primary` / `--primary-foreground` | `#14202D` / `#FFFFFF` | Primary actions, FAB |
| `--secondary` / `--secondary-foreground` | `#F6F0E2` / `#14202D` | Nav, header, secondary button |
| `--muted` | `#F1EEE6` | Segmented controls, hover, icon wraps |
| `--muted-foreground` | `#5E6B76` | Secondary text (5.4:1 on white) |
| `--subtle-foreground` | `#687480` | Dates, shares, captions (4.7:1 on white) |
| `--border` | `#E6E2D8` | List dividers |
| `--input` | `#D9D4C8` | Input borders |
| `--ring` | `#14202D66` | Focus ring |
| `--surface-sunken` | `#F6F0E2` | Sand surfaces |
| `--accent-brand` / `--accent-brand-soft` | `#3A6E54` / `#DCE7DF` | Links, kickers, brand badge, goals segment |
| `--positive` | `#2F6B4C` | Positive amounts (always with `+`) |
| `--negative` / `--negative-soft` | `#B4432F` / `#F6E3DF` | Negative amounts, overspent (always with `−`) |
| `--destructive` | `#B4432F` | Destructive actions |
| `--map-grid` | `#3A6E540F` | Map grid lines (6%) |

### Chart families

One family per domain, 9 steps, assigned by slice size (largest = step 1). The category list is always the legend.

| Domain | Tokens | Range |
|---|---|---|
| Gastos | `--chart-expense-1…9` | ink `#14202D` → `#E2E9EF` |
| Ingresos | `--chart-income-1…9` | green `#1F4A35` → `#E3EEE6` |
| Ahorros | `--chart-savings-1…9` | ochre `#5E4524` → `#F2EAD6` |

Light steps are below 3:1; they rely on the list legend and must never carry text.

### Typography

Fraunces for screen/section titles only; Geist for everything else.

| Style | Spec | Example |
|---|---|---|
| `text-display` | Fraunces 26 / 600 / −0.4 | Screen title |
| `text-title` | Fraunces 20 / 600 | Section title |
| `text-heading` | Geist 16 / 600 | Row label, group name |
| `text-body` | Geist 15 / 400 / 1.5 | Body |
| `text-body-sm` | Geist 13 | Meta lines |
| `text-caption` | Geist 12, `subtle-foreground` | Dates |
| `text-overline` | Geist 11 / 600 / +1.5 / uppercase, `accent-brand` | Kickers |

Amounts (always tabular figures):

| Style | Integer / decimals |
|---|---|
| `amount-hero` | 42 / 20 |
| `amount-lg` | 18 / 13 |
| `amount` | 15 / 12 |
| `amount-sm` | 14 / 11 |

### Spacing, radius, elevation

- Spacing: 4px grid (`space-1` 4 … `space-10` 40). Screen padding 20. Touch targets ≥ 44.
- Radius: `sm` 6 (chips) · `md` 10 (buttons, inputs) · `lg` 14 (sheets, segmented) · `full` (pills, FAB, avatar).
- Elevation: none by default. One floating level (`0 6 16 #14202D33`) for FAB, popovers, sheets.

## Components

`.pen` component names in parentheses.

**shadcn, themed by tokens only**: Button (`Button/Primary|Secondary|Outline|Ghost|Destructive`, 44px tall), Badge (`Badge/Brand|Negative|Neutral`), Input (`Input Field`, 48px, amount first), Sheet, Popover, Select, Tabs.

**Norte components**

| Component | Purpose / rules |
|---|---|
| `Money` (`Money/Hero|Large|Default`) | Only way to render amounts. Tabular, smaller dimmed decimals, `−` before currency, tone via color role. Baseline-align with labels (`items-baseline`). |
| `ScreenHeader` | Back (`Icon Button/Outline` 44) + Fraunces title + trailing slot (Month Stepper or actions). |
| `MonthStepper` | `‹ Oct 2026 ›`, 40px buttons. Arrows step; label opens month picker. Not shown on Ahorros (accumulated). |
| `GroupBy` | Pill “Agrupar por: Categoría / Fecha”. Category = groups sorted newest-first inside; Fecha = flat day log. |
| `SectionRow` | Summary → detail row: mini ring, label, meta, amount, chevron. |
| `GroupHeader` + `EntryRow` | Collapsible category/place groups; entries indented 20, recurring marked with `repeat` icon. |
| `DayHeader` + `LogRow` | Date log; category shown as colored dot + text. |
| `FlowBar` | Income split into gastos / objetivos / queda; overspent = `negative` segment overflowing. Goals are read-only here, linked to Objetivos. |
| `CategoryDonut` | Every category gets a slice, total in the center; tapping a slice filters the list. |
| `FloatingAdd` | FAB on an 80px strip above the nav: `bg-gradient-to-t from-white to-transparent backdrop-blur-[2px]`, `pointer-events-none` except the button. List needs ~80px bottom padding. |
| `EmptyState` | Icon, title, one sentence, one primary CTA. |
| `AppHeader`, `BottomNav` | Sand surfaces; active nav item in `foreground`, inactive in `subtle-foreground`. |

## Content guidelines

- Rioplatense Spanish with *vos* (“No tenés gastos este mes”).
- Data first, no judgement: “Excedido $ 7.334”, never “¡Gastaste de más!”. No exclamation marks or emojis.
- Map vocabulary sparingly (“objetivos”, “en curso”).
- `$` for ARS, `US$` for USD; never add different currencies. Savings show ARS and USD side by side with equal weight.
- Zero balances render as `—`. Color is never the only signal: signs always present.
- Newest first in every list. Every list has empty, loading (row-shaped skeleton) and error states.

## Migration

Planned, not started. Order:

1. Rewrite shadcn variables in `apps/web/src/styles.css` with the values above; add the Norte roles and chart families.
2. Alias legacy tokens to roles (`--sea-ink: var(--foreground)`, `--sea-ink-soft: var(--muted-foreground)`, `--line: var(--border)`, `--lagoon-deep`/`--palm: var(--accent-brand)`, `--sand`: `var(--secondary)`, `--error: var(--negative)`), then codemod `text-[var(--sea-ink)]`-style classes to semantic utilities and delete the aliases.
3. Fix display font: set `--font-serif` to Fraunces in `@theme` (33 `font-serif` headings currently render Georgia), self-host via `@fontsource-variable/fraunces`, remove the unused Manrope import.
4. Collapse radii to `sm/md/lg/full`; remove `--shadow-card`, `rounded-2xl`, `rounded-[2rem]`; replace ~20 hard-coded hex colors.
5. Build Norte components in `apps/web/src/components/norte/`.

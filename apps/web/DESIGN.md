---
name: Norte
description: Calm financial wayfinding for decisions that protect long-term goals.
colors:
  sea-ink: "#14202d"
  sea-ink-soft: "#4d5862"
  lagoon: "#b8d0c3"
  lagoon-deep: "#3a6e54"
  sand: "#f6f0e2"
  foam: "#fbf8f1"
  surface: "rgba(255, 255, 255, 0.35)"
  surface-strong: "rgba(255, 255, 255, 0.72)"
  line: "rgba(20, 32, 45, 0.14)"
  error: "#9f3030"
  on-primary: "#ffffff"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontWeight: 700
    lineHeight: 1.1
  body:
    fontFamily: "Geist Variable, sans-serif"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist Variable, sans-serif"
    fontWeight: 700
    letterSpacing: "0.16em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.lagoon-deep}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
  button-secondary:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.sea-ink}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
  card-default:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.sea-ink}"
    rounded: "{rounded.xl}"
    padding: "16px"
  input-default:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.sea-ink}"
    rounded: "{rounded.lg}"
    padding: "10px 14px"
---

# Design System: Norte

## Overview

**Creative North Star: "The Calm Compass"**

Norte feels like steady navigation through a sensitive subject. Warm paper-like grounds, a deep blue-black ink, and restrained lagoon green turn financial planning from a dashboard into a clear, humane route forward. The system is spacious and quiet, prioritizing comprehension over urgency.

Depth is ambient rather than structural: translucent layers, hairline borders, and diffuse shadows create a sense of light without turning the interface into stacked floating panels. Serif display moments add reflection; the Geist interface remains precise and legible during work.

**Key Characteristics:**
- Warm, calm, and non-judgmental.
- Spacious mobile-first layouts with direct paths to action.
- Deep ink and lagoon green carry wayfinding; color never carries meaning alone.
- Softly rounded, lightly lifted surfaces rather than hard dashboard geometry.

## Colors

The palette pairs a quiet coastal green with warm paper neutrals and dark ink so financial information reads as grounded guidance, not an alarm.

### Primary
- **Deep Lagoon:** Primary actions, wayfinding labels, focused controls, and active accents.
- **Soft Lagoon:** Low-emphasis fills, rings, and supporting markers.

**The Quiet Accent Rule.** Deep Lagoon is for direction and decisive action, not broad decoration; it stays rare enough to retain navigational weight.

### Neutral
- **Sea Ink:** Primary text, dark sections, and high-contrast anchors.
- **Soft Sea Ink:** Secondary text and supporting information.
- **Sand:** The primary page ground.
- **Foam:** Pale supporting surfaces and quiet hover states.
- **Translucent Surface:** Glass-like cards, chips, and layers over the sand ground.
- **Fine Line:** Low-contrast divisions that define structure without visual noise.

### Named Rules
**The Honest State Rule.** Error treatments use the dedicated error color and surface; status, temporal meaning, and input feedback also require copy, iconography, or structure.

## Typography

**Display Font:** Fraunces with Georgia fallback.
**Body Font:** Geist Variable with sans-serif fallback.

**Character:** Fraunces is reserved for reflective page-level moments, while Geist makes forms, labels, data, and navigation straightforward. The contrast gives the product warmth without reducing operational clarity.

### Hierarchy
- **Display:** Bold serif, used for onboarding and page-level questions that invite reflection.
- **Headline:** Semibold or bold sans, typically responsive from 30px to 48px, for section and page structure.
- **Title:** Medium sans at 16px, for card headings and compact interface groups.
- **Body:** Regular sans at 16px with relaxed leading, for explanations and task guidance.
- **Label:** Semibold or bold sans, often 12px or smaller with uppercase tracking, for concise categories and status language.

**The Reflection Boundary Rule.** Do use Fraunces for a consequential prompt or page title; don't use it for dense controls, tables, or repeated labels.

## Layout

The default content width is 1080px, expanding to 1280px for wide report views. Page gutters begin at 20px and grow to 32px from the small breakpoint. Landing layouts use a 6xl container and shift from stacked mobile sections to composed desktop grids; application content remains single-column until the information itself benefits from a grid.

Spacing follows a compact 4px rhythm inside components and a generous 16px, 24px, 32px, and 48px rhythm between groups. Major marketing sections open to 64px or more of vertical space. Mobile is the base layout: desktop adds columns and persistent structure rather than shrinking a desktop canvas.

## Elevation & Depth

Norte uses transparent tonal layers, a fine inset highlight, and one diffuse multi-part ambient shadow for cards and prominent image frames. Borders remain visible at rest; elevation is gentle support for grouping, not a signal of hierarchy by itself.

### Shadow Vocabulary
- **Ambient Card Shadow:** `0 1px 0 var(--inset-glint) inset, 0 18px 34px rgba(30, 90, 72, 0.1), 0 4px 14px rgba(23, 58, 64, 0.06)`: For raised cards, image frames, and shell accents.

**The Grounded Surface Rule.** Do keep shadows soft and green-tinted; don't use hard black drop shadows or stack multiple elevated card layers.

## Shapes

The form language is gently rounded and varied by scale: compact controls sit around 8px to 12px, fields and cards around 12px to 16px, and high-level landing cards around 24px to 32px. Pills identify status and lightweight actions. Borders are fine and low contrast; dashed borders reserve an invitation to add or upload.

## Components

### Buttons
- **Character:** Quietly reassuring controls with direct labels and compact proportions.
- **Shape:** Soft rectangle (16px) for interface buttons; pill shape for landing-page calls to action and status.
- **Primary:** Deep Lagoon background with white text, typically 32px high and 10px horizontal padding in dense app contexts.
- **Hover / Focus:** Hover deepens or lightly lifts the control; focus uses a visible lagoon-derived ring and border.
- **Secondary / Ghost / Destructive:** Secondary uses a pale tonal fill, ghost remains mostly transparent, and destructive uses the dedicated error family rather than the primary accent.

### Chips
- **Style:** Pill-shaped status labels with a translucent white fill, fine green-tinted border, compact padding, and uppercase tracked text.
- **State:** Use for concise status, metadata, or availability. Keep them informational, not as substitutes for primary actions.

### Cards / Containers
- **Corner Style:** Rounded from 16px in operational views to 24px or 32px in editorial landing sections.
- **Background:** Translucent Surface or Strong Surface over Sand; dark cards use Sea Ink with white text.
- **Shadow Strategy:** Ambient Card Shadow only when the container needs separation from the ground.
- **Border:** Fine Line at rest, with a modest lagoon shift on interactive hover.
- **Internal Padding:** 16px by default; 24px in prominent landing cards.

### Inputs / Fields
- **Style:** Strong Surface fill, Fine Line border, 12px corners, and 14px horizontal padding.
- **Focus:** Deep Lagoon-derived border and a soft Lagoon ring.
- **Error / Disabled:** Error uses the dedicated error color and readable message; disabled fields reduce opacity and reject pointer interaction.

### Navigation
- **Style:** Quiet Sea Ink navigation with an underlined active or hover state in a lagoon-to-teal gradient. Mobile layouts prioritize touch targets and short labels; desktop layouts add persistent structure only where it aids task completion.

## Do's and Don'ts

### Do:
- **Do** lead financial actions with calm Argentine Spanish and clear next steps.
- **Do** reserve Deep Lagoon for primary direction, focus, and action.
- **Do** pair state colors with text, shape, or icons.
- **Do** use generous sand-grounded space around page-level decisions.
- **Do** keep focus rings visible and keyboard flows legible.

### Don't:
- **Don't** turn the interface into a dense transaction dashboard or a wall of cards.
- **Don't** use harsh shadows, sharp rectangular panels, or high-saturation decorative color fields.
- **Don't** rely on serif type for dense operational UI.
- **Don't** present errors, forecasts, or incomplete financial data with invented certainty.

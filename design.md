# IELTS WriteBetter — design system

**Concept:** a marked exam paper. Warm paper ground, blue-ink accent, hairline rules instead of boxed cards, serif for headings and band scores.

**Audience:** Vietnamese students preparing IELTS Writing (band 5.5–7.5). Core job: write an essay, read a TR / CC / LR / GRA breakdown, revise.

## Tokens
Defined as shadcn variables in `app/globals.css` (the "Hallmark redesign" block at the end overrides the original values).

| Role | Light | Dark |
|---|---|---|
| Paper (`--background`) | `oklch(0.984 0.008 85)` | `oklch(0.17 0.012 255)` |
| Ink (`--foreground`) | `oklch(0.22 0.02 255)` | `oklch(0.93 0.01 85)` |
| Blue ink (`--primary`) | `oklch(0.48 0.14 255)` | `oklch(0.72 0.11 250)` |
| Red pen (`--accent`) | `oklch(0.52 0.15 30)` | `oklch(0.7 0.13 35)` |
| Rule (`--border`) | `oklch(0.9 0.012 85)` | `oklch(0.29 0.016 255)` |

- Radius: `--radius: 0.375rem`; `rounded-2xl` is capped at `0.625rem`.
- Primary is used only for CTAs, links and band numbers. Accent (red pen) is used only for corrections.

## Type
- Display: **Source Serif 4**, weight 600 (`font-display`; applied automatically to `h1`, `h2` and card titles).
- Body: **Be Vietnam Pro**, weights 400/500/600 (`font-sans`).
- Data: Geist Mono with `tabular-nums` for scores, counts and criterion codes.

## Layout
- Marketing (`/`): Workbench. A left-aligned intro and the criteria list sit side by side, with the live scoring demo as the main element. No feature-card grid.
- App pages: the existing structure, flattened. Use a single border, no gradients, no nested cards. Prefer a numbered list with rules over a grid of cards.
- Content (`/privacy`, `/terms`): Long Document, one readable column.

## Motion
- Hover and press: colour or border transitions, plus a 1px press on buttons (`active:translate-y-px`). No `hover:scale`, no lift shadows.
- Entrances (in `app/globals.css`):
  - `animate-page-in`: a 240ms opacity fade on every route change, applied in `app/template.tsx`. It uses opacity only, because a transform would re-anchor `position: fixed` children such as the TOC.
  - `animate-rise-in`: 360ms with 6px of travel, for content that appears after an action (demo result, chat messages).
  - `stagger-children`: reveals the direct children of a grid or list 50ms apart, capped at 300ms (criteria list, dashboard grids, prompt cards).
- The typing indicator fades in opacity (`animate-typing`) and does not bounce.
- `prefers-reduced-motion` removes durations and delays; smooth anchor scrolling only runs without it.

## Don'ts
- No emoji in UI copy; use Lucide icons.
- No side-stripe (`border-l-4`) callouts; use a full hairline border with a tint.
- No unverifiable marketing claims (discounts, "no credit card").

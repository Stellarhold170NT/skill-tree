# DESIGN.md — SkillTree design tokens (single source of truth)

Every plugin UI, dashboard, and form in this repo uses ONLY the tokens below.
Do not introduce colors, fonts, or radii outside this file. If a token is
missing, propose it in an OpenSpec change that edits this file — never inline a
one-off value. Plugin UIs must also pass the anti-slop review
(`workloop-ws/resources/impeccable/anti-slop-catalog.md`, 62 rules; optional
detector `npx impeccable detect`).

Tone targets (Impeccable niche `02-kids-reading`,
https://impeccable.style/gallery/?model=claude-opus-5-5&niche=02-kids-reading):
student-facing surfaces are warm, encouraging, "feels like a bookshop";
teacher-facing surfaces prioritize information density, tables and heatmaps.

## 1. Color sources (verified)

| Source | File | Facts |
|---|---|---|
| Brand primary green `#27A95F` | `resources/logo.svg` (7 occurrences) | also `theme.primaryColor` in `services/skill-tree-service/plugins/skilltree-brand/brand.config.json` |
| Boot green `#167F4D` | `resources/logo.svg`; `theme.boot` in `brand.config.json` | text-safe green on white (5.03:1) |
| Light accent `#56C974` | `resources/logo.svg` | highlights on dark ink only |
| Ink `#1C3632` | `resources/logo.svg` (4 occurrences) | deep teal, main dark text (12.94:1 on white) |
| Neutral `#F2F2F2` | `resources/logo-whitemode.svg` | surface tint |
| Primary ramp formula | `plugins/skilltree-brand/lib/index.js` (`mixTo` 50–900) | ramp below computed with the exact runtime formula |
| Mastery thresholds | `services/learner-model-service/app/config.py` | `MASTERY_AMBER = 0.4`, `MASTERY_GREEN = 0.85` |

Red and Amber (and the tint fills) do not exist in brand assets; they are
declared here as the sanctioned system tokens, chosen for WCAG AA contrast
against the brand greens (evidence in §3).

## 2. Brand palette

### Primary (leaf green) ramp — matches `skilltree-brand` runtime output

| Token | Hex | Use |
|---|---|---|
| `--st-primary-50` | `#F4FBF7` | subtle background wash |
| `--st-primary-100` | `#E5F5EC` | hover/surface tint |
| `--st-primary-200` | `#C7E9D5` | selected row/border |
| `--st-primary-300` | `#9ED8B7` | decorative accents |
| `--st-primary-400` | `#63C18C` | progress fill (light) |
| `--st-primary-450` | `#41B372` | brand alias (runtime `--dsw-alias-brand-primary-new-colorprimary-new-color`) |
| `--st-primary-500` | `#27A95F` | **brand primary** — fills, buttons, chart bars; white text on it only at large size/UI-component contrast (3.03:1) |
| `--st-primary-600` | `#218E50` | button hover |
| `--st-primary-800` | `#145831` | emphasis borders |
| `--st-primary-900` | `#0E3D22` | deepest green |

Supports: `--st-boot: #167F4D` (text-safe green on white), `--st-accent-light:
#56C974` (on ink backgrounds only), `--st-primary-invert: #FFFFFF`.

### Secondary / ink (deep teal, from logo)

| Token | Hex | Use |
|---|---|---|
| `--st-ink` | `#1C3632` | headings, dark surfaces, chart dark series |
| `--st-ink-soft` | `#3A544E` | secondary dark text (AA on white) |

### Neutrals

| Token | Hex | Use |
|---|---|---|
| `--st-neutral-100` | `#F2F2F2` | page/surface tint (from logo-whitemode) |
| `--st-neutral-300` | `#D4D8D6` | hairline borders |
| `--st-neutral-500` | `#6B7280` | muted text (4.83:1 on white) |
| `--st-neutral-800` | `#374151` | body text (10.31:1 on white) |
| `--st-surface` | `#FFFFFF` | cards, panels |

### Semantic + mastery (Red / Amber / Green)

Mastery status thresholds from M5: Red < 0.4, Amber 0.4–0.85, Green ≥ 0.85.
Green mastery reuses the brand greens; Red/Amber are system tokens.

| Token | Hex | Pairing + AA evidence (computed, WCAG 2.1) |
|---|---|---|
| `--st-danger` | `#B3261E` | Red text on white 6.54:1; on `--st-danger-tint` 5.72:1 |
| `--st-danger-tint` | `#FDECEC` | heatmap cell / badge fill |
| `--st-warn` | `#8A4B00` | Amber text on white 6.80:1; on `--st-warn-tint` 6.21:1 |
| `--st-warn-tint` | `#FFF4D6` | heatmap cell / badge fill |
| `--st-success-text` | `#167F4D` | Green text on white 5.03:1 |
| `--st-success-tint` | `#E6F7EC` | fill; pair with `#145C39` text for 7.21:1 |
| `--st-success-fill` | `#27A95F` | graph node / progress fill (large UI only) |
| `--st-warn-fill` | `#F5C453` | Amber heatmap dot/fill (large UI only, never text) |
| `--st-danger-fill` | `#D9534F` | Red heatmap dot/fill (large UI only, never text) |

Heatmap rule: cells use tint fills with the matching `*-text` color (AA on
tint); dots/fills in the graph use the `*-fill` tokens sized as large UI
components (≥3:1 against `--st-surface`), never for body-size text.

## 3. Typography

- **UI sans (default)**: system stack,
  `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`.
  Inter/Geist as universal identity fonts are forbidden (anti-slop catalog).
- **Display serif (student-facing headings, "bookshop" tone)**:
  `Georgia, "Times New Roman", serif` — headings only, never body text.
- **Mono (code, IDs, JSON)**: `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`.
- Body: 16px / line-height 1.5 / line length 65–75 characters; secondary 14px;
  captions 12px; h1 28–32px; h2 22–24px; h3 18px; no all-caps paragraphs, no
  justified text, heading levels must not skip.

## 4. Radius & spacing

- Radius scale: `4px` (inputs, small chips) · `8px` (buttons, list rows) ·
  `12px` (cards, panels) · `16px` (modals) · `999px` (pills, avatar). No
  extreme/squircle radii outside this scale.
- Spacing: 4px base — `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64`. Keep rhythm
  consistent; avoid monotonous equal spacing everywhere (anti-slop).

## 5. Hard rules (anti-slop highlights)

1. No purple-blue gradients, no neon cyan on dark, no glow accents.
2. No decorative glassmorphism (blur cards, glow borders, radial halos).
3. No gradient text; no cream/beige defaults.
4. No nested-card stacking (max 2 visual layers; never 5).
5. Hairline border and wide shadow do not appear on the same element.
6. Contrast: WCAG AA — 4.5:1 body text, 3:1 large text/UI components; no
   low-contrast gray-on-color.
7. Motion: no marquee, no pulsing dots, no bounce/elastic easing; content must
   stay visible if animations fail.
8. Images: no placeholder illustrations, no jagged masks, no content buried
   under overlays.
9. Copy: no generic marketing claims ("supercharge", "world-class").

## 6. Where tokens come from at runtime

`skilltree-brand` injects the primary ramp as `--dsw-static-deepseek-{50..900}`
CSS variables computed from `theme.primaryColor`; plugin CSS may consume those
variables or the `--st-*` tokens documented here. Both derive from the same
source, so they never drift.

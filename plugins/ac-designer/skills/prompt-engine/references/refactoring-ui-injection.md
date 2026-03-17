# Refactoring UI — Unified Design Reference

Design token systems and principles synthesized from Refactoring UI for web and mobile platforms.

## Spacing Scale

| Token | Web (px) | Mobile (dp) | Use Case |
|-------|----------|-------------|----------|
| 1 | 4 | 4 | Micro gaps, icon padding |
| 2 | 8 | 8 | Tight spacing within components |
| 3 | 12 | 12 | Related elements |
| 4 | 16 | 16 | Standard section padding |
| 6 | 24 | 24 | Between sections |
| 8 | 32 | 32 | Major separation |
| 12 | 48 | 48 | Large gaps, tablet margins |
| 16 | 64 | — | Hero spacing (web only) |
| 24 | 96 | — | Maximum separation (web only) |

Rule: more space **between** groups than **within** them. When in doubt, go bigger.

## Type Scale

| Web (px) | Mobile (sp) | Semantic Role |
|----------|-------------|---------------|
| 12 | 11–12 | Caption, labels, fine print |
| 14 | 14 | Body text, default |
| 16 | 16 | Emphasized body |
| 18 | 18–20 | Subheadings |
| 20 | — | Card titles (web) |
| 24 | 24 | Page section titles / screen titles |
| 30 | 28–34 | Page headings / large titles (iOS) |
| 36 | — | Hero subheading (web) |
| 48 | — | Hero heading (web) |
| 60–72 | — | Display text (web) |

Max 2 font families. Use weight and color to differentiate before reaching for a larger size.

## Shadow / Elevation Scale

| Level | Web Description | Mobile (dp) | Use Case |
|-------|----------------|-------------|----------|
| 0 | none | 0 | Flat surfaces |
| 1 | subtle, tight offset | 1–2 | Buttons, cards, tiles |
| 2 | medium spread | 4 | Dropdowns, raised buttons, app bar |
| 3 | large spread | 8 | Popovers, bottom sheets, dialogs |
| 4 | wide, soft | 16 | Sticky elements, navigation drawers |
| 5 | sky-high | 24 | Modals, dialogs |

Light comes from above. Use two-part shadows (sharp + diffused) for a premium feel. iOS prefers subtle shadows + blur; Android uses Material elevation.

## Hierarchy Rules

| Tier | Size | Weight | Color |
|------|------|--------|-------|
| **Primary** | Largest | Bold / Semi-bold | Dark (#111827) |
| **Secondary** | Base | Regular | Grey (#6B7280) |
| **Tertiary** | Smallest | Regular / Light | Light grey (#9CA3AF) |

- **Emphasize by de-emphasizing** — make competing elements quieter instead of making the target louder.
- **Size isn't everything** — adjust weight and color before increasing font size.
- **Labels are a last resort** — combine label + value when possible (e.g., "12 left in stock" not "Stock: 12").
- **One primary action per screen/section** — everything else is secondary or tertiary.
- Icons need softer colors to balance visually with text.

## HSL Color System

1. Pick a base color (500) that works as a button background.
2. Define edges: 100 (tinted bg) and 900 (dark text).
3. Fill the middle: 200, 300, 400, 600, 700, 800.

Key rules:
- **Increase saturation at lightness extremes** — pale and dark shades look washed out without it.
- **Rotate hue toward nearest bright** (60° yellow, 180° cyan, 300° magenta) for lighter shades.
- **Greys** need 8–10 shades; add warm (yellow/orange tint) or cool (blue tint) undertone.
- **Contrast ratios**: 4.5:1 for normal text, 3:1 for large text (WCAG AA).
- Never use grey text on colored backgrounds — hand-pick a color with matching hue instead.

## Touch Targets

| Platform | Minimum Size |
|----------|-------------|
| iOS | 44 × 44 pt |
| Android | 48 × 48 dp |
| Comfortable | 56 × 56 dp |

Ensure adequate spacing between interactive elements. Provide visual feedback on press (ripple, scale, opacity change).

## Anti-Patterns — NEVER Do

1. Grey text on colored backgrounds — hand-pick colors from the same hue family
2. Touch targets smaller than 44 × 44 pt (iOS) / 48 × 48 dp (Android)
3. Text smaller than 11 sp on mobile — illegible on real devices
4. Fill the whole screen when content needs less space
5. Ambiguous spacing — same gaps between unrelated groups as within groups
6. Rely on color alone for meaning — always add shape, icon, or text redundancy
7. Scale icons beyond their intended size — they become blurry or disproportionate
8. Use grids religiously — fixed widths often work better than fluid columns
9. Relative sizing that doesn't scale well across breakpoints
10. Full-width buttons edge-to-edge without padding or safe-area respect
11. Ignoring safe areas (notch, home indicator, status bar)

## Design Principles Injection

Inject this block verbatim into every design prompt:

**DESIGN PRINCIPLES:**
- Hierarchy: Establish Primary/Secondary/Tertiary importance through size, weight, AND color — not size alone
- Spacing: Use 4px grid system (4, 8, 12, 16, 24, 32, 48, 64, 96). More space between groups than within
- Typography: Stick to the defined type scale. Maximum 2 font families. Use weight and color before increasing size
- Color: HSL-based adjustments. Increase saturation at lightness extremes. 4.5:1 contrast ratio for normal text
- Shadows: 5-level elevation system. Light comes from above. Use two-part shadows for premium feel
- Polish: Fewer borders — prefer shadows or spacing for separation. Accent borders for visual interest
- Empty states: Design as first impressions, not afterthoughts
- Labels: Last resort — combine with values when possible

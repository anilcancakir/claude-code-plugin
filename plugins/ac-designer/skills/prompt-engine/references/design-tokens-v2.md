# DESIGN.md v2 Format Spec

DESIGN.md v2 replaces the prose-based token format with a verbatim-injectable prompt fragment. The core problem: when tokens are described as prose, Gemini "approximately" interprets them on each page — causing color drift, radius drift, and spacing drift across a multi-page project.

The v2 solution: one block of text, copied word-for-word into every Stitch prompt. No assembly, no paraphrasing, no interpretation.

## Structure

A v2 DESIGN.md has exactly two sections:

| Section | Purpose | Injected into prompts? |
|---------|---------|----------------------|
| `## DESIGN SYSTEM BLOCK` | Verbatim Stitch prompt fragment — constraints Gemini must obey | Yes — copied as-is |
| `## Token Reference` | Structured token table for human review and future drift detection | No — reference only |

## DESIGN SYSTEM BLOCK

This section contains the exact text that goes into every Stitch prompt. The entire content between the `## DESIGN SYSTEM BLOCK` heading and the next `##` heading is the injectable payload.

### Format Template

```
DESIGN SYSTEM (MANDATORY — ZERO DEVIATION):
- Background: [Semantic Name] (#hex) — [role and usage constraint]
- Surface: [Semantic Name] (#hex) — [role]
- Primary: [Semantic Name] (#hex) — [role]
- Primary Hover: [Semantic Name] (#hex) — [role]
- Text Primary: [Semantic Name] (#hex) — [role]
- Text Muted: [Semantic Name] (#hex) — [role]
- Destructive: [Semantic Name] (#hex) — [role]
- Border: [Semantic Name] (#hex) — [role]

Typography: "[Family]" ONLY — H1: [Tailwind class], H2: [Tailwind class], Body: [Tailwind class], Caption: [Tailwind class]
Geometry: [Component] [Tailwind class] ([px]), [Component] [Tailwind class] ([px])
Spacing: [N]px base ([Tailwind class]). Page padding [Tailwind class].
Shadows: [Component] [Tailwind class] ONLY, [Component] [Tailwind class] ONLY

MUST NOT: [constraint 1]. [constraint 2]. [constraint 3]. [constraint 4].
```

### Format Rules

- **Opening line** `DESIGN SYSTEM (MANDATORY — ZERO DEVIATION):` is non-negotiable. The "MANDATORY" and "ZERO DEVIATION" phrases anchor Gemini's compliance at the attention-peak start of the block.
- **Color lines** use the pattern `- Role: Semantic Name (#hex) — usage`. Every color MUST have a hex code. No named colors ("blue", "gray") without hex anchoring.
- **Typography** specifies the font family in quotes, followed by Tailwind size classes for each heading level. The `ONLY` suffix prevents Gemini from introducing secondary fonts.
- **Geometry** maps component types to Tailwind `rounded-*` classes with pixel equivalents in parentheses. Pixel values prevent Gemini from "approximating" a different radius.
- **Spacing** declares the base unit in pixels with its Tailwind equivalent, plus page-level padding.
- **Shadows** use Tailwind `shadow-*` classes with `ONLY` suffix to prevent invention of custom box-shadow values.
- **MUST NOT line** is the final line of the block. Position at the end exploits Gemini's recency bias — constraints here receive disproportionate attention. Always include: no undeclared colors, no border-radius deviations on cards, no spacing scale violations, no font substitution.

## Token Reference

The Token Reference section provides a structured table for each token category. This data is NOT injected into prompts — it serves as a machine-readable source of truth for human review and future drift detection tooling.

### Table Format

One table per category. Each table has these columns:

**Colors**

| Token | Hex | Tailwind Class | Role |
|-------|-----|---------------|------|
| Background | #hex | `bg-[#hex]` | Full-page background |
| Surface | #hex | `bg-[#hex]` | Card/panel fill |
| ... | ... | ... | ... |

**Typography**

| Token | Value | Tailwind Class | Usage |
|-------|-------|---------------|-------|
| Family | "Inter" | `font-sans` | All text |
| H1 | 30px/700 | `text-3xl font-bold` | Page titles |
| ... | ... | ... | ... |

**Geometry**

| Component | Radius | Tailwind Class | Notes |
|-----------|--------|---------------|-------|
| Card | 12px | `rounded-xl` | All card containers |
| Button | 8px | `rounded-lg` | All interactive buttons |
| ... | ... | ... | ... |

**Spacing**

| Token | Value | Tailwind Class | Usage |
|-------|-------|---------------|-------|
| Base unit | 4px | `gap-1` / `p-1` | Minimum increment |
| Page padding | 24px | `px-6` | Outer page margin |
| ... | ... | ... | ... |

**Shadows**

| Component | Tailwind Class | CSS Value | Usage |
|-----------|---------------|-----------|-------|
| Card | `shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.1)` | Card elevation |
| Button | `shadow-sm` | `0 1px 2px 0 rgba(0,0,0,0.05)` | Subtle button lift |
| ... | ... | ... | ... |

## Worked Example

A complete `.stitch/DESIGN.md` v2 for a dark-theme dashboard with ocean blue accents.

```markdown
# DESIGN.md

## DESIGN SYSTEM BLOCK

DESIGN SYSTEM (MANDATORY — ZERO DEVIATION):
- Background: Deep Ocean (#0F172A) — full-page background, all `<body>` and wrapper elements
- Surface: Slate Panel (#1E293B) — card fill, sidebar fill, dropdown menus, modal backgrounds
- Primary: Ocean Blue (#3B82F6) — buttons, links, active tab indicators, toggle-on states
- Primary Hover: Bright Ocean (#2563EB) — hover/focus state for all Primary elements
- Text Primary: Snow (#F8FAFC) — headings, body text, nav labels, button text on dark backgrounds
- Text Muted: Cool Gray (#94A3B8) — secondary labels, timestamps, helper text, placeholder text
- Destructive: Signal Red (#EF4444) — delete buttons, error messages, destructive action confirmations
- Border: Slate Edge (#334155) — card borders, dividers, input outlines, table row separators

Typography: "Inter" ONLY — H1: text-3xl font-bold, H2: text-xl font-semibold, Body: text-sm font-normal, Caption: text-xs font-medium
Geometry: Cards rounded-xl (12px), Buttons rounded-lg (8px), Inputs rounded-lg (8px), Modals rounded-2xl (16px), Avatars rounded-full (9999px)
Spacing: 4px base (gap-1). Page padding px-6. Section gap gap-6. Card padding p-5.
Shadows: Cards shadow-lg ONLY, Buttons shadow-sm ONLY, Modals shadow-2xl ONLY, Dropdowns shadow-xl ONLY

MUST NOT: use any color not listed above — no gray-400, no blue-300, no opacity variants unless explicitly declared. No border-radius other than the Geometry values on their mapped components. No spacing values outside the 4px scale (4, 8, 12, 16, 20, 24, 32, 40, 48, 64). No font other than "Inter".

## Token Reference

### Colors

| Token | Hex | Tailwind Class | Role |
|-------|-----|---------------|------|
| Background | #0F172A | `bg-[#0F172A]` / `bg-slate-900` | Full-page background |
| Surface | #1E293B | `bg-[#1E293B]` / `bg-slate-800` | Card/panel fill |
| Primary | #3B82F6 | `bg-[#3B82F6]` / `bg-blue-500` | Interactive elements |
| Primary Hover | #2563EB | `hover:bg-[#2563EB]` / `hover:bg-blue-600` | Hover/focus states |
| Text Primary | #F8FAFC | `text-[#F8FAFC]` / `text-slate-50` | Headings, body text |
| Text Muted | #94A3B8 | `text-[#94A3B8]` / `text-slate-400` | Secondary text |
| Destructive | #EF4444 | `bg-[#EF4444]` / `bg-red-500` | Destructive actions |
| Border | #334155 | `border-[#334155]` / `border-slate-700` | Dividers, outlines |

### Typography

| Token | Value | Tailwind Class | Usage |
|-------|-------|---------------|-------|
| Family | Inter | `font-sans` | All text — no fallback font visible |
| H1 | 30px / 700 | `text-3xl font-bold` | Page titles |
| H2 | 20px / 600 | `text-xl font-semibold` | Section headings |
| Body | 14px / 400 | `text-sm font-normal` | Paragraphs, table cells |
| Caption | 12px / 500 | `text-xs font-medium` | Labels, badges, timestamps |

### Geometry

| Component | Radius | Tailwind Class | Notes |
|-----------|--------|---------------|-------|
| Card | 12px | `rounded-xl` | All card containers, stat boxes |
| Button | 8px | `rounded-lg` | All buttons (primary, secondary, ghost) |
| Input | 8px | `rounded-lg` | Text inputs, selects, textareas |
| Modal | 16px | `rounded-2xl` | Dialog windows, drawers |
| Avatar | 9999px | `rounded-full` | User avatars, status indicators |

### Spacing

| Token | Value | Tailwind Class | Usage |
|-------|-------|---------------|-------|
| Base | 4px | `gap-1` / `p-1` | Minimum spacing increment |
| Component gap | 8px | `gap-2` | Between sibling elements in a group |
| Card padding | 20px | `p-5` | Inner card content padding |
| Section gap | 24px | `gap-6` | Between major page sections |
| Page padding | 24px | `px-6` | Outer content margin |
```

## Extraction Rules

Step-by-step procedure for extracting tokens from Stitch-generated HTML to produce a v2 DESIGN.md. Stitch output is non-deterministic — the same visual can appear as inline styles, arbitrary-value Tailwind classes, or named Tailwind utilities. Handle all three forms.

### Colors

1. Scan all `style` attributes for `color:`, `background-color:`, `background:`, `border-color:` — extract hex values.
2. Scan all `class` attributes for `bg-[#xxx]`, `text-[#xxx]`, `border-[#xxx]` arbitrary-value classes — extract hex values from inside brackets.
3. Scan all `class` attributes for named Tailwind color utilities (`bg-slate-900`, `text-blue-500`, `border-gray-700`) — resolve each to its hex value using the Tailwind default palette.
4. Deduplicate: same hex from inline style and Tailwind class counts as one token.
5. Group by semantic role:
   - **Background**: the darkest/lightest color applied to `<body>`, root wrappers, or full-width containers.
   - **Surface**: color applied to cards, panels, sidebars, modals — always one step lighter/darker than Background.
   - **Primary**: color on buttons, links, active indicators, toggles.
   - **Primary Hover**: color on `:hover` or `hover:` variants of Primary elements.
   - **Text Primary**: color on `<h1>`, `<h2>`, `<p>`, nav labels — the highest-contrast text color.
   - **Text Muted**: color on secondary labels, timestamps, helper text — lower contrast than Text Primary.
   - **Destructive**: color on delete/remove buttons, error messages — typically red-family.
   - **Border**: color on `border-*` utilities or `border-color` styles — used for dividers, card outlines, input outlines.
6. Assign a semantic name to each (e.g., "Deep Ocean" for #0F172A). Use evocative names, not generic ("dark background").

### Typography

1. Scan `style` attributes for `font-family` — extract the primary family name (first value before any fallback comma).
2. Scan `class` attributes for `font-sans`, `font-serif`, `font-mono` — resolve to the configured family.
3. Scan for `text-{size}` classes (`text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, `text-3xl`, etc.) and `font-{weight}` classes (`font-normal`, `font-medium`, `font-semibold`, `font-bold`).
4. Map to heading hierarchy:
   - **H1**: largest `text-*` class paired with heaviest `font-*` weight — typically page titles.
   - **H2**: second-largest size/weight — section headings.
   - **Body**: the most frequently used size — paragraph and table text.
   - **Caption**: smallest size — labels, badges, timestamps.
5. If `font-family` appears as inline style (e.g., `style="font-family: 'Inter', sans-serif"`), extract `Inter`. If only Tailwind utility (`font-sans`), note the configured family from the project's Tailwind config or default (`ui-sans-serif, system-ui, sans-serif`).

### Geometry

1. Scan `style` attributes for `border-radius` — extract pixel values.
2. Scan `class` attributes for `rounded-*` classes (`rounded-sm`, `rounded`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-full`).
3. Scan for `rounded-[Npx]` arbitrary-value classes — extract the pixel value.
4. Group by component type:
   - **Card**: `rounded-*` on elements containing content blocks (identified by padding + shadow or border).
   - **Button**: `rounded-*` on `<button>`, `<a>` with button-like classes, or elements with `cursor-pointer` + background.
   - **Input**: `rounded-*` on `<input>`, `<select>`, `<textarea>`.
   - **Modal**: `rounded-*` on overlay/dialog containers (typically the largest radius).
   - **Avatar**: `rounded-full` on small square/circular image containers.
5. Record both the Tailwind class and its pixel equivalent. Tailwind defaults: `rounded-sm` = 2px, `rounded` = 4px, `rounded-md` = 6px, `rounded-lg` = 8px, `rounded-xl` = 12px, `rounded-2xl` = 16px, `rounded-3xl` = 24px, `rounded-full` = 9999px.

### Spacing

1. Scan `class` attributes for `gap-*`, `p-*`, `px-*`, `py-*`, `pt-*`, `pb-*`, `pl-*`, `pr-*`, `m-*`, `mx-*`, `my-*`, `space-x-*`, `space-y-*` classes.
2. Scan `style` attributes for `padding`, `margin`, `gap` — extract pixel values.
3. Identify the dominant base unit: check if values cluster on a 4px grid (4, 8, 12, 16, 20, 24...) or 8px grid (8, 16, 24, 32...). The 4px grid is more common.
4. Record:
   - **Base unit**: the smallest recurring gap/padding value.
   - **Component gap**: gap between sibling elements within a section.
   - **Card padding**: inner padding of card/panel containers.
   - **Section gap**: gap between major page sections.
   - **Page padding**: outermost `px-*` or `mx-auto` + `max-w-*` padding.

### Shadows

1. Scan `class` attributes for `shadow-*` classes (`shadow-sm`, `shadow`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl`).
2. Scan `style` attributes for `box-shadow` — extract the full CSS value.
3. Scan for `shadow-[value]` arbitrary-value classes.
4. Map to component roles:
   - **Card**: shadow applied to card/panel containers — typically `shadow-lg` or `shadow-md`.
   - **Button**: shadow on buttons — typically `shadow-sm` or `shadow`.
   - **Modal**: shadow on overlay dialogs — typically `shadow-xl` or `shadow-2xl`.
   - **Dropdown**: shadow on popover/dropdown menus — typically `shadow-xl`.
5. Record the Tailwind class. If only an inline `box-shadow` value exists, map it to the closest Tailwind shadow utility.

### MUST NOT Generation

After extracting all tokens, generate 3-4 anti-drift constraints for the MUST NOT line:

1. **No undeclared colors**: "use any color not listed above — no [common drift example], no [common drift example], no opacity variants unless explicitly declared." Pick 2 Tailwind color utilities that are close to but NOT the declared tokens (e.g., if Primary is `blue-500`, call out `blue-300` and `blue-700`).
2. **No radius deviation**: "No border-radius other than the Geometry values on their mapped components." This prevents Gemini from using `rounded-md` on cards when the spec says `rounded-xl`.
3. **No spacing violations**: "No spacing values outside the [N]px scale ([list of valid values])." Enumerate the actual scale derived from the base unit.
4. **No font substitution**: "No font other than \"[Family]\"." Prevents Gemini from introducing system fonts or fallback rendering.

## How to Inject

In every Stitch prompt, copy the DESIGN SYSTEM BLOCK section content verbatim between the vibe line and PAGE STRUCTURE. Do not paraphrase, reassemble, or summarize. The block starts at `DESIGN SYSTEM (MANDATORY — ZERO DEVIATION):` and ends at the `MUST NOT:` line (inclusive).

```
[Vibe line — one-line atmosphere description]

DESIGN SYSTEM (MANDATORY — ZERO DEVIATION):
[...exact content from DESIGN SYSTEM BLOCK...]

PAGE STRUCTURE:
[...page-specific sections...]
```

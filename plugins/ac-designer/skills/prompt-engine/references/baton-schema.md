# Baton File Schema

The baton file (`next-prompt.md`) is the communication mechanism between loop iterations. It tells the next agent what to build.

## Format

```yaml
---
page: <filename-without-extension>
type: layout|page
---
<prompt-content>
```

## Fields

### Frontmatter (YAML)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `page` | string | Yes | Output filename (without `.html` extension) |
| `type` | string | Yes | Screen kind: `layout` for shared chrome/navigation, `page` for content screens |

### Body (Markdown)

The body contains the full Stitch prompt, which must include:

1. **One-line description** with vibe/atmosphere keywords
2. **DESIGN SYSTEM BLOCK** (required) — the `## DESIGN SYSTEM BLOCK` section from `.stitch/DESIGN.md` copied verbatim. Includes exact hex codes, Tailwind classes, and MUST NOT constraints.
3. **Page Structure** — numbered list of sections/components

## Example

```markdown
---
page: achievements
type: page
---
A competitive, gamified achievements page with terminal aesthetics.

DESIGN SYSTEM (MANDATORY — ZERO DEVIATION):
- Background: Deep Slate (#0F172A) — ALL page backgrounds, NO exceptions
- Surface: Dark Slate (#1E293B) — ALL cards, modals, dropdowns
- Primary: Ocean Blue (#0077B6) — ALL CTAs, links, active indicators
- Primary Hover: Deep Ocean (#005F8A) — ALL button hover states
- Text: Near White (#F8FAFC) — ALL headings and body text
- Text Muted: Slate Gray (#94A3B8) — ALL captions, labels, timestamps
- Destructive: Signal Red (#EF4444) — ALL errors, delete actions
- Border: Subtle Slate (#334155) — ALL dividers, input borders

Typography: "Inter" ONLY — H1: text-2xl font-bold, H2: text-xl font-semibold, Body: text-sm, Caption: text-xs
Geometry: Cards rounded-lg (8px), Buttons rounded-md (6px), Inputs rounded-md (6px)
Spacing: 16px base (gap-4). Page padding px-4 py-6.
Shadows: Cards shadow-sm ONLY, Modals shadow-lg ONLY

MUST NOT: Use any blue other than #0077B6/#005F8A. Use rounded-xl on cards. Use gap-6 or larger. Invent undeclared colors.

**Page Structure:**
1. Header with title "Achievements" and navigation
2. Badge grid showing locked/unlocked states with icons
3. Progress section with milestone bars
4. Footer with links to other pages
```

## Validation Rules

Before completing an iteration, validate your baton:

- [ ] `page` frontmatter field exists and is a valid filename
- [ ] `type` frontmatter field is either `layout` or `page`
- [ ] Prompt includes the DESIGN SYSTEM BLOCK section copied verbatim from `.stitch/DESIGN.md` (contains MUST NOT constraints and exact hex codes)
- [ ] DESIGN SYSTEM BLOCK section copied verbatim from DESIGN.md — not paraphrased or reassembled
- [ ] Prompt describes a page NOT already in the sitemap
- [ ] Prompt includes specific page structure details

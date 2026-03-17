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
2. **DESIGN SYSTEM block** (required) — tokens with hex codes, copied from design source
3. **Page Structure** — numbered list of sections/components

## Example

```markdown
---
page: achievements
type: page
---
A competitive, gamified achievements page with terminal aesthetics.

**DESIGN SYSTEM (REQUIRED):**
- Platform: Web, Desktop-first
- Theme: Dark, minimal, data-focused
- Background: Deep charcoal/near-black (#0f1419)
- Primary Accent: Teal/Cyan (#2dd4bf)
- Text Primary: White (#ffffff)
- Font: Clean sans-serif (Inter, SF Pro, or system default)
- Layout: Centered content, max-width container

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
- [ ] Prompt includes the DESIGN SYSTEM block with hex codes
- [ ] Prompt describes a page NOT already in the sitemap
- [ ] Prompt includes specific page structure details

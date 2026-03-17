---
name: prompt-engine
description: Shared prompt enhancement pipeline for ac-designer commands. Contains Stitch MCP tool reference, 8-step prompt enhancement pipeline, asset download procedure, consistency check, design token extraction, and Stitch Web Bridge.
user-invocable: false
model: sonnet
---

# Prompt Engine — Shared Design Knowledge

## Stitch MCP Tools

These are the complete tools available via the official Google Stitch MCP at `stitch.googleapis.com/mcp`. No image upload exists — all generation is text-only.

| Tool | Key Params | Notes |
|------|-----------|-------|
| `create_project` | title? | Creates project container |
| `get_project` | name: `projects/{id}` | Returns designTheme, screens |
| `list_projects` | filter? | `view=owned` or `view=shared` |
| `list_screens` | projectId | Lists all screens in project |
| `get_screen` | name: `projects/{id}/screens/{id}` | Returns HTML + screenshot URLs |
| `generate_screen_from_text` | projectId, prompt, deviceType?, modelId? | Text to new screen (2-10 min) |
| `edit_screens` | projectId, selectedScreenIds[], prompt | Edit existing screens in place |
| `generate_variants` | projectId, selectedScreenIds[], prompt, variantOptions | Generate alternatives for A/B exploration |

### Enums

```
deviceType:    MOBILE | DESKTOP | TABLET | AGNOSTIC
modelId:       GEMINI_3_PRO | GEMINI_3_FLASH
creativeRange: REFINE | EXPLORE | REIMAGINE
aspects:       LAYOUT | COLOR_SCHEME | IMAGES | TEXT_FONT | TEXT_CONTENT
```

### Model Strategy

| Context | Model | Rationale |
|---------|-------|-----------|
| Layout generation | GEMINI_3_PRO | Structural decisions need deeper reasoning |
| Critical pages (hero, landing) | GEMINI_3_PRO | Quality over speed |
| Regular pages | GEMINI_3_FLASH | Fast — layout already established |
| Variants | GEMINI_3_FLASH | Speed for multiple generations |
| Edits | GEMINI_3_FLASH | Targeted changes, less reasoning needed |

## Prompt Enhancement Pipeline

Run this pipeline before EVERY `generate_screen_from_text` or `edit_screens` call. Do NOT skip steps. Step 2b only applies when a codebase exists at project root. Step 7 only applies when a layout exists.

### Step 1: Assess Input

Evaluate what the user's prompt is missing:

| Element | Check For | If Missing |
|---------|-----------|------------|
| **Platform** | "web", "mobile", "desktop" | Add based on project context or ask |
| **Page type** | "landing page", "dashboard", "form" | Infer from description |
| **Structure** | Numbered sections/components | Create logical page structure |
| **Visual style** | Adjectives, mood, vibe | Add appropriate atmosphere descriptors |
| **Colors** | Specific hex values or roles | Pull from DESIGN.md or suggest |
| **Components** | UI-specific terminology | Translate vague terms to professional keywords |

### Step 2: Load Design Context

- Check for `.stitch/DESIGN.md` — if it exists, extract the full design system block (colors, typography, component styles)
- If DESIGN.md does not exist, suggest running design foundation first to establish the design system

### Step 2b: Codebase Context Injection

**Skip this step** if no source code exists at the project root (no `pubspec.yaml`, `package.json`, `composer.json`, or similar project config).

When a codebase exists:

1. Detect project type from root config (`pubspec.yaml` → Flutter, `package.json` → JS/TS, `composer.json` → PHP, `go.mod` → Go)
2. Spawn ac:explore with: `"CONTEXT: Designing {page-name} for {project-type}. GOAL: Extract UI-relevant code context. REQUEST: Routes, Models (field: type), Widgets/Components, Theme tokens. Max 30 lines, no raw source dumps."`
3. Transform explore output into a structured `CODEBASE CONTEXT:` block matching the template in Step 6
4. The CODEBASE CONTEXT block is injected at Step 6 (between DESIGN SYSTEM and DESIGN PRINCIPLES)

For greenfield projects (no source code), silently skip this step — CODEBASE CONTEXT block is omitted.

### Step 3: Refine Terminology

- Consult `references/design-mappings.md` to translate vague terms into professional UI/UX language
- Consult `references/prompt-keywords.md` for component keywords and adjective palettes
- Replace generic terms: "menu at the top" becomes "sticky navigation bar with logo and list items"
- Amplify the vibe: "modern" becomes "clean, minimal, with generous whitespace and high-contrast typography"

### Step 4: Inject Design Principles

- Load `references/refactoring-ui-injection.md`
- Find the **Design Principles Injection** section at the bottom of that file
- Copy the `DESIGN PRINCIPLES:` block **verbatim** into the prompt — do not paraphrase or shorten it

### Step 5: Apply Gemini Optimization

Follow rules from `references/gemini-prompt-rules.md`:

- State constraints as **MUST / MUST NOT** imperatives
- Include **hex codes** for every color reference — never a color name without `#hex`
- Use **specific sensory adjectives**, not generic labels
- Specify **component shapes** explicitly (pill-shaped, softly rounded 12px, sharp)
- **Reinforce critical constraints** at both START and END of the prompt
- Add **STYLE CUES** section for gradients, shadows, effects, motion
- Follow section ordering: Vibe → Design System → Design Principles → Page Structure → Style Cues → Must Not → Reminder

### Step 6: Format Output

Assemble the final prompt in this exact section order:

```
[One-line vibe description with specific atmosphere adjectives]

DESIGN SYSTEM (REQUIRED):
- Platform: [Web/Mobile], [Desktop/Mobile]-first
- Theme: [Light/Dark], [style descriptors]
- Background/Primary Accent/Text Primary: [Color Name] (#hex) for [role]
- Font: [family] — headings [weight], body [weight]
- Spacing: [base unit]px scale · Radius: [component] [value]px

CODEBASE CONTEXT (skip if greenfield):
- Framework · This Page · Data Model · Navigation · Existing Components · Active Tab

DESIGN PRINCIPLES:
[Injected verbatim from references/refactoring-ui-injection.md]

PAGE STRUCTURE:
1-N. [Section] — [layout], [components with shape/size specs]

STYLE CUES:
- [Gradients, shadows, effects, motion, hover, transitions]

MUST NOT:
- [Anti-patterns — typically 2-4 items]

CRITICAL REMINDER: [Reinforce the single most important visual constraint]
```

### Step 7: Layout Reference Injection

**Skip this step** if no layout exists in `metadata.json` or the generation strategy is "full".

When generating a page that references an existing layout:

1. Load the layout's HTML from `.stitch/designs/layouts/{layout-name}.html`
2. Extract the layout shell elements: header, navigation, tab bar, FAB, sidebar, footer
3. Append this block to the prompt (after CRITICAL REMINDER, before sending to Stitch):

```
LAYOUT REFERENCE: This page uses the [{layout-name}] layout shell.
Keep these elements PIXEL-IDENTICAL to the reference:
- Header: [structure, height, elements from layout HTML]
- Tab Bar / Navigation / FAB: [items, style, position from layout HTML]
ACTIVE TAB: "{tab-name}" — move active indicator to this tab.
CONTENT CHANGES ONLY: [Enhanced prompt describes only the main content area]
```

## Asset Download Procedure

Run this procedure after EVERY `generate_screen_from_text` or `edit_screens` call. Do NOT present results to the user or proceed to the next step until all assets are saved locally.

1. `list_screens` → identify new/updated screen IDs
2. `get_screen` for each → retrieve `htmlCode.downloadUrl` and `screenshot.downloadUrl`
3. HTML: `WebFetch` on downloadUrl → `Write` to `.stitch/designs/{type}/{name}.html` (`{type}` = `layouts`|`pages`)
4. Screenshot: `Bash(curl -sL "{screenshot.downloadUrl}=w{width}" -o .stitch/designs/{type}/{name}.png)` — append `=w{width}` for full resolution
5. Update `metadata.json` screens map
6. Verify: `Bash(ls -la .stitch/designs/{type}/{name}.{html,png})`

**For variants**: download ALL generated variants with numbered suffixes (`settings-variant-a.png`, `settings-variant-b.png`). After user selects one, rename the selected variant to the final name (`settings.png`) and delete rejected variants.

**BLOCKING**: Do NOT show screenshots to user via `Read` until the files are saved locally. Do NOT proceed to the next step until step 6 confirms both files exist.

## Consistency Check

Run after **Asset Download Procedure** if Step 2b produced a CODEBASE CONTEXT block. **Skip** for greenfield projects.

1. Read the generated HTML from `.stitch/designs/{type}/{name}.html`
2. Compare against the CODEBASE CONTEXT block:

| Check | Applies To | Pass Condition |
|-------|-----------|----------------|
| Model fields present | Form/detail pages | All fields from Data Model appear in the design |
| Navigation targets correct | Pages with actions/links | Action destinations match route structure |
| Active tab correct | Tab-based layouts | Active tab indicator matches this page's route position |
| No phantom fields | All pages | No fields in the design that don't exist in the data model |
| States represented | Interactive pages | Error, loading, and empty states are accounted for |

3. Report mismatches as **warnings** to the user — do NOT auto-fix or block the workflow
4. The user decides whether to address mismatches via `edit_screens` or accept the design as-is

## Design Token Extraction

Extract design tokens from downloaded screen HTML to build or update DESIGN.md without external tools.

1. Download the screen's HTML via `get_screen` → `WebFetch` on `htmlCode.downloadUrl`
2. Parse the HTML for design tokens:

| Token Type | Where to Look | Extract |
|-----------|--------------|---------|
| Colors | `style` attributes, Tailwind `bg-`, `text-`, `border-` classes, CSS custom properties | All hex values (#xxx, #xxxxxx) with their functional role |
| Typography | `font-family`, `font-size`, `font-weight`, Tailwind `text-`, `font-` classes | Family, size scale, weight hierarchy |
| Spacing | `margin`, `padding`, `gap`, Tailwind `m-`, `p-`, `gap-` classes | Base unit and scale pattern |
| Border Radius | `border-radius`, Tailwind `rounded-` classes | Component-specific radius values |
| Shadows | `box-shadow`, Tailwind `shadow-` classes | Elevation hierarchy |
| Layout | `display`, `grid-template`, `flex`, Tailwind `flex`, `grid` classes | Grid/flex patterns, content width |

3. Translate technical values into semantic DESIGN.md language:
   - CSS `rounded-2xl` → "Generously rounded corners"
   - `box-shadow: 0 1px 3px rgba(0,0,0,0.08)` → "Whisper-soft diffused shadows"
   - `#0F172A` → "Deep Ocean Blue (#0F172A) for primary backgrounds"
   - Never use vague words like "modern", "nice", "clean" — use specific sensory adjectives
   - Never name colors by appearance alone — name by purpose (primary, secondary, destructive, surface)
   - Always include hex codes — color names without #hex are ambiguous

4. Output the extracted tokens in DESIGN.md format (5 sections):
   - Visual Theme & Atmosphere
   - Color Palette & Roles
   - Typography Rules
   - Component Stylings
   - Layout Principles

## Stitch Web Bridge

Bridges the gap between Stitch's text-only API and its image-capable web UI. The Stitch API has NO image upload — only the web UI supports image-to-UI via Gemini 2.5 Pro multimodal.

**When to invoke**: The user provides a screenshot, sketch, or visual reference that should influence the generated design.

### Procedure

1. Run the full **Prompt Enhancement Pipeline** to generate the optimized prompt
2. Save the prompt to `/tmp/stitch-prompt-{page}.md` (complete enhanced prompt with all blocks)
3. Present two options:
   - **Option A — Manual Stitch Bridge** (best quality): User opens `https://stitch.withgoogle.com` → project → "New screen" → uploads reference image + pastes prompt from `/tmp/stitch-prompt-{page}.md` → generates → tells you when done
   - **Option B — Auto mode** (faster, text-only): Generate via `generate_screen_from_text` without visual reference
4. **Option A path**: Wait for user confirmation → `list_screens` → `get_screen` → **Asset Download Procedure**
5. **Option B path**: `generate_screen_from_text` → **Asset Download Procedure**

**BLOCKING**: Do NOT proceed past this step until assets are downloaded locally via either path.

## References

Load these files from `references/` as needed during the enhancement pipeline:

| File | When to Load | Used In |
|------|-------------|---------|
| `references/design-mappings.md` | Translating vague terms to professional UI/UX language | Pipeline Step 3 |
| `references/prompt-keywords.md` | Adding component keywords and adjective palettes | Pipeline Step 3 |
| `references/refactoring-ui-injection.md` | Injecting design principles block into prompts | Pipeline Step 4 |
| `references/gemini-prompt-rules.md` | Formatting prompts for Gemini optimization | Pipeline Step 5 |
| `references/baton-schema.md` | Creating and validating baton files for multi-page iteration | Multi-page workflows |

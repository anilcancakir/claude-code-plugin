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

Run this pipeline before EVERY `generate_screen_from_text` or `edit_screens` call. Do NOT skip steps.

Load `references/prompt-pipeline.md` for the full pipeline steps.

## Asset Download Procedure

Run after EVERY generation or edit call. Do NOT present results until assets are saved locally.

Load `references/asset-procedures.md` for the full procedure.

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

## Drift Detection

Compare generated HTML tokens against DESIGN.md Token Reference to detect color, typography, geometry, spacing, and shadow drift.

Load `references/drift-detection.md` for the full procedure.

## Design Token Extraction

Extract design tokens from downloaded screen HTML to build or update DESIGN.md.

Load `references/design-tokens-v2.md` for extraction rules and output format.

## Stitch Web Bridge

Bridges Stitch's text-only API with its image-capable web UI for visual reference workflows.

Load `references/asset-procedures.md` for the Web Bridge procedure.

## References

Load these files from `references/` as needed during the enhancement pipeline:

| File | When to Load | Used In |
|------|-------------|---------|
| `references/design-mappings.md` | Translating vague terms to professional UI/UX language | Pipeline Step 3 |
| `references/prompt-keywords.md` | Adding component keywords and adjective palettes | Pipeline Step 3 |
| `references/refactoring-ui-injection.md` | Injecting design principles block into prompts | Pipeline Step 4 |
| `references/gemini-prompt-rules.md` | Formatting prompts for Gemini optimization | Pipeline Step 5 |
| `references/baton-schema.md` | Creating and validating baton files for multi-page iteration | Multi-page workflows |
| `references/prompt-pipeline.md` | Full Prompt Enhancement Pipeline Steps 1-7 | Pipeline execution |
| `references/asset-procedures.md` | Asset Download Procedure + Stitch Web Bridge | After generation |
| `references/drift-detection.md` | Comparing generated HTML tokens against DESIGN.md Token Reference | Drift Detection |
| `references/design-tokens-v2.md` | DESIGN.md v2 format spec + extraction rules | Token extraction, Design Token Extraction |
